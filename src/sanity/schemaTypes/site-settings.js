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
      initialValue: 'Outside Observation',
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
    defineField({
      name: 'chatFirstMessage',
      title: 'Chat First Message',
      type: 'text',
      description: 'The first message displayed in the chat. Supports line breaks.',
      rows: 4,
      initialValue: `Welcome to Outside Observations®. We're glad you're here.

Use the menu on the left to explore, or tell me what you're looking for and I'll point you in the right direction.`,
    }),
    defineField({
      name: 'labQuote',
      title: 'Lab Quote',
      type: 'text',
      description: 'Quote displayed in the lab',
      rows: 4,
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Site Settings',
      };
    },
  },
})

