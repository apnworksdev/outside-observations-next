import {createClient} from 'next-sanity'

import {apiVersion, dataset, projectId} from '../env'

/**
 * Server-only client for the article preview route: carries the read token so
 * it can see drafts, never the CDN, never cached. Not imported anywhere except
 * the preview page, so the published site keeps its existing client untouched.
 */
export const previewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
  perspective: 'raw',
})

export const hasPreviewToken = Boolean(process.env.SANITY_API_READ_TOKEN)
