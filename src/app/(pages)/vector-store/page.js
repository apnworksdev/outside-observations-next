/**
 * Vector Store Visualization Page
 * 
 * This page displays all images currently in the vector store.
 * Useful for debugging and verifying that images are being added correctly.
 * Allows deletion of selected images from the vector store.
 */
'use client'

import { useState, useEffect } from 'react'
import styles from '@app/_assets/vectorStore.module.css'

export default function VectorStorePage() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [selectedImages, setSelectedImages] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState(null)

  const fetchImages = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vector-store/get-all-images')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch images: ${response.status}`)
      }

      const data = await response.json()
      console.log(data)
      setImages(data.imageIds || [])
      setLastRefresh(new Date().toLocaleTimeString())
      // Clear selections when refreshing
      setSelectedImages(new Set())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  const handleToggleSelect = (imageId) => {
    const newSelected = new Set(selectedImages)
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId)
    } else {
      newSelected.add(imageId)
    }
    setSelectedImages(newSelected)
    setDeleteStatus(null)
  }

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set())
    } else {
      setSelectedImages(new Set(images))
    }
    setDeleteStatus(null)
  }

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) {
      setDeleteStatus({ type: 'error', message: 'Please select at least one image to delete' })
      return
    }

    setDeleting(true)
    setDeleteStatus(null)

    try {
      const deletePromises = Array.from(selectedImages).map(async (imageId) => {
        const response = await fetch(`/api/vector-store/delete-image/${encodeURIComponent(imageId)}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to delete ${imageId}: ${response.status}`)
        }

        return await response.json()
      })

      await Promise.all(deletePromises)
      
      setDeleteStatus({ 
        type: 'success', 
        message: `Successfully deleted ${selectedImages.size} image(s)` 
      })
      
      // Clear selections and refresh the list
      setSelectedImages(new Set())
      await fetchImages()
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
        <p>Images currently indexed in the vector store for semantic search</p>
      </div>

      <div className={styles.controls}>
        <button 
          onClick={fetchImages} 
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
          <button onClick={fetchImages} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.results}>
          <div className={styles.stats}>
            <div className={styles.statsHeader}>
              <h2>Total Images: {images.length}</h2>
              {images.length > 0 && (
                <div className={styles.bulkActions}>
                  <button
                    onClick={handleSelectAll}
                    className={styles.selectAllButton}
                  >
                    {selectedImages.size === images.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedImages.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                      className={styles.deleteButton}
                    >
                      {deleting ? 'Deleting...' : `Delete Selected (${selectedImages.size})`}
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

          {images.length === 0 ? (
            <div className={styles.empty}>
              <p>No images found in the vector store.</p>
              <p>Upload images in Sanity Studio to add them to the vector store automatically.</p>
            </div>
          ) : (
            <div className={styles.imageList}>
              {images.map((imageId, index) => (
                <div 
                  key={imageId || index} 
                  className={`${styles.imageItem} ${selectedImages.has(imageId) ? styles.selected : ''}`}
                >
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedImages.has(imageId)}
                      onChange={() => handleToggleSelect(imageId)}
                      className={styles.checkbox}
                    />
                    <code>{imageId}</code>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

