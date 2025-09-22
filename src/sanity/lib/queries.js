import {defineQuery} from 'next-sanity'

export const ARCHIVE_ENTRIES_QUERY = defineQuery(`*[_type == "archiveEntry"] | order(year desc) {
  _id,
  year,
  artName,
  fileName,
  source,
  poster,
  tags[]->{
    _id,
    name
  }
}`)

export const POSTS_QUERY = defineQuery(`*[_type == "post" && defined(slug.current)][0...12]{
  _id, title, slug
}`)

export const POST_QUERY = defineQuery(`*[_type == "post" && slug.current == $slug][0]{
  title, body, mainImage
}`)