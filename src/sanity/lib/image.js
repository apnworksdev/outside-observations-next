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
  if (!source?.asset?._ref) return null
  try {
    return builder.image(source).url()
  } catch {
    return null
  }
}

/**
 * Build a Sanity CDN image URL with width, quality, and format params.
 */
export function buildSanityImageUrl(src, { width, quality = 82, format } = {}) {
  try {
    const url = new URL(src)
    if (width != null) {
      url.searchParams.set('w', width.toString())
    }
    url.searchParams.set('q', quality.toString())
    if (format) {
      url.searchParams.set('fm', format)
    } else {
      // Let Sanity serve AVIF/WebP/JPEG based on the browser Accept header
      url.searchParams.set('auto', 'format')
    }
    url.searchParams.set('fit', 'max')
    return url.toString()
  } catch (error) {
    console.warn('Failed to parse image URL in buildSanityImageUrl:', error)
    return src
  }
}

// Custom loader for Next.js Image — Sanity handles format negotiation via auto=format
export const sanityImageLoader = ({ src, width, quality = 82 }) => {
  return buildSanityImageUrl(src, { width, quality })
}
