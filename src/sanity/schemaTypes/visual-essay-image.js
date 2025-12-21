import {defineField, defineType} from 'sanity'

export const visualEssayImage = defineType({
  name: 'visualEssayImage',
  title: 'Visual Essay Image',
  type: 'document',
  fields: [
    defineField({
      name: 'metadata',
      title: 'Metadata',
      type: 'archiveMetadata',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'metadata.fileName',
      subtitle: 'metadata.artName',
      media: 'image',
    },
  },
})
