'use client'

import React, {useState, useEffect} from 'react'
import {Button, Card, Checkbox, Flex, Stack, Text} from '@sanity/ui'
import {TrashIcon} from '@sanity/icons'
import {useClient} from 'sanity'
import {apiVersion} from '../../../env'

// Query to fetch archive entries with minimal fields (both draft and published)
// We'll deduplicate entries that have both versions, preferring published
const ARCHIVE_ENTRIES_QUERY = `*[_type == "archiveEntry"] | order(_createdAt desc) {
  _id,
  _type,
  "title": metadata.artName,
  "excelID": metadata.excelID,
  "slug": metadata.slug.current
}[0...1000]`

export function BulkDeleteTool() {
  const client = useClient({apiVersion})
  const [entries, setEntries] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

  // Fetch archive entries on mount
  useEffect(() => {
    loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEntries = async () => {
    setIsLoading(true)
    setMessage('Loading archive entries...')
    try {
      const fetchedEntries = await client.fetch(ARCHIVE_ENTRIES_QUERY)
      
      // Deduplicate: if entry has both draft and published, prefer published
      // Group by slug or excelID (prefer slug as it's more stable)
      const entryMap = new Map()
      
      fetchedEntries.forEach(entry => {
        // Compute isDraft in JavaScript (more reliable than GROQ match)
        const isDraft = entry._id.startsWith('drafts.')
        entry.isDraft = isDraft
        
        const key = entry.slug || entry.excelID || entry._id
        
        if (!entryMap.has(key)) {
          // First occurrence, add it
          entryMap.set(key, entry)
        } else {
          // Already have this entry, prefer published over draft
          const existing = entryMap.get(key)
          if (isDraft && !existing.isDraft) {
            // Keep existing (published), skip this draft
            return
          } else if (!isDraft && existing.isDraft) {
            // Replace draft with published
            entryMap.set(key, entry)
          } else {
            // Both same type, keep first (or could keep most recent)
            // For now, keep existing
            return
          }
        }
      })
      
      const uniqueEntries = Array.from(entryMap.values())
      
      setEntries(uniqueEntries || [])
      setMessage('')
      if (uniqueEntries.length === 0) {
        setMessage('No archive entries found')
      } else if (uniqueEntries.length < fetchedEntries.length) {
        setMessage(`Loaded ${uniqueEntries.length} entries (${fetchedEntries.length - uniqueEntries.length} duplicates merged)`)
      }
    } catch (error) {
      console.error('Failed to load archive entries:', error)
      setMessage('Failed to load archive entries ❌')
      setDetails(error.message || 'An unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entries.map(e => e._id)))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) {
      setMessage('Please select at least one entry to delete')
      return
    }

    // Confirm deletion
    // Note: Deleting an entry will delete both its draft and published versions if they exist
    const confirmMessage = `Are you sure you want to delete ${selectedIds.size} archive entr${selectedIds.size === 1 ? 'y' : 'ies'}? This will delete both draft and published versions if they exist. This action cannot be undone.`
    if (!window.confirm(confirmMessage)) {
      return
    }

    setIsDeleting(true)
    setMessage(`Deleting ${selectedIds.size} entr${selectedIds.size === 1 ? 'y' : 'ies'}...`)
    setDetails('')

    try {
      const idsToDelete = Array.from(selectedIds)
      let deleted = 0
      let errors = 0
      const errorDetails = []
      const failedIds = new Set()
      const deleteWarnings = []

      // Delete in batches to avoid overwhelming the API
      const BATCH_SIZE = 10
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE)
        
        // Create transaction for batch
        // For each selected entry, delete both draft and published versions
        const transaction = batch.reduce((tx, id) => {
          // Determine both draft and published IDs
          const isDraft = id.startsWith('drafts.')
          const draftId = isDraft ? id : `drafts.${id}`
          const publishedId = isDraft ? id.slice(7) : id
          
          // Always try to delete both versions (one might not exist, that's okay)
          // Delete draft version
          tx = tx.delete(draftId)
          // Delete published version (if different from draft)
          if (draftId !== publishedId) {
            tx = tx.delete(publishedId)
          }
          return tx
        }, client.transaction())

        try {
          await transaction.commit()
          deleted += batch.length
        } catch (error) {
          console.error(`Error deleting batch:`, error)
          
          // If transaction fails, try deleting documents individually
          // This handles cases where some documents don't exist
          for (const id of batch) {
            let documentDeleted = false
            try {
              const draftId = id.startsWith('drafts.') ? id : `drafts.${id}`
              const publishedId = id.startsWith('drafts.') ? id.slice(7) : id
              
              // Try to delete draft
              try {
                await client.delete(draftId)
                documentDeleted = true
              } catch (draftError) {
                // Document might not exist - this is okay, try published version
                if (draftError.message?.includes('not found') || draftError.message?.includes('does not exist')) {
                  // Draft doesn't exist, try published
                } else {
                  // Real error, re-throw
                  throw draftError
                }
              }
              
              // Try to delete published (if different from draft)
              if (draftId !== publishedId) {
                try {
                  await client.delete(publishedId)
                  documentDeleted = true
                } catch (pubError) {
                  // Published might not exist - this is okay
                  if (pubError.message?.includes('not found') || pubError.message?.includes('does not exist')) {
                    // Published doesn't exist, that's fine
                  } else {
                    // Real error, re-throw
                    throw pubError
                  }
                }
              }
              
              // Only count as deleted if we successfully deleted at least one version
              if (documentDeleted) {
                deleted++
              } else {
                // Neither draft nor published existed - not really an error, just skip
                deleteWarnings.push(`Entry ${id} does not exist, skipping`)
              }
            } catch (individualError) {
              // Track which IDs failed with real errors
              failedIds.add(id)
              errors++
              errorDetails.push(`Failed to delete ${id}: ${individualError.message}`)
            }
          }
        }
      }

      // Update UI
      const detailParts = []
      if (deleteWarnings.length > 0) {
        detailParts.push(`Warnings: ${deleteWarnings.slice(0, 5).join(', ')}${deleteWarnings.length > 5 ? `, and ${deleteWarnings.length - 5} more` : ''}`)
      }
      if (errorDetails.length > 0) {
        if (detailParts.length > 0) detailParts.push('')
        detailParts.push(`Errors: ${errorDetails.slice(0, 10).join('\n')}${errorDetails.length > 10 ? `\n... and ${errorDetails.length - 10} more` : ''}`)
      }
      
      if (errors === 0 && deleteWarnings.length === 0) {
        setMessage(`✅ Successfully deleted ${deleted} entr${deleted === 1 ? 'y' : 'ies'}`)
        setDetails('')
        // Remove deleted entries from list
        setEntries(prev => prev.filter(e => !selectedIds.has(e._id)))
        setSelectedIds(new Set())
      } else {
        setMessage(`⚠️ Deleted ${deleted} entr${deleted === 1 ? 'y' : 'ies'}${errors > 0 ? `, ${errors} error${errors === 1 ? '' : 's'}` : ''}${deleteWarnings.length > 0 ? `, ${deleteWarnings.length} warning${deleteWarnings.length === 1 ? '' : 's'}` : ''}`)
        setDetails(detailParts.join('\n'))
        // Remove successfully deleted entries from list (keep failed ones)
        setEntries(prev => prev.filter(e => failedIds.has(e._id)))
        setSelectedIds(new Set(Array.from(selectedIds).filter(id => failedIds.has(id))))
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      setMessage('Delete failed ❌')
      setDetails(error.message || 'An unknown error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        <Text size={2} weight="bold">
          Bulk Delete Archive Entries
        </Text>
        <Text size={1} muted>
          Select archive entries to delete. Deleting an entry will remove both its draft and published versions if they exist. This action cannot be undone.
        </Text>

        {/* Selection controls */}
        {entries.length > 0 && (
          <Flex align="center" gap={3}>
            <Checkbox
              checked={selectedIds.size === entries.length && entries.length > 0}
              indeterminate={selectedIds.size > 0 && selectedIds.size < entries.length}
              onChange={toggleSelectAll}
            />
            <Text size={1} weight="medium">
              {selectedIds.size > 0 
                ? `${selectedIds.size} of ${entries.length} selected`
                : `Select all (${entries.length} entries)`}
            </Text>
            {selectedIds.size > 0 && (
              <Button
                text={`Delete ${selectedIds.size} selected`}
                icon={TrashIcon}
                tone="critical"
                onClick={handleDelete}
                disabled={isDeleting}
                loading={isDeleting}
              />
            )}
          </Flex>
        )}

        {/* Loading state */}
        {isLoading && (
          <Card padding={3} tone="default">
            <Text size={1}>Loading entries...</Text>
          </Card>
        )}

        {/* Entries list */}
        {!isLoading && entries.length > 0 && (
          <Card padding={2} radius={2} style={{maxHeight: '600px', overflowY: 'auto'}}>
            <Stack space={2}>
              {entries.map((entry) => {
                const isSelected = selectedIds.has(entry._id)
                const displayTitle = entry.title || entry.excelID || entry.slug || entry._id
                const isDraft = entry.isDraft
                
                return (
                  <Flex key={entry._id} align="center" gap={2} padding={2} style={{
                    backgroundColor: isSelected ? 'var(--card-hover-color)' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSelect(entry._id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleSelect(entry._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Stack space={1} style={{flex: 1}}>
                      <Flex align="center" gap={2}>
                        <Text size={1} weight={isSelected ? 'semibold' : 'regular'}>
                          {displayTitle}
                        </Text>
                        {/* Draft/Published indicator */}
                        <Text 
                          size={0} 
                          style={{
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: isDraft ? 'var(--card-border-color)' : 'var(--brand-primary)',
                            color: isDraft ? 'var(--card-text-color)' : 'white',
                            fontWeight: 'medium',
                            textTransform: 'uppercase',
                            fontSize: '10px',
                            letterSpacing: '0.5px'
                          }}
                        >
                          {isDraft ? 'Draft' : 'Published'}
                        </Text>
                      </Flex>
                      {entry.excelID && (
                        <Text size={0} muted>
                          Excel ID: {entry.excelID}
                        </Text>
                      )}
                    </Stack>
                  </Flex>
                )
              })}
            </Stack>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && entries.length === 0 && (
          <Card padding={3} tone="default">
            <Text size={1}>No archive entries found</Text>
          </Card>
        )}

        {/* Messages */}
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
      </Stack>
    </Card>
  )
}
