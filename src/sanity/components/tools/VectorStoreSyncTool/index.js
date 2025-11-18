'use client'

import React, {useState} from 'react'
import {Button, Card, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'

import {apiVersion} from '../../../env'

const normalizeId = (id) => {
  if (!id) return ''
  return id.startsWith('drafts.') ? id.slice(7) : id
}

// Fetch archive entries - we filter in JavaScript since GROQ's defined() in WHERE clauses
// can be unreliable with nested references. We only fetch minimal fields needed for filtering.
// Note: For very large datasets (1000+), consider adding pagination
const fetchArchiveEntriesQuery = '*[_type == "archiveEntry"]{_id, aiDescription, "posterAssetRef": poster.asset._ref, "posterAssetId": poster.asset._id}'

export function VectorStoreSyncTool() {
  const client = useClient({apiVersion})
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

  const handleRun = async () => {
    setIsRunning(true)
    setMessage('Fetching current vector store contents…')
    setDetails('')

    try {
      const vectorResponse = await fetch('/api/vector-store/get-all-images')
      if (!vectorResponse.ok) {
        let errorPayload = {}
        try {
          errorPayload = await vectorResponse.json()
        } catch (parseError) {
          // ignore parsing errors
        }
        throw new Error(errorPayload.error || `Failed to load vector store entries (${vectorResponse.status})`)
      }

      const vectorData = await vectorResponse.json()
      const existingIds = Array.isArray(vectorData.imageIds) ? vectorData.imageIds : []
      const existingIdSet = new Set(existingIds)
      const existingCanonicalSet = new Set(existingIds.map((id) => normalizeId(id)).filter(Boolean))
      setMessage('Fetching archive entries from Sanity…')

      // Fetch archive entries - we only fetch minimal fields to reduce payload size
      // For large datasets, this is more efficient than fetching full documents
      const allDocuments = await client.fetch(fetchArchiveEntriesQuery)
      const totalCount = allDocuments.length
      
      // Filter in JavaScript for entries that have both aiDescription and poster.asset
      // This is more reliable than GROQ filters with nested references
      const documents = allDocuments
        .filter(doc => {
          // Check if aiDescription exists and is not empty
          const hasAiDescription = doc.aiDescription && 
            typeof doc.aiDescription === 'string' && 
            doc.aiDescription.trim() !== ''
          
          // Check if poster.asset exists (using the pre-extracted ref/id fields)
          const hasPosterAsset = !!(doc.posterAssetRef || doc.posterAssetId)
          
          return hasAiDescription && hasPosterAsset
        })
        .map(doc => ({
          _id: doc._id,
          aiDescription: doc.aiDescription
        }))
      
      const filteredCount = documents.length

      if (!documents.length) {
        setMessage('No archive entries with AI descriptions found to index.')
        return
      }

      const entryMap = new Map()
      const skippedNoDescription = new Set()

      documents.forEach((doc) => {
        const canonicalId = normalizeId(doc._id)
        const description = typeof doc.aiDescription === 'string' ? doc.aiDescription.trim() : ''

        if (!description) {
          skippedNoDescription.add(canonicalId || doc._id)
          return
        }

        if (!entryMap.has(canonicalId)) {
          entryMap.set(canonicalId, {
            id: canonicalId,
            description,
          })
        }
      })

      const candidates = Array.from(entryMap.values())

      const toIndex = candidates.filter(({id}) => {
        if (!id) return false
        return (
          !existingIdSet.has(id) &&
          !existingIdSet.has(`drafts.${id}`) &&
          !existingCanonicalSet.has(id)
        )
      })

      if (!toIndex.length) {
        setMessage('Vector store already up to date ✅')
        if (skippedNoDescription.size) {
          setDetails(
            `Skipped ${skippedNoDescription.size} entries with missing AI descriptions: ${Array.from(
              skippedNoDescription
            ).join(', ')}`
          )
        }
        return
      }

      let successCount = 0
      const successIds = []
      const failures = []

      // Process entries with progress feedback
      const totalToIndex = toIndex.length
      for (let i = 0; i < toIndex.length; i++) {
        const entry = toIndex[i]
        setMessage(`Indexing ${i + 1} of ${totalToIndex}: ${entry.id}…`)

        try {
          const response = await fetch('/api/vector-store/add-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: entry.id,
              description: entry.description,
            }),
          })

          if (!response.ok) {
            let errorPayload = {}
            try {
              errorPayload = await response.json()
            } catch (parseError) {
              // ignore parsing errors
            }
            throw new Error(errorPayload.error || errorPayload.message || `Failed with status ${response.status}`)
          }

          successCount += 1
          successIds.push(entry.id)
        } catch (error) {
          console.error('Vector store indexing error:', error)
          failures.push({id: entry.id, error: error.message})
        }
      }

      if (failures.length === 0) {
        setMessage(`Successfully indexed ${successCount} image(s) 🎉`)
        const infoParts = []
        if (successIds.length) {
          infoParts.push(`Indexed: ${successIds.join(', ')}`)
        }
        if (skippedNoDescription.size) {
          infoParts.push(
            `Skipped ${skippedNoDescription.size} without descriptions: ${Array.from(skippedNoDescription).join(
              ', '
            )}`
          )
        }
        setDetails(infoParts.join(' | '))
      } else {
        setMessage(`Indexed ${successCount} image(s) with ${failures.length} error(s) ⚠️`)
        const failureSummary = failures
          .map(({id, error}) => `${id}: ${error}`)
          .join(' | ')
        const infoParts = []
        if (successIds.length) {
          infoParts.push(`Success: ${successIds.join(', ')}`)
        }
        infoParts.push(`Failures: ${failureSummary}`)
        if (skippedNoDescription.size) {
          infoParts.push(
            `Skipped ${skippedNoDescription.size} without descriptions: ${Array.from(skippedNoDescription).join(
              ', '
            )}`
          )
        }
        setDetails(infoParts.join(' | '))
      }
    } catch (error) {
      console.error('Vector store sync error:', error)
      setMessage('Failed to synchronize vector store ❌')
      setDetails(error.message)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card padding={4} tone="transparent">
      <Stack space={4}>
        <Stack space={3}>
          <Text size={2} weight="semibold">
            Add Missing Images to Vector Store
          </Text>
          <Text size={1} muted>
            Checks every archive entry with an AI description and indexes any that are missing from the
            external vector store.
          </Text>
        </Stack>
        <Button
          text={isRunning ? 'Running…' : 'Send Images to Vector Store'}
          onClick={handleRun}
          tone="primary"
          disabled={isRunning}
          loading={isRunning}
        />
        {message && (
          <Card padding={3} radius={2} shadow={1} tone="transparent">
            <Stack space={2}>
              <Text weight="medium">{message}</Text>
              {details && (
                <Text size={1} muted>
                  {details}
                </Text>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
}
