import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Keep true for ISR - CDN is fine for static generation
  // Add token for preview mode if needed later
  // token: process.env.SANITY_API_TOKEN,
})
