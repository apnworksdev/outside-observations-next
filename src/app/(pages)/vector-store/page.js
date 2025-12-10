/**
 * Vector Store Visualization Page
 * 
 * This page displays all items currently in the vector store.
 * Useful for debugging and verifying that items are being added correctly.
 * Allows deletion of selected items from the vector store.
 * 
 * NOTE: This page is only available on localhost for development.
 * It is blocked on deployed environments (main branch and production) via middleware.
 */
'use client'

import { useState, useEffect } from 'react'
import styles from '@app/_assets/vectorStore.module.css'

export default function VectorStorePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState(null)

  const fetchItems = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vector-store/get-all-items')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch items: ${response.status}`)
      }

      const data = await response.json()
      // Try multiple possible field names in case API response format changed
      const itemIds = data.itemIds || data.imageIds || data.items || data.ids || []
      setItems(Array.isArray(itemIds) ? itemIds : [])
      setLastRefresh(new Date().toLocaleTimeString())
      // Clear selections when refreshing
      setSelectedItems(new Set())
    } catch (err) {
      console.error('Error fetching vector store items:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleToggleSelect = (itemId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
    setDeleteStatus(null)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items))
    }
    setDeleteStatus(null)
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      setDeleteStatus({ type: 'error', message: 'Please select at least one item to delete' })
      return
    }

    setDeleting(true)
    setDeleteStatus(null)

    try {
      const deletePromises = Array.from(selectedItems).map(async (itemId) => {
        const response = await fetch(`/api/vector-store/delete-item/${encodeURIComponent(itemId)}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to delete ${itemId}: ${response.status}`)
        }

        return await response.json()
      })

      await Promise.all(deletePromises)
      
      setDeleteStatus({ 
        type: 'success', 
        message: `Successfully deleted ${selectedItems.size} item(s)` 
      })
      
      // Clear selections and refresh the list
      setSelectedItems(new Set())
      await fetchItems()
    } catch (err) {
      setDeleteStatus({ type: 'error', message: err.message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Vector Store Contents</h1>
        <p>Items currently indexed in the vector store for semantic search</p>
      </div>

      <div className={styles.controls}>
        <button 
          onClick={fetchItems} 
          disabled={loading}
          className={styles.refreshButton}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        {lastRefresh && (
          <span className={styles.lastRefresh}>
            Last updated: {lastRefresh}
          </span>
        )}
      </div>

      {loading && (
        <div className={styles.loading}>
          <p>Loading vector store contents...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchItems} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.results}>
          <div className={styles.stats}>
            <div className={styles.statsHeader}>
              <h2>Total Items: {items.length}</h2>
              {items.length > 0 && (
                <div className={styles.bulkActions}>
                  <button
                    onClick={handleSelectAll}
                    className={styles.selectAllButton}
                  >
                    {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                      className={styles.deleteButton}
                    >
                      {deleting ? 'Deleting...' : `Delete Selected (${selectedItems.size})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {deleteStatus && (
            <div className={deleteStatus.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {deleteStatus.message}
            </div>
          )}

          {items.length === 0 ? (
            <div className={styles.empty}>
              <p>No items found in the vector store.</p>
              <p>Upload archive entries in Sanity Studio to add them to the vector store automatically.</p>
            </div>
          ) : (
            <div className={styles.imageList}>
              {items.map((itemId, index) => {
                // Ensure we have a valid ID for the key
                const safeKey = itemId || `item-${index}`;
                return (
                  <div 
                    key={safeKey} 
                    className={`${styles.imageItem} ${selectedItems.has(itemId) ? styles.selected : ''}`}
                  >
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(itemId)}
                        onChange={() => handleToggleSelect(itemId)}
                        className={styles.checkbox}
                        disabled={!itemId}
                      />
                      <code>{itemId || '(No ID)'}</code>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

