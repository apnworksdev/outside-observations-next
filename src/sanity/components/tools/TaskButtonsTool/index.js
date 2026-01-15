'use client'

import React from 'react'
import {Stack} from '@sanity/ui'

// import {BackfillTagSlugsTool} from '../BackfillTagSlugsTool'
import {VectorStoreSyncTool} from '../VectorStoreSyncTool'
import {VectorStoreCleanupTool} from '../VectorStoreCleanupTool'
import {CsvImportTool} from '../CsvImportTool'
import {BulkDeleteTool} from '../BulkDeleteTool'

export function TaskButtonsTool() {
  return (
    <Stack space={5}>
      {/* <BackfillTagSlugsTool /> */}
      <CsvImportTool />
      <BulkDeleteTool />
      <VectorStoreSyncTool />
      <VectorStoreCleanupTool />
    </Stack>
  )
}
