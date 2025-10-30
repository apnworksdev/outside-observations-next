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
  }
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
  }
}`)

export const ARCHIVE_ENTRY_SLUGS = defineQuery(`*[_type == "archiveEntry" && defined(slug.current)][].slug.current`)
