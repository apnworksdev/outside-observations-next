'use client'

import React, {useState} from 'react'
import {Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {UploadIcon} from '@sanity/icons'
import {useClient, PatchEvent, set} from 'sanity'
import {apiVersion} from '../../../env'
import {slugify, parseCSV, buildMetadata, extractExcelID, validateRow} from '../../../utils/csvImport'

// Constants
const BATCH_SIZE = 100 // Rows to process before memory cleanup
const PROGRESS_UPDATE_INTERVAL = 10 // Update progress every N rows
const DB_CHECK_BATCH_SIZE = 100 // Batch size for database excelID checks
const LARGE_FILE_THRESHOLD = 500 // Files with more rows trigger memory optimizations

// Sanitize excelID for safe use in queries
function sanitizeExcelID(excelID) {
  if (!excelID) return ''
  return String(excelID).trim().replace(/[^a-zA-Z0-9\-_]/g, '')
}

export function VisualEssayImagesInput(props) {
  const {value = [], onChange, renderDefault} = props
  const client = useClient({apiVersion})
  const [file, setFile] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0, startTime: null })

  // Find existing visual essay image by excelID
  const findExistingByExcelID = async (excelID, client) => {
    if (!excelID || excelID.trim() === '') return null

    // Sanitize excelID before query
    const sanitizedID = sanitizeExcelID(excelID)
    if (!sanitizedID) return null

    // Prefer published version first (ID doesn't start with "drafts.")
    const published = await client.fetch(
      `*[_type == "visualEssayImage" && metadata.excelID == $excelID && !(_id match "drafts.*")][0]`,
      {excelID: sanitizedID}
    )

    if (published) return published

    // If no published version, check drafts
    const draft = await client.fetch(
      `*[_type == "visualEssayImage" && metadata.excelID == $excelID && _id match "drafts.*"][0]`,
      {excelID: sanitizedID}
    )

    return draft || null
  }

  // Find existing visual essay image by slug (from fileName or artName)
  const findExistingVisualEssayImage = async (metadata, client) => {
    const fileName = metadata?.fileName
    const artName = metadata?.artName
    
    // Try fileName first, then artName
    const identifier = fileName || artName
    if (!identifier) return null

    const slug = slugify(identifier)
    if (!slug) return null

    // Prefer published version first (ID doesn't start with "drafts.")
    const published = await client.fetch(
      `*[_type == "visualEssayImage" && metadata.slug.current == $slug && !(_id match "drafts.*")][0]`,
      {slug}
    )

    if (published) return published

    // If no published version, check drafts
    const draft = await client.fetch(
      `*[_type == "visualEssayImage" && metadata.slug.current == $slug && _id match "drafts.*"][0]`,
      {slug}
    )

    return draft || null
  }

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setMessage('Please select a CSV file')
        setDetails('')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setMessage('')
      setDetails('')
    }
  }

  const handleImport = async () => {
    if (!file) {
      setMessage('Please select a CSV file first')
      return
    }

    setIsRunning(true)
    setMessage('Importing...')
    setDetails('')
    const startTime = Date.now()
    setProgress({ current: 0, total: 0, startTime })

    try {
      // Check file size and warn if very large
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > 10) {
        setMessage('⚠️ Large file detected')
        setDetails(`File size: ${fileSizeMB.toFixed(2)} MB. Processing may take a while.`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      const text = await file.text()
      const {headers, rows, warnings: parseWarnings} = parseCSV(text)

      if (rows.length === 0) {
        throw new Error('CSV file is empty or has no data rows')
      }
      
      // Initialize warnings array early to collect all warnings
      const warnings = []
      
      // Add CSV parsing warnings if any
      if (parseWarnings && parseWarnings.length > 0) {
        warnings.push(...parseWarnings)
      }

      // Warn if very large number of rows
      if (rows.length > 1000) {
        setMessage('⚠️ Large CSV detected')
        setDetails(`Processing ${rows.length} rows. This may take several minutes.`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Initialize progress
      setProgress({ current: 0, total: rows.length, startTime })

      // Pre-validation: Check for duplicate excelIDs within CSV
      // For very large files, we'll do this in chunks to save memory
      const CHUNK_SIZE = 1000
      const excelIDMap = new Map()
      const duplicateExcelIDs = []
      const uniqueExcelIDs = new Set() // Track unique excelIDs from CSV
      
      // Process in chunks for memory efficiency
      for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, rows.length)
        for (let i = chunkStart; i < chunkEnd; i++) {
          const excelID = extractExcelID(rows[i])
          if (excelID && excelID.trim() !== '') {
            const trimmedID = excelID.trim()
            if (excelIDMap.has(trimmedID)) {
              duplicateExcelIDs.push({ excelID: trimmedID, rows: [excelIDMap.get(trimmedID), i + 2] })
            } else {
              excelIDMap.set(trimmedID, i + 2)
              uniqueExcelIDs.add(trimmedID)
            }
          }
        }
        // Allow GC to run periodically
        if (chunkStart > 0 && chunkStart % (CHUNK_SIZE * 5) === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      // Check for existing excelIDs in database (batch query for efficiency)
      const existingExcelIDsInDB = new Set()
      if (uniqueExcelIDs.size > 0) {
        try {
          const excelIDArray = Array.from(uniqueExcelIDs)
          // Query in batches if too many (Sanity query limit)
          // Use OR conditions instead of 'in' operator for nested fields
          for (let i = 0; i < excelIDArray.length; i += DB_CHECK_BATCH_SIZE) {
            const batch = excelIDArray.slice(i, i + DB_CHECK_BATCH_SIZE)
            // Sanitize excelIDs before query
            const sanitizedBatch = batch.map(id => sanitizeExcelID(id)).filter(id => id !== '')
            if (sanitizedBatch.length === 0) continue
            
            // Build OR conditions for each excelID in the batch
            // GROQ 'in' operator doesn't work well with nested fields, so we use OR
            // IDs are already sanitized (only alphanumeric, hyphens, underscores), so safe to interpolate
            const orConditions = sanitizedBatch.map(id => {
              // Escape any special characters (though sanitizeExcelID should have removed them)
              // Use GROQ string literal syntax
              return `metadata.excelID == "${id.replace(/"/g, '\\"')}"`
            }).join(' || ')
            // Use proper GROQ projection syntax for nested fields
            const query = `*[_type == "visualEssayImage" && (${orConditions})]{
              "excelID": metadata.excelID
            }`
            
            const existing = await client.fetch(query)
            existing.forEach(image => {
              if (image.excelID) {
                existingExcelIDsInDB.add(image.excelID)
              }
            })
          }
          
          // Note: We don't add warnings here for visual essay images since updates are expected behavior
          // But we track them for reference
        } catch (error) {
          // Non-critical - if check fails, continue anyway
          console.warn('Failed to check existing excelIDs in database:', error)
        }
      }

      let created = 0
      let updated = 0
      let skipped = 0
      let errors = 0
      const errorDetails = []
      const skippedDetails = []
      const updatedDetails = []
      const newReferences = []
      let idCounter = 0 // Counter to prevent ID collisions
      let keyCounter = 0 // Counter for reference keys
      let lastProgressUpdate = 0

      // Process each row
      // For very large files, process in batches to allow memory cleanup
      for (let i = 0; i < rows.length; i++) {
        // Throttle progress updates for better performance
        if (i === 0 || i === rows.length - 1 || (i - lastProgressUpdate) >= PROGRESS_UPDATE_INTERVAL) {
          setProgress({ current: i + 1, total: rows.length, startTime })
          lastProgressUpdate = i
        }
        
        const row = rows[i]
        const rowNum = i + 2
        
        // Periodic memory cleanup hint for large files
        if (rows.length > LARGE_FILE_THRESHOLD && i > 0 && i % BATCH_SIZE === 0) {
          // Allow browser to process other tasks and GC
          await new Promise(resolve => setTimeout(resolve, 0))
        }

        try {
          // Early validation
          const validation = validateRow(row, rowNum, [])
          if (!validation.isValid) {
            errorDetails.push(...validation.errors)
            errors += validation.errors.length
            skipped++
            continue
          }

          // Extract excelID from CSV
          const excelID = extractExcelID(row)

          // Skip if this excelID was already processed (duplicate in CSV)
          // Use find for O(n) lookup instead of O(n²) with some()
          if (excelID && excelID.trim() !== '') {
            const trimmedID = excelID.trim()
            const duplicateInfo = duplicateExcelIDs.find(d => d.excelID === trimmedID)
            if (duplicateInfo && duplicateInfo.rows[0] !== rowNum) {
              skippedDetails.push(`Row ${rowNum}: Duplicate excelID "${trimmedID}" (already processed in row ${duplicateInfo.rows[0]}), skipping`)
              skipped++
              continue
            }
          }

          // Build metadata using shared utility
          const metadata = await buildMetadata(row, client)
          
          // Add excelID to metadata if provided (buildMetadata may have already set it via column mapping)
          // Sanitize excelID before storing
          if (excelID && excelID.trim() !== '') {
            metadata.excelID = sanitizeExcelID(excelID)
          }

          // Validate we have at least one identifier (fileName or artName)
          if (!metadata.fileName && !metadata.artName) {
            errorDetails.push(`Row ${rowNum}: Missing fileName and artName (at least one required for slug generation), skipping`)
            errors++
            continue
          }

          // Validate slug can be generated
          const identifier = metadata.fileName || metadata.artName
          const slug = slugify(identifier)
          if (!slug || slug.length === 0) {
            errorDetails.push(`Row ${rowNum}: Cannot generate valid slug from "${identifier}", skipping`)
            errors++
            continue
          }

          let existing = null

          // First, try to find by excelID if provided
          if (excelID && excelID.trim() !== '') {
            existing = await findExistingByExcelID(excelID.trim(), client)
          }

          // If not found by excelID, fall back to slug-based matching
          if (!existing) {
            existing = await findExistingVisualEssayImage(metadata, client)
          }

          if (existing) {
            // Update existing entry if excelID was provided, otherwise skip
            if (excelID && excelID.trim() !== '') {
              // Update existing entry (as draft)
              const draftId = existing._id.startsWith('drafts.') 
                ? existing._id 
                : `drafts.${existing._id}`

              // Merge with existing data (preserve image)
              const updatedDoc = {
                ...existing,
                _id: draftId,
                // Merge metadata to preserve fields not in CSV
                metadata: {
                  ...(existing.metadata || {}),
                  ...metadata,
                  // Ensure excelID is set
                  excelID: excelID.trim(),
                  // Only replace tags if CSV provided them, otherwise keep existing
                  tags: metadata.tags !== undefined ? metadata.tags : (existing.metadata?.tags || []),
                },
                // Preserve image (not set from CSV)
                image: existing.image,
              }

              await client.createOrReplace(updatedDoc)
              updated++
              // Store just the excelID for compact display
              updatedDetails.push(excelID.trim())
            } else {
              // Skip if already exists but no excelID provided
              const identifier = metadata.fileName || metadata.artName
              skippedDetails.push(`Row ${rowNum}: Already exists (${identifier}), skipping`)
              skipped++
            }
            continue
          }

          // Create new visual essay image as draft (explicitly set draft ID)
          // Use counter + timestamp + random to ensure uniqueness
          const uniqueId = `drafts.${Date.now()}-${idCounter++}-${Math.random().toString(36).slice(2, 10)}`
          const draftDoc = {
            _type: 'visualEssayImage',
            _id: uniqueId,
            metadata,
          }
          const createdDoc = await client.create(draftDoc)

          newReferences.push({
            _type: 'reference',
            _ref: createdDoc._id,
            _key: `visualEssayImage-${Date.now()}-${keyCounter++}-${Math.random().toString(36).slice(2, 10)}`,
          })

          created++
        } catch (error) {
          errorDetails.push(`Row ${rowNum}: ${error.message}`)
          errors++
        }
      }

      // Add new references to the array
      if (newReferences.length > 0) {
        const currentValue = Array.isArray(value) ? value : []
        const updatedValue = [...currentValue, ...newReferences]
        onChange(PatchEvent.from(set(updatedValue)))
      }

      // Show results
      const parts = []
      if (created > 0) {
        parts.push(`Created: ${created}`)
      }
      if (updated > 0) {
        parts.push(`Updated: ${updated}`)
      }
      if (skipped > 0) {
        parts.push(`Skipped: ${skipped}`)
      }
      if (errors > 0) {
        parts.push(`Errors: ${errors}`)
      }

      const summary = parts.length > 0 ? parts.join(', ') : 'No changes'

      if ((created > 0 || updated > 0) && errors === 0) {
        setMessage(`✅ Import successful! ${summary}`)
        const detailParts = ['You can now upload images and publish them.']
        if (updated > 0 && updatedDetails.length > 0) {
          const MAX_DISPLAY = 20
          const displayed = updatedDetails.slice(0, MAX_DISPLAY)
          const remaining = updatedDetails.length - MAX_DISPLAY
          const excelIDsList = displayed.join(', ')
          const moreText = remaining > 0 ? `, and ${remaining} more` : ''
          detailParts.push(`\n\nUpdated ${updatedDetails.length} entr${updatedDetails.length === 1 ? 'y' : 'ies'}: ${excelIDsList}${moreText}`)
        }
        if (skipped > 0 && skippedDetails.length > 0) {
          if (detailParts.length > 1) detailParts.push('')
          detailParts.push(`Skipped (already exist, no excelID):\n${skippedDetails.slice(0, 5).join('\n')}${skippedDetails.length > 5 ? `\n... and ${skippedDetails.length - 5} more` : ''}`)
        }
        if (warnings.length > 0) {
          if (detailParts.length > 1) detailParts.push('')
          detailParts.push(`Warnings:\n${warnings.slice(0, 5).join('\n')}${warnings.length > 5 ? `\n... and ${warnings.length - 5} more` : ''}`)
        }
        setDetails(detailParts.join(''))
      } else if (created > 0 || updated > 0 || skipped > 0) {
        setMessage(`⚠️ Import completed. ${summary}`)
        const detailParts = []
        if (warnings.length > 0) {
          detailParts.push(`Warnings:\n${warnings.slice(0, 5).join('\n')}${warnings.length > 5 ? `\n... and ${warnings.length - 5} more` : ''}`)
        }
        if (updated > 0 && updatedDetails.length > 0) {
          const MAX_DISPLAY = 20
          const displayed = updatedDetails.slice(0, MAX_DISPLAY)
          const remaining = updatedDetails.length - MAX_DISPLAY
          const excelIDsList = displayed.join(', ')
          const moreText = remaining > 0 ? `, and ${remaining} more` : ''
          detailParts.push(`Updated ${updatedDetails.length} entr${updatedDetails.length === 1 ? 'y' : 'ies'}: ${excelIDsList}${moreText}`)
        }
        if (skipped > 0 && skippedDetails.length > 0) {
          if (detailParts.length > 0) detailParts.push('')
          detailParts.push(`Skipped:\n${skippedDetails.slice(0, 5).join('\n')}${skippedDetails.length > 5 ? `\n... and ${skippedDetails.length - 5} more` : ''}`)
        }
        if (errors > 0 && errorDetails.length > 0) {
          if (detailParts.length > 0) detailParts.push('')
          detailParts.push(`Errors:\n${errorDetails.slice(0, 5).join('\n')}${errorDetails.length > 5 ? `\n... and ${errorDetails.length - 5} more` : ''}`)
        }
        setDetails(detailParts.join('\n'))
      } else {
        setMessage(`❌ Import failed. ${summary}`)
        setDetails(errorDetails.length > 0 ? errorDetails.join('\n') : 'No images were created or updated.')
      }
    } catch (error) {
      setMessage(`Import failed ❌ ${error.message}`)
      setDetails('')
    } finally {
      setIsRunning(false)
      setFile(null)
    }
  }

  return (
    <Stack space={3}>
      <Card padding={3} tone="primary" radius={2} border>
        <Stack space={3}>
          <Text size={1} weight="semibold">
            Import Visual Essay Images from CSV
          </Text>
          <Text size={1} muted>
            Upload a CSV file with metadata for visual essay images. Images will need to be uploaded manually after import.
          </Text>
          <Stack space={2}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isRunning}
              style={{display: 'block'}}
            />
            <Button
              text="Import CSV"
              icon={UploadIcon}
              onClick={handleImport}
              disabled={!file || isRunning}
              tone="primary"
            />
            
            {/* Progress indicator */}
            {isRunning && progress.total > 0 && (
              <Card padding={3} tone="primary" radius={2}>
                <Stack space={2}>
                  <Flex align="center" justify="space-between">
                    <Text size={1} weight="medium">
                      Processing rows...
                    </Text>
                    <Text size={1} muted>
                      {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
                    </Text>
                  </Flex>
                  {/* Progress bar */}
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--card-border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                      height: '100%',
                      backgroundColor: 'var(--brand-primary)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  {progress.startTime && progress.current > 0 && (
                    <Text size={0} muted>
                      {(() => {
                        const elapsed = (Date.now() - progress.startTime) / 1000
                        const avgTimePerRow = elapsed / progress.current
                        const remaining = Math.ceil((progress.total - progress.current) * avgTimePerRow)
                        if (remaining > 60) {
                          return `Estimated time remaining: ${Math.floor(remaining / 60)}m ${remaining % 60}s`
                        }
                        return `Estimated time remaining: ${remaining}s`
                      })()}
                    </Text>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
          {message && (
            <Card padding={2} tone={message.includes('✅') ? 'positive' : message.includes('❌') ? 'critical' : 'caution'} radius={1}>
              <Text size={1} style={{whiteSpace: 'pre-wrap'}}>
                {message}
              </Text>
              {details && (
                <Text size={0} muted style={{marginTop: '0.5rem', whiteSpace: 'pre-wrap'}}>
                  {details}
                </Text>
              )}
            </Card>
          )}
        </Stack>
      </Card>
      
      {/* Default array input */}
      {renderDefault ? renderDefault(props) : null}
    </Stack>
  )
}
