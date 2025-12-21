import {defineField, defineType} from 'sanity'
import {TagReferenceInput} from '../components/inputs/TagReferenceInput'

export const archiveMetadata = defineType({
  name: 'archiveMetadata',
  title: 'Archive Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        // For nested objects, use a function that receives the parent document (archiveEntry)
        source: (doc) => {
          // doc is the parent archiveEntry document
          // Try metadata.artName first (new structure), then fall back to top-level artName
          // This fallback provides backward compatibility and safety in case of edge cases
          // or data inconsistencies. All entries should use metadata.artName going forward.
          return doc?.metadata?.artName || doc?.artName || ''
        },
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'artName',
      title: 'Art Name',
      type: 'string',
    }),
    defineField({
      name: 'fileName',
      title: 'File Name',
      type: 'string',
    }),
    defineField({
      name: 'source',
      title: 'Source/Author',
      type: 'string',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'tag'}],
        },
      ],
      components: {
        input: TagReferenceInput,
      },
    }),
  ],
})
