'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Badge, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useFormValue} from 'sanity'

const normalizeId = (id) => {
  if (!id) return ''
  return id.startsWith('drafts.') ? id.slice(7) : id
}

const StatusBadge = ({status}) => {
  const styles = useMemo(() => {
    switch (status) {
      case 'in':
        return {tone: 'positive', text: 'Indexed'}
      case 'missing':
        return {tone: 'critical', text: 'Not indexed'}
      case 'noDescription':
        return {tone: 'caution', text: 'No description'}
      case 'noId':
        return {tone: 'default', text: 'Save to check'}
      case 'error':
        return {tone: 'critical', text: 'Error'}
      default:
        return {tone: 'default', text: 'Unknown'}
    }
  }, [status])

  return (
    <Badge tone={styles.tone} padding={3} fontSize={1} style={{textTransform: 'none'}}>
      {styles.text}
    </Badge>
  )
}

export function VectorStoreStatus() {
  const documentValue = useFormValue([]) || {}
  
  // Extract primitive values and memoize them to prevent unnecessary recalculations
  const documentId = documentValue?._id
  const aiDescription = documentValue?.aiDescription
  
  // Memoize derived values - these will only change when the actual primitive values change
  const canonicalId = useMemo(() => normalizeId(documentId), [documentId])
  const hasDescription = useMemo(() => {
    return typeof aiDescription === 'string' && aiDescription.trim() !== ''
  }, [aiDescription])

  const [status, setStatus] = useState('unknown')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Track what we've already checked to prevent redundant API calls
  const lastCheckedRef = useRef({canonicalId: null, hasDescription: null})
  const isCheckingRef = useRef(false)

  const checkStatus = useCallback(async (forceRefresh = false) => {
    // If no ID, set status and return immediately
    if (!canonicalId) {
      setStatus((prevStatus) => {
        if (prevStatus !== 'noId') {
          return 'noId'
        }
        return prevStatus
      })
      setError(null)
      lastCheckedRef.current = {canonicalId: '', hasDescription: false}
      return
    }

    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return
    }

    // Check if values have actually changed (skip this check if force refresh)
    if (!forceRefresh) {
      const last = lastCheckedRef.current
      if (last.canonicalId === canonicalId && last.hasDescription === hasDescription) {
        return
      }
    }

    // Mark as checking and update last checked
    isCheckingRef.current = true
    lastCheckedRef.current = {canonicalId, hasDescription}
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/vector-store/exists/${encodeURIComponent(canonicalId)}`)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || `Status ${response.status}`)
      }

      const data = await response.json()
      const exists = data.exists === true || data === true

      if (!hasDescription) {
        setStatus('noDescription')
      } else {
        setStatus(exists ? 'in' : 'missing')
      }
    } catch (err) {
      console.error('Vector store status error:', err)
      setStatus('error')
      setError(err.message)
    } finally {
      setLoading(false)
      isCheckingRef.current = false
    }
  }, [canonicalId, hasDescription])

  // Effect to automatically check when values change
  useEffect(() => {
    // If no ID, handle separately
    if (!canonicalId) {
      setStatus((prevStatus) => {
        if (prevStatus !== 'noId') {
          return 'noId'
        }
        return prevStatus
      })
      setError(null)
      lastCheckedRef.current = {canonicalId: '', hasDescription: false}
      return
    }

    // Only check if values have changed
    const last = lastCheckedRef.current
    if (last.canonicalId === canonicalId && last.hasDescription === hasDescription) {
      return
    }

    // Perform the check
    checkStatus()
  }, [canonicalId, hasDescription, checkStatus])

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'in':
        return 'This entry is indexed for semantic search.'
      case 'missing':
        return 'Not indexed yet. Publishing will add it automatically.'
      case 'noDescription':
        return 'Add an AI description before publishing to index it.'
      case 'noId':
        return 'Save the document to generate an ID and check status.'
      case 'error':
        return error || 'Unable to determine status.'
      default:
        return 'Status unknown.'
    }
  }, [status, error])

  return (
    <Card padding={4} radius={2} border tone="transparent">
      <Stack space={3}>
        <Flex align="center" gap={3}>
          <Text size={2} weight="semibold">
            Vector Store Status
          </Text>
          <StatusBadge status={status} />
        </Flex>
        <Text size={1} muted>
          {statusMessage}
        </Text>
        <Flex gap={2} align="center">
          <Button
            text={loading ? 'Checking…' : 'Refresh status'}
            tone="primary"
            mode="ghost"
            onClick={() => checkStatus(true)}
            disabled={loading || status === 'noId'}
            icon={loading ? Spinner : undefined}
          />
          {canonicalId && (
            <Text size={0} muted>
              ID: <span style={{fontFamily: 'var(--font-mono)'}}>{canonicalId}</span>
            </Text>
          )}
        </Flex>
      </Stack>
    </Card>
  )
}
