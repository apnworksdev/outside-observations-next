import {defineQuery} from 'next-sanity'

export const ARCHIVE_ENTRIES_QUERY = defineQuery(`*[_type == "archiveEntry"] | order(year desc) {
  _id,
  year,
  slug {
    current,
    _type
  },
  artName,
  fileName,
  source,
  poster{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  },
  tags[]->{
    _id,
    name
  },
  aiMoodTags[]->{
    _id,
    name
  },
  aiDescription
}`)

export const ARCHIVE_ENTRY_QUERY = defineQuery(`*[_type == "archiveEntry" && slug.current == $slug][0] {
  _id,
  year,
  slug,
  artName,
  fileName,
  source,
  poster{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  },
  tags[]->{
    _id,
    name
  },
  aiMoodTags[]->{
    _id,
    name
  },
  aiDescription
}`)

export const ARCHIVE_ENTRY_SLUGS = defineQuery(`*[_type == "archiveEntry" && defined(slug.current)][].slug.current`)

/**
 * Query to fetch archive entries by IDs - optimized for image display
 * Only fetches minimal data needed for displaying images in chat
 */
export const ARCHIVE_ENTRIES_BY_IDS_QUERY = defineQuery(`*[_type == "archiveEntry" && _id in $ids] {
  _id,
  slug {
    current,
    _type
  },
  artName,
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
  closedArchiveImage{
    ...,
    asset,
    'lqip': asset->metadata.lqip,
    'dimensions': asset->metadata.dimensions
  }
}`)
