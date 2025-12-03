import {defineQuery} from 'next-sanity'

// Only SITE_SETTINGS_QUERY is needed for the launch countdown page
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
