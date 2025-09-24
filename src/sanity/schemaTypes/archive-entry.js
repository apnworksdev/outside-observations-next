import {defineField, defineType} from 'sanity'

export const archiveEntry = defineType({
  name: 'archiveEntry',
  title: 'Archive',
  preview: {
    select: {
      title: 'artName',
    },
  },
  type: 'document',
  fields: [
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'artName',
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
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'tag'}],
        },
      ],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'poster',
      title: 'Poster',
      type: 'image',
      options: {
        hotspot: true
      },
    }),
  ],
})