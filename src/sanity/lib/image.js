import createImageUrlBuilder from '@sanity/image-url'

import { dataset, projectId } from '../env'

// https://www.sanity.io/docs/image-url
const builder = createImageUrlBuilder({ projectId, dataset })

export const urlFor = (source) => {
  return builder.image(source)
}

// Get base image URL without query parameters for Next.js Image Optimization
// Next.js Image will handle resizing, so we don't need Sanity's width parameter
export const urlForImage = (source) => {
  if (!source) return null
  return builder.image(source).url()
}
