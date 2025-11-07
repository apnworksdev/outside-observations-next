'use client'

import React, {useEffect, useMemo, useRef, useState} from 'react'
import {Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {CloseIcon} from '@sanity/icons'
import {PatchEvent, set, unset, useClient} from 'sanity'

import {apiVersion} from '../../../env'

const slugify = (input) =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const generateKey = () => `tag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export function TagReferenceInput(props) {
  const {value = [], readOnly, onChange, schemaType} = props
  const client = useClient({apiVersion})

  const [tagName, setTagName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [tagLabels, setTagLabels] = useState({})
  const inputRef = useRef(null)

  const references = useMemo(() => (Array.isArray(value) ? value : []), [value])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchLabels() {
      const ids = references.map((ref) => ref?._ref).filter(Boolean)
      if (ids.length === 0) {
        setTagLabels({})
        return
      }

      try {
        const data = await client.fetch(
          `*[_type == "tag" && _id in $ids]{_id, name}`,
          {ids},
          {signal: controller.signal}
        )

        const map = {}
        data.forEach((item) => {
          if (item?._id) {
            map[item._id] = item.name || item._id
          }
        })
        setTagLabels((prev) => ({...map, ...prev}))
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Failed to load tags:', err)
        }
      }
    }

    fetchLabels()

    return () => {
      controller.abort()
    }
  }, [client, references])

  const handleSubmit = async () => {
    const trimmed = (tagName || '').trim()
    if (!trimmed || busy || readOnly) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      const existing = await client.fetch(
        `*[_type == "tag" && (lower(name) == $name || slug.current == $slug || slug.current == $name)][0]`,
        {name: trimmed.toLowerCase(), slug: slugify(trimmed)}
      )

      let targetId = existing?._id

      if (!targetId) {
        const slug = slugify(trimmed)
        if (!slug) {
          throw new Error('Unable to generate slug for tag')
        }

        const newTag = await client.create({
          _type: 'tag',
          name: trimmed,
          slug: {current: slug},
        })

        targetId = newTag?._id
        setTagLabels((prev) => ({...prev, [targetId]: trimmed}))
      } else {
        setTagLabels((prev) => ({...prev, [targetId]: existing.name || trimmed}))
      }

      if (!targetId) {
        throw new Error('Failed to determine tag ID')
      }

      const alreadyPresent = references.some((ref) => ref?._ref === targetId)
      if (alreadyPresent) {
        setTagName('')
        return
      }

      const next = [
        ...references,
        {
          _type: 'reference',
          _ref: targetId,
          _key: generateKey(),
        },
      ]

      onChange(PatchEvent.from(set(next)))
      setTagName('')
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    } catch (err) {
      console.error('Tag add error:', err)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
    
  const handleRemove = (key) => {
    if (readOnly || !onChange) {
      return
    }

    const next = references.filter((item) => item?._key !== key)
    if (next.length === 0) {
      onChange(PatchEvent.from(unset()))
    } else {
      onChange(PatchEvent.from(set(next)))
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Stack space={3}>
      <TextInput
        ref={inputRef}
        value={tagName}
        onChange={(event) => setTagName(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Add ${schemaType?.title?.toLowerCase() || 'tag'} and press Enter`}
        disabled={readOnly || busy}
      />
      {error && (
        <Text size={1} tone="critical">
          {error}
        </Text>
      )}
      <Flex gap={2} wrap="wrap">
        {references.map((item) => (
          <Card
            key={item?._key || item?._ref}
            padding={2}
            radius={3}
            border
            tone="default"
            style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem'}}
          >
            <Text size={1}>{tagLabels[item?._ref] || item?._ref || 'Tag'}</Text>
            {!readOnly && (
              <Button
                tone="critical"
                mode="bleed"
                icon={CloseIcon}
                padding={2}
                onClick={() => handleRemove(item?._key)}
              />
            )}
          </Card>
        ))}
        {references.length === 0 && (
          <Text size={1} muted>
            No tags yet.
          </Text>
        )}
      </Flex>
    </Stack>
  )
}
