import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  // Make it a singleton - only one document of this type
  __experimental_actions: [
    // 'create',
    'update',
    // 'delete',
    'publish'
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Site Settings',
      readOnly: true,
    }),
    defineField({
      name: 'closedArchiveImage',
      title: 'Closed Archive Image',
      type: 'image',
      description: 'Image to display on the "closed archive"',
      options: {
        hotspot: true
      }
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})

