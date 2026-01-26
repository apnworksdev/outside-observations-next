import {defineQuery} from 'next-sanity'

/**
 * Optimized query for archive list - only fetches data needed for list display
 * Much lighter than ARCHIVE_ENTRIES_QUERY (excludes aiDescription, full visual essay images)
 */
export const ARCHIVE_ENTRIES_LIST_QUERY = defineQuery(`*[_type == "archiveEntry"] | order(coalesce(metadata.year, year) desc) {
  _id,
  metadata {
    year,
    slug {
      current,
      _type
    },
    artName,
    fileName,
    source,
    contentWarning,
    tags[]->{
      _id,
      name
    }
  },
  year,
  slug {
    current,
    _type
  },
  artName,
  fileName,
  source,
  tags[]->{
    _id,
    name
  },
  mediaType,
  video{
    asset->{
      _id,
      url,
      originalFilename,
      mimeType
    }
  },
  poster{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  },
  aiMoodTags[]->{
    _id,
    name
  },
  // Fetch all visual essay images but without aiDescription/aiMoodTags (lighter payload)
  visualEssayImages[]->{
    _id,
    image{
      ...,
      asset,
      'lqip': asset->metadata.lqip,
      'dimensions': asset->metadata.dimensions
    },
    metadata {
      artName,
      fileName,
      year { value },
      source
    }
  }
}`)

/**
 * Full query for archive entries - includes all data (used for individual entry pages)
 * Keep this for backward compatibility and for pages that need full data
 */
export const ARCHIVE_ENTRIES_QUERY = defineQuery(`*[_type == "archiveEntry"] | order(coalesce(metadata.year, year) desc) {
  _id,
  metadata {
    year,
    slug {
      current,
      _type
    },
    artName,
    fileName,
    source,
    contentWarning,
    tags[]->{
      _id,
      name
    }
  },
  year,
  slug {
    current,
    _type
  },
  artName,
  fileName,
  source,
  tags[]->{
    _id,
    name
  },
  mediaType,
  video{
    asset->{
      _id,
      url,
      originalFilename,
      mimeType
    }
  },
  poster{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  },
  aiMoodTags[]->{
    _id,
    name
  },
  aiDescription,
  visualEssayImages[]->{
    _id,
    image{
      ...,
      asset,
      'lqip': asset->metadata.lqip,
      'dimensions': asset->metadata.dimensions
    },
    metadata {
      artName,
      fileName,
      year { value },
      source
    },
    aiDescription,
    aiMoodTags[]->{
      _id,
      name
    }
  }
}`)

export const ARCHIVE_ENTRY_QUERY = defineQuery(`*[_type == "archiveEntry" && (slug.current == $slug || metadata.slug.current == $slug)][0] {
  _id,
  metadata {
    year,
    slug,
    artName,
    fileName,
    source,
    contentWarning,
    tags[]->{
      _id,
      name
    }
  },
  year,
  slug,
  artName,
  fileName,
  source,
  tags[]->{
    _id,
    name
  },
  mediaType,
  video{
    asset->{
      _id,
      url,
      originalFilename,
      mimeType
    }
  },
  poster{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  },
  aiMoodTags[]->{
    _id,
    name
  },
  aiDescription,
  visualEssayImages[]->{
    _id,
    image{
      ...,
      asset,
      'lqip': asset->metadata.lqip,
      'dimensions': asset->metadata.dimensions
    },
    metadata {
      artName,
      fileName,
      year { value },
      source
    },
    aiDescription,
    aiMoodTags[]->{
      _id,
      name
    }
  },
  textMarkup,
  textContent
}`)

export const ARCHIVE_ENTRY_SLUGS = defineQuery(`
  *[_type == "archiveEntry" && (defined(slug.current) || defined(metadata.slug.current))] 
  | {
    "slug": coalesce(metadata.slug.current, slug.current)
  }
  .slug
`)

/**
 * Query to fetch archive entries by IDs - optimized for image display
 * Only fetches minimal data needed for displaying images in chat
 * Includes mediaType for consistency and future use
 */
export const ARCHIVE_ENTRIES_BY_IDS_QUERY = defineQuery(`*[_type == "archiveEntry" && _id in $ids] {
  _id,
  metadata {
    slug {
      current,
      _type
    },
    artName
  },
  slug {
    current,
    _type
  },
  artName,
  mediaType,
  metadata {
    contentWarning
  },
  poster{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  }
}`)

export const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings"][0] {
  _id,
  title,
  chatFirstMessage,
  labQuote,
  closedArchiveImage{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  }
}`)

/**
 * Pool: archive entry IDs eligible for Unexpected Connections.
 * mediaType image/video/text, poster.asset, for video also video.asset, and length(aiDescription) > 0.
 * We use length(aiDescription) > 0 instead of defined()/!= "" which can be unreliable for text fields.
 */
export const ARCHIVE_ENTRIES_ELIGIBLE_IDS_FOR_UNEXPECTED_QUERY = defineQuery(
  `*[_type == "archiveEntry"
    && mediaType in ["image", "video", "text"]
    && defined(poster.asset)
    && (mediaType != "video" || defined(video.asset))
    && length(aiDescription) > 0] {
    _id,
    _type
  }`
)

/**
 * Pool: visual essay image IDs eligible for Unexpected Connections.
 * image.asset and length(aiDescription) > 0 (avoids defined/!= "" for text).
 */
export const VISUAL_ESSAY_IMAGES_ELIGIBLE_IDS_FOR_UNEXPECTED_QUERY = defineQuery(
  `*[_type == "visualEssayImage"
    && defined(image.asset)
    && length(aiDescription) > 0] {
    _id,
    _type
  }`
)

/**
 * Fetch full archive entries by IDs for Unexpected Connections (after picking 2 from pool).
 */
export const ARCHIVE_ENTRIES_BY_IDS_FOR_UNEXPECTED_QUERY = defineQuery(
  `*[_type == "archiveEntry" && _id in $ids] {
    _id,
    mediaType,
    metadata { 
      artName, 
      contentWarning,
      tags[]->{ _id, name }, 
      slug { current } 
    },
    artName,
    slug { current },
    poster {
      ...,
      asset,
      "lqip": asset->metadata.lqip,
      "dimensions": asset->metadata.dimensions
    },
    video { asset->{ url, mimeType } },
    aiMoodTags[]->{ _id, name },
    aiDescription,
    tags[]->{ _id, name }
  }`
)

/**
 * Fetch full visual essay images by IDs for Unexpected Connections (after picking 2 from pool).
 */
export const VISUAL_ESSAY_IMAGES_BY_IDS_FOR_UNEXPECTED_QUERY = defineQuery(
  `*[_type == "visualEssayImage" && _id in $ids] {
    _id,
    metadata { artName },
    image {
      ...,
      asset,
      "lqip": asset->metadata.lqip,
      "dimensions": asset->metadata.dimensions
    },
    aiMoodTags[]->{ _id, name },
    aiDescription
  }`
)

/**
 * Find the parent archive entry (visualEssay) that references this visualEssayImage,
 * and the index of that image in the filtered visualEssayImages (same logic as ArchiveEntryContent).
 * Returns { slug, imageIndex } or null.
 */
export const PARENT_ARCHIVE_FOR_VISUAL_ESSAY_IMAGE_QUERY = defineQuery(
  `*[_type == "archiveEntry" && mediaType == "visualEssay" && $visualId in visualEssayImages[]._ref][0]{
    "slug": coalesce(metadata.slug.current, slug.current),
    "visualEssayImages": visualEssayImages[]->{ _id, image { asset } }
  }`
)
