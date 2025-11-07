'use client'

import React, {useState} from 'react'
import {Button, Card, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'

import {apiVersion} from '../../../env'

const slugify = (input) =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const fetchTagsWithoutSlugQuery = `*[_type == "tag" && !defined(slug.current)]{_id, name}`

export function BackfillTagSlugsTool() {
  const client = useClient({apiVersion})
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

  const handleRun = async () => {
    setIsRunning(true)
    setMessage('Fetching tags without slugs…')
    setDetails('')

    try {
      const tags = await client.fetch(fetchTagsWithoutSlugQuery)

      if (!tags.length) {
        setMessage('All tags already have slugs ✅')
        return
      }

      const patches = []
      const seenSlugs = new Map()
      const duplicateNames = new Set()

      tags.forEach((tag) => {
        const nextSlug = slugify(tag.name || '')
        if (!nextSlug) {
          patches.push({tag, slug: null, skip: 'Missing tag name'})
          return
        }

        if (seenSlugs.has(nextSlug)) {
          duplicateNames.add(tag.name)
          duplicateNames.add(seenSlugs.get(nextSlug).name)
        } else {
          seenSlugs.set(nextSlug, tag)
        }

        patches.push({tag, slug: nextSlug, skip: null})
      })

      if (duplicateNames.size > 0) {
        setMessage('Stopped: duplicate tag names detected ❗️')
        setDetails(
          `Please rename these tags to be unique and try again: ${Array.from(duplicateNames).join(
            ', '
          )}`
        )
        return
      }

      const transaction = client.transaction()

      patches.forEach(({tag, slug, skip}) => {
        if (skip || !slug) {
          return
        }

        transaction.patch(tag._id, {
          set: {
            slug: {current: slug},
          },
        })
      })

      if (transaction.operations.length === 0) {
        setMessage('No valid tags to update.')
        return
      }

      setMessage(`Updating ${transaction.operations.length} tag(s)…`)
      await transaction.commit({autoGenerateArrayKeys: true})

      setMessage('Tag slugs backfilled successfully 🎉')
      setDetails(
        `Updated tags: ${patches
          .filter(({skip}) => !skip)
          .map(({tag}) => tag.name)
          .join(', ')}`
      )
    } catch (error) {
      console.error('Backfill tag slug error:', error)
      setMessage('Failed to backfill tag slugs ❌')
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
            Backfill Tag Slugs
          </Text>
          <Text size={1} muted>
            This script finds every tag lacking a slug and assigns one based on the tag name. It runs
            a single transaction, so if duplicates are encountered nothing is changed.
          </Text>
        </Stack>
        <Button
          text={isRunning ? 'Running…' : 'Generate Slugs'}
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
