'use client'

import React, {useState} from 'react'
import {Button, Card, Stack, Text} from '@sanity/ui'
import {UploadIcon} from '@sanity/icons'
import {useClient, PatchEvent, set} from 'sanity'
import {apiVersion} from '../../../env'
import {parseCSV, buildMetadata} from '../../../utils/csvImport'

export function VisualEssayImagesInput(props) {
  const {value = [], onChange, renderDefault} = props
  const client = useClient({apiVersion})
  const [file, setFile] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

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

    try {
      const text = await file.text()
      const {headers, rows} = parseCSV(text)

      if (rows.length === 0) {
        throw new Error('CSV file is empty or has no data rows')
      }

      let created = 0
      let errors = 0
      const errorDetails = []
      const newReferences = []

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        try {
          // Build metadata using shared utility
          const metadata = await buildMetadata(row, client)

          // Check if fileName or artName exists (required for slug)
          if (!metadata.fileName && !metadata.artName) {
            errorDetails.push(`Row ${rowNum}: Missing fileName and artName, skipping`)
            errors++
            continue
          }

          // Create visual essay image as draft (explicitly set draft ID)
          const draftDoc = {
            _type: 'visualEssayImage',
            _id: `drafts.${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            metadata,
          }
          const createdDoc = await client.create(draftDoc)

          newReferences.push({
            _type: 'reference',
            _ref: createdDoc._id,
            _key: `visualEssayImage-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
      if (created > 0 && errors === 0) {
        setMessage(`✅ Import successful! Created ${created} visual essay image${created !== 1 ? 's' : ''} as draft${created !== 1 ? 's' : ''}.`)
        setDetails('You can now upload images and publish them.')
      } else if (created > 0) {
        setMessage(`⚠️ Import completed with errors. Created ${created} image${created !== 1 ? 's' : ''}, ${errors} error${errors !== 1 ? 's' : ''}.`)
        setDetails(errorDetails.join('\n'))
      } else {
        setMessage(`❌ Import failed. ${errors} error${errors !== 1 ? 's' : ''}.`)
        setDetails(errorDetails.join('\n'))
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
