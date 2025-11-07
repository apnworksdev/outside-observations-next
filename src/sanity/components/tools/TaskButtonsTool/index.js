'use client'

import React from 'react'
import {Stack} from '@sanity/ui'

import {BackfillTagSlugsTool} from '../BackfillTagSlugsTool'
import {VectorStoreSyncTool} from '../VectorStoreSyncTool'

export function TaskButtonsTool() {
  return (
    <Stack space={5}>
      <BackfillTagSlugsTool />
      <VectorStoreSyncTool />
    </Stack>
  )
}
