'use client'

import React, {useEffect, useMemo, useRef, useState} from 'react'
import {Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {CloseIcon} from '@sanity/icons'
import {PatchEvent, set, unset} from 'sanity'

export function StringArrayInput(props) {
  const {value = [], readOnly, onChange, schemaType} = props
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  // Normalize value: filter out old reference objects and keep only strings
  const normalizedValue = useMemo(() => {
    return Array.isArray(value) 
      ? value.filter(item => typeof item === 'string')
      : []
  }, [value])

  // Auto-migrate: if value contains reference objects, remove them
  useEffect(() => {
    const hasReferences = Array.isArray(value) && value.some(
      item => item && typeof item === 'object' && (item._ref || item._key || item._type)
    )

    if (hasReferences) {
      // Migrate by removing reference objects
      const migrated = normalizedValue
      
      // Only update if there's a difference
      if (migrated.length !== value.length) {
        if (migrated.length === 0) {
          onChange(PatchEvent.from(unset()))
        } else {
          onChange(PatchEvent.from(set(migrated)))
        }
      }
    }
  }, [value, normalizedValue, onChange])

  const handleSubmit = () => {
    const trimmed = (inputValue || '').trim()
    if (!trimmed || readOnly) {
      return
    }

    const alreadyPresent = normalizedValue.includes(trimmed)
    if (alreadyPresent) {
      setInputValue('')
      return
    }

    const next = [...normalizedValue, trimmed]
    onChange(PatchEvent.from(set(next)))
    setInputValue('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const handleRemove = (index) => {
    if (readOnly || !onChange) {
      return
    }

    const next = normalizedValue.filter((_, i) => i !== index)
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
        value={inputValue}
        onChange={(event) => setInputValue(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Add ${schemaType?.title?.toLowerCase() || 'item'} and press Enter`}
        disabled={readOnly}
      />
      <Flex gap={2} wrap="wrap">
        {normalizedValue.map((item, index) => (
          <Card
            key={`${item}-${index}`}
            padding={2}
            radius={3}
            border
            tone="default"
            style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem'}}
          >
            <Text size={1}>{item}</Text>
            {!readOnly && (
              <Button
                tone="critical"
                mode="bleed"
                icon={CloseIcon}
                padding={2}
                onClick={() => handleRemove(index)}
              />
            )}
          </Card>
        ))}
        {normalizedValue.length === 0 && (
          <Text size={1} muted>
            No items yet.
          </Text>
        )}
      </Flex>
    </Stack>
  )
}

