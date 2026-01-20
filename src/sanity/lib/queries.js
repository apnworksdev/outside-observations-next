import {defineQuery} from 'next-sanity'

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
  closedArchiveImage{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  }
}`)
