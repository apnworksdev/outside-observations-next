'use client'

import React, {useCallback, useEffect, useMemo, useState} from 'react'
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
  const documentId = documentValue?._id
  const canonicalId = normalizeId(documentId)
  const hasDescription =
    typeof documentValue?.aiDescription === 'string' && documentValue.aiDescription.trim() !== ''

  const [status, setStatus] = useState('unknown')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const checkStatus = useCallback(async () => {
    if (!canonicalId) {
      setStatus('noId')
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vector-store/get-all-images')

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || `Status ${response.status}`)
      }

      const data = await response.json()
      const imageIds = Array.isArray(data.imageIds) ? data.imageIds : []

      const found = imageIds.some((id) => {
        const normalized = normalizeId(id)
        return normalized === canonicalId
      })

      if (!hasDescription) {
        setStatus('noDescription')
      } else {
        setStatus(found ? 'in' : 'missing')
      }
    } catch (err) {
      console.error('Vector store status error:', err)
      setStatus('error')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [canonicalId, hasDescription])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

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
            onClick={checkStatus}
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
