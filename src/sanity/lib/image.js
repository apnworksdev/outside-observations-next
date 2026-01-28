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

// Custom loader for Next.js Image component that uses Sanity's image optimization
// This prevents Next.js from trying to optimize already-optimized Sanity images
// Instead, we let Sanity handle the optimization by adding width and quality parameters
export const sanityImageLoader = ({ src, width, quality = 75 }) => {
  // Sanity image URLs should be full URLs from urlForImage()
  // Add width and quality parameters for Sanity's image optimization
  try {
    const url = new URL(src)
    url.searchParams.set('w', width.toString())
    url.searchParams.set('q', quality.toString())
    // Use auto=format to let Sanity serve WebP/AVIF when supported (smaller file sizes)
    url.searchParams.set('auto', 'format')
    // Use fit=max to prevent upscaling (saves bandwidth)
    url.searchParams.set('fit', 'max')
    return url.toString()
  } catch (error) {
    // Fallback: if URL parsing fails, return src as-is (shouldn't happen with valid Sanity URLs)
    console.warn('Failed to parse image URL in sanityImageLoader:', error)
    return src
  }
}
