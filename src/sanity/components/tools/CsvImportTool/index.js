'use client'

import React, {useState} from 'react'
import {Button, Card, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'
import {apiVersion} from '../../../env'
import {slugify, parseCSV, buildMetadata, mapColumnToField} from '../../../utils/csvImport'

// Build document from CSV row (archive entry specific)
async function buildDocument(row, client) {
  // Use shared buildMetadata function
  const metadata = await buildMetadata(row, client)
  
  return {
    _type: 'archiveEntry',
    metadata,
  }
}

// Find existing entry by slug or artName
async function findExistingEntry(doc, client) {
  const artName = doc.metadata?.artName
  if (!artName) return null

  const slug = slugify(artName)
  if (!slug) return null

  // Fetch all matching entries (both published and drafts)
  const entries = await client.fetch(
    `*[_type == "archiveEntry" && metadata.slug.current == $slug]`,
    {slug}
  )

  if (!entries || entries.length === 0) return null

  // Prefer published version (ID doesn't start with "drafts.")
  const published = entries.find(entry => !entry._id.startsWith('drafts.'))
  if (published) return published

  // If no published version, return the first draft
  return entries[0]
}

export function CsvImportTool() {
  const client = useClient({apiVersion})
  const [file, setFile] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')
  const [results, setResults] = useState(null)

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

    try {
      // Read file content
      const text = await file.text()
      const {headers, rows} = parseCSV(text)

      if (rows.length === 0) {
        throw new Error('CSV file is empty or has no data rows')
      }

      // Show which columns were mapped
      const mappedColumns = headers.filter(h => mapColumnToField(h))
      const unmappedColumns = headers.filter(h => !mapColumnToField(h))

      let created = 0
      let updated = 0
      let skipped = 0
      let errors = 0
      const warnings = []
      const errorDetails = []

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2 // +2 because row 1 is header

        try {
          // Build document
          const doc = await buildDocument(row, client)

          // Check if artName exists (required for slug)
          if (!doc.metadata?.artName) {
            warnings.push(`Row ${rowNum}: Missing artName, skipping`)
            skipped++
            continue
          }

          // Find existing entry
          const existing = await findExistingEntry(doc, client)

          if (existing) {
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
          } else {
            // Create new entry (as draft)
            const newDoc = {
              ...doc,
              _id: `drafts.${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
      setDetails(
        `Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`
      )
      
      if (warnings.length > 0) {
        setDetails(prev => prev + `\n\nWarnings:\n${warnings.slice(0, 5).join('\n')}`)
      }
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
