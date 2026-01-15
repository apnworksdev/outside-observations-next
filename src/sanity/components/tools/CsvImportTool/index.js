'use client'

import React, {useState} from 'react'
import {Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'
import {apiVersion} from '../../../env'
import {slugify, parseCSV, buildMetadata, mapColumnToField, extractExcelID, validateRow} from '../../../utils/csvImport'

// Constants
const BATCH_SIZE = 100 // Rows to process before memory cleanup
const PROGRESS_UPDATE_INTERVAL = 10 // Update progress every N rows
const DB_CHECK_BATCH_SIZE = 100 // Batch size for database excelID checks
const MAX_DISPLAY_UPDATED = 20 // Max excelIDs to display in updated details
const LARGE_FILE_THRESHOLD = 500 // Files with more rows trigger memory optimizations

// Build document from CSV row (archive entry specific)
async function buildDocument(row, client) {
  // Use shared buildMetadata function
  const metadata = await buildMetadata(row, client)
  
  return {
    _type: 'archiveEntry',
    metadata,
  }
}

// Sanitize excelID for safe use in queries
function sanitizeExcelID(excelID) {
  if (!excelID) return ''
  return String(excelID).trim().replace(/[^a-zA-Z0-9\-_]/g, '')
}

// Find existing entry by excelID
async function findExistingByExcelID(excelID, client) {
  if (!excelID || excelID.trim() === '') return null

  // Sanitize excelID before query
  const sanitizedID = sanitizeExcelID(excelID)
  if (!sanitizedID) return null

  // Prefer published version first (ID doesn't start with "drafts.")
  const published = await client.fetch(
    `*[_type == "archiveEntry" && metadata.excelID == $excelID && !(_id match "drafts.*")][0]`,
    {excelID: sanitizedID}
  )

  if (published) return published

  // If no published version, check drafts
  const draft = await client.fetch(
    `*[_type == "archiveEntry" && metadata.excelID == $excelID && _id match "drafts.*"][0]`,
    {excelID: sanitizedID}
  )

  return draft || null
}

// Find existing entry by slug or artName
async function findExistingEntry(doc, client) {
  const artName = doc.metadata?.artName
  if (!artName) return null

  const slug = slugify(artName)
  if (!slug) return null

  // Prefer published version first (ID doesn't start with "drafts.")
  const published = await client.fetch(
    `*[_type == "archiveEntry" && metadata.slug.current == $slug && !(_id match "drafts.*")][0]`,
    {slug}
  )

  if (published) return published

  // If no published version, check drafts
  const draft = await client.fetch(
    `*[_type == "archiveEntry" && metadata.slug.current == $slug && _id match "drafts.*"][0]`,
    {slug}
  )

  return draft || null
}

export function CsvImportTool() {
  const client = useClient({apiVersion})
  const [file, setFile] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')
  const [results, setResults] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, startTime: null })

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
      setResults(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setMessage('Please select a CSV file first')
      return
    }

    setIsRunning(true)
    setMessage('Processing CSV...')
    setDetails('')
    setResults(null)
    const startTime = Date.now()
    setProgress({ current: 0, total: 0, startTime })

    try {
      // Check file size and warn if very large
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > 10) {
        setMessage('⚠️ Large file detected')
        setDetails(`File size: ${fileSizeMB.toFixed(2)} MB. Processing may take a while and use significant memory.`)
        // Small delay to show warning
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Read file content
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

      // Show which columns were mapped
      const mappedColumns = headers.filter(h => mapColumnToField(h))
      const unmappedColumns = headers.filter(h => !mapColumnToField(h))

      // Initialize progress
      setProgress({ current: 0, total: rows.length, startTime })

      // Pre-validation: Check for duplicate excelIDs within CSV
      // For very large files, we'll do this in chunks to save memory
      const CHUNK_SIZE = 1000
      const excelIDMap = new Map()
      const duplicateExcelIDs = []
      const uniqueExcelIDs = new Set() // Track unique excelIDs from CSV
      // Note: warnings array already initialized above
      
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
        // Clear processed chunk from memory hint (though JS GC will handle it)
        if (chunkStart > 0 && chunkStart % (CHUNK_SIZE * 5) === 0) {
          // Periodic check - allow GC to run
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
            // Sanitize excelIDs before query (remove any potentially dangerous characters)
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
            const query = `*[_type == "archiveEntry" && (${orConditions})]{
              "excelID": metadata.excelID
            }`
            
            const existing = await client.fetch(query)
            
            existing.forEach(entry => {
              if (entry.excelID) {
                existingExcelIDsInDB.add(entry.excelID)
              }
            })
          }
          
          // Note: We track existing excelIDs but don't add a warning since the results
          // will show what was updated anyway. This avoids redundant messaging.
        } catch (error) {
          // Non-critical - if check fails, continue anyway
          console.warn('Failed to check existing excelIDs in database:', error)
          warnings.push('Could not verify excelID uniqueness in database. Proceeding anyway.')
        }
      }

      // Add warnings for duplicate excelIDs within CSV
      if (duplicateExcelIDs.length > 0) {
        duplicateExcelIDs.forEach(({ excelID, rows }) => {
          warnings.push(`Duplicate excelID "${excelID}" found in rows ${rows.join(', ')}. Only the first occurrence will be processed.`)
        })
      }

      let created = 0
      let updated = 0
      let skipped = 0
      let errors = 0
      const errorDetails = []
      const updatedDetails = []
      const skippedDetails = []
      let idCounter = 0 // Counter to prevent ID collisions

      // Process each row
      // For very large files, process in batches to allow memory cleanup
      let lastProgressUpdate = 0
      
      for (let i = 0; i < rows.length; i++) {
        // Throttle progress updates for better performance
        if (i === 0 || i === rows.length - 1 || (i - lastProgressUpdate) >= PROGRESS_UPDATE_INTERVAL) {
          setProgress({ current: i + 1, total: rows.length, startTime })
          lastProgressUpdate = i
        }
        
        const row = rows[i]
        const rowNum = i + 2 // +2 because row 1 is header
        
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
          if (validation.warnings.length > 0) {
            warnings.push(...validation.warnings)
          }

          // Extract excelID from CSV
          const excelID = extractExcelID(row)

          // Skip if this excelID was already processed (duplicate in CSV)
          // Use Set for O(1) lookup instead of O(n) array search
          if (excelID && excelID.trim() !== '') {
            const trimmedID = excelID.trim()
            const duplicateInfo = duplicateExcelIDs.find(d => d.excelID === trimmedID)
            if (duplicateInfo && duplicateInfo.rows[0] !== rowNum) {
              skippedDetails.push(`Row ${rowNum}: Duplicate excelID "${trimmedID}" (already processed in row ${duplicateInfo.rows[0]}), skipping`)
              skipped++
              continue
            }
          }

          // Build document
          const doc = await buildDocument(row, client)
          
          // Add excelID to metadata if provided (buildMetadata may have already set it via column mapping)
          // Sanitize excelID before storing
          if (excelID && excelID.trim() !== '') {
            doc.metadata.excelID = sanitizeExcelID(excelID)
          }

          // Validate slug can be generated (artName is required)
          if (!doc.metadata?.artName) {
            errorDetails.push(`Row ${rowNum}: Missing artName (required for slug generation), skipping`)
            errors++
            skipped++
            continue
          }

          // Validate slug generation
          const slug = slugify(doc.metadata.artName)
          if (!slug || slug.length === 0) {
            errorDetails.push(`Row ${rowNum}: Cannot generate valid slug from artName "${doc.metadata.artName}", skipping`)
            errors++
            skipped++
            continue
          }

          let existing = null

          // First, try to find by excelID if provided
          if (excelID && excelID.trim() !== '') {
            existing = await findExistingByExcelID(excelID.trim(), client)
          }

          // If not found by excelID, fall back to slug-based matching
          if (!existing) {
            existing = await findExistingEntry(doc, client)
          }

          if (existing) {
            // Update existing entry if excelID was provided, otherwise skip
            if (excelID && excelID.trim() !== '') {
              // Update existing entry (as draft)
              const draftId = existing._id.startsWith('drafts.') 
                ? existing._id 
                : `drafts.${existing._id}`

              // Merge with existing data (preserve media files, aiDescription, aiMoodTags, etc.)
              const updatedDoc = {
                ...existing,
                ...doc,
                _id: draftId,
                // Merge metadata to preserve fields not in CSV
                metadata: {
                  ...(existing.metadata || {}),
                  ...doc.metadata,
                  // Ensure excelID is set
                  excelID: excelID.trim(),
                  // Only replace tags if CSV provided them, otherwise keep existing
                  tags: doc.metadata.tags !== undefined ? doc.metadata.tags : (existing.metadata?.tags || []),
                },
                // Preserve media-related fields (not set from CSV)
                mediaType: existing.mediaType,
                video: existing.video,
                poster: existing.poster,
                pdf: existing.pdf,
                textContent: existing.textContent,
                textMarkup: existing.textMarkup,
                visualEssayImages: existing.visualEssayImages,
                aiDescription: existing.aiDescription,
                aiMoodTags: existing.aiMoodTags,
                vectorStoreStatus: existing.vectorStoreStatus,
              }

              await client.createOrReplace(updatedDoc)
              updated++
              // Store just the excelID for compact display
              updatedDetails.push(excelID.trim())
            } else {
              // Skip if already exists but no excelID provided
              const identifier = doc.metadata.artName
              skippedDetails.push(`Row ${rowNum}: Already exists (${identifier}), skipping`)
              skipped++
            }
          } else {
            // Create new entry (as draft)
            // Use counter + timestamp + random to ensure uniqueness
            const uniqueId = `drafts.${Date.now()}-${idCounter++}-${Math.random().toString(36).slice(2, 10)}`
            const newDoc = {
              ...doc,
              _id: uniqueId,
            }

            await client.create(newDoc)
            created++
          }
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error)
          errors++
          errorDetails.push(`Row ${rowNum}: ${error.message}`)
        }
      }

      const result = {
        created,
        updated,
        skipped,
        errors,
        total: rows.length,
        mappedColumns,
        unmappedColumns: unmappedColumns.length > 0 ? unmappedColumns : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      }

      setResults(result)
      setMessage('Import completed! ✅')
      
      // Build details message
      const detailParts = [`Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`]
      
      if (updated > 0 && updatedDetails.length > 0) {
        const displayed = updatedDetails.slice(0, MAX_DISPLAY_UPDATED)
        const remaining = updatedDetails.length - MAX_DISPLAY_UPDATED
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
    } catch (error) {
      console.error('CSV import error:', error)
      setMessage('Import failed ❌')
      setDetails(error.message || 'An unknown error occurred')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        <Text size={2} weight="bold">
          CSV Import Tool
        </Text>
        <Text size={1} muted>
          Upload a CSV file to import archive entries. Entries will be created as drafts.
          Images, descriptions, and mood tags must be added manually in Studio.
        </Text>

        <Stack space={3}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isRunning}
            style={{display: 'block'}}
          />

          {file && (
            <Text size={1} muted>
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </Text>
          )}

          <Button
            text="Import CSV"
            tone="primary"
            onClick={handleImport}
            disabled={!file || isRunning}
            loading={isRunning}
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
          <Card padding={3} tone={message.includes('✅') ? 'positive' : message.includes('❌') ? 'critical' : 'default'}>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                {message}
              </Text>
              {details && (
                <Text size={1} style={{whiteSpace: 'pre-wrap'}}>
                  {details}
                </Text>
              )}
            </Stack>
          </Card>
        )}

        {results && results.errors > 0 && results.errorDetails && (
          <Card padding={3} tone="caution">
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Error Details:
              </Text>
              <Text size={0} style={{whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}>
                {results.errorDetails.slice(0, 10).join('\n')}
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
}
