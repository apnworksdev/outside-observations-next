'use client'

import React, {useState} from 'react'
import {Button, Card, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'

import {apiVersion} from '../../../env'
import {removeFromVectorStore} from '../../../lib/vectorStore'

const normalizeId = (id) => {
  if (!id) return ''
  return id.startsWith('drafts.') ? id.slice(7) : id
}

// Fetch archive entries and visual essay images for validation
const fetchArchiveEntriesQuery = '*[_type == "archiveEntry"]{_id, aiDescription, "posterAssetRef": poster.asset._ref, "posterAssetId": poster.asset._id}'
const fetchVisualEssayImagesQuery = '*[_type == "visualEssayImage"]{_id, aiDescription, "imageAssetRef": image.asset._ref, "imageAssetId": image.asset._id}'

export function VectorStoreCleanupTool() {
  const client = useClient({apiVersion})
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

  const handleRun = async () => {
    setIsRunning(true)
    setMessage('Fetching vector store contents…')
    setDetails('')

    try {
      // Get all IDs from vector store
      const vectorResponse = await fetch('/api/vector-store/get-all-items')
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
      const rawIds = vectorData.imageIds || vectorData.itemIds || vectorData.items || vectorData.ids
      const vectorStoreIds = Array.isArray(rawIds) ? rawIds : []
      
      if (!vectorStoreIds.length) {
        setMessage('Vector store is empty. Nothing to clean up.')
        return
      }

      setMessage(`Found ${vectorStoreIds.length} entries in vector store. Checking against Sanity…`)

      const [archiveEntries, visualEssayImages] = await Promise.all([
        client.fetch(fetchArchiveEntriesQuery),
        client.fetch(fetchVisualEssayImagesQuery),
      ])

      const validIds = new Set()
      const validCanonicalIds = new Set()

      const addValid = (doc) => {
        const canonicalId = normalizeId(doc._id)
        if (canonicalId) {
          validIds.add(doc._id)
          validIds.add(`drafts.${canonicalId}`)
          validCanonicalIds.add(canonicalId)
        }
      }

      archiveEntries
        .filter((doc) => {
          const hasAiDescription = doc.aiDescription && typeof doc.aiDescription === 'string' && doc.aiDescription.trim() !== ''
          const hasPosterAsset = !!(doc.posterAssetRef || doc.posterAssetId)
          return hasAiDescription && hasPosterAsset
        })
        .forEach(addValid)

      visualEssayImages
        .filter((doc) => {
          const hasAiDescription = doc.aiDescription && typeof doc.aiDescription === 'string' && doc.aiDescription.trim() !== ''
          const hasImageAsset = !!(doc.imageAssetRef || doc.imageAssetId)
          return hasAiDescription && hasImageAsset
        })
        .forEach(addValid)

      // Find orphaned entries (in vector store but not in Sanity, or missing descriptions)
      const orphanedIds = vectorStoreIds.filter((id) => {
        const canonicalId = normalizeId(id)
        // Check if the ID (as-is), draft version, or canonical version exists in valid entries
        return (
          !validIds.has(id) &&
          !validIds.has(`drafts.${canonicalId}`) &&
          !validCanonicalIds.has(canonicalId)
        )
      })

      if (!orphanedIds.length) {
        setMessage('No orphaned entries found ✅')
        setDetails(`All ${vectorStoreIds.length} vector store entries have corresponding archive entries or visual essay images in Sanity with descriptions.`)
        return
      }

      setMessage(`Found ${orphanedIds.length} orphaned entries. Removing…`)

      // Remove orphaned entries
      let successCount = 0
      const successIds = []
      const failures = []

      for (let i = 0; i < orphanedIds.length; i++) {
        const orphanedId = orphanedIds[i]
        setMessage(`Removing ${i + 1} of ${orphanedIds.length}: ${orphanedId}…`)

        try {
          await removeFromVectorStore(orphanedId)
          successCount += 1
          successIds.push(orphanedId)
        } catch (error) {
          console.error('Vector store cleanup error:', error)
          failures.push({id: orphanedId, error: error.message})
        }
      }

      if (failures.length === 0) {
        setMessage(`Successfully removed ${successCount} orphaned entries 🎉`)
        setDetails(`Removed: ${successIds.join(', ')}`)
      } else {
        setMessage(`Removed ${successCount} orphaned entries with ${failures.length} error(s) ⚠️`)
        const failureSummary = failures
          .map(({id, error}) => `${id}: ${error}`)
          .join(' | ')
        const infoParts = []
        if (successIds.length) {
          infoParts.push(`Success: ${successIds.join(', ')}`)
        }
        infoParts.push(`Failures: ${failureSummary}`)
        setDetails(infoParts.join(' | '))
      }
    } catch (error) {
      console.error('Vector store cleanup error:', error)
      setMessage('Failed to cleanup vector store ❌')
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
            Cleanup Orphaned Entries
          </Text>
          <Text size={1} muted>
            Removes entries from the vector store that no longer exist in Sanity (archive entries or visual essay
            images) or no longer have AI descriptions. This helps maintain data integrity between Sanity and the
            vector store.
          </Text>
        </Stack>
        <Button
          text={isRunning ? 'Running…' : 'Cleanup Orphaned Entries'}
          onClick={handleRun}
          tone="caution"
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

