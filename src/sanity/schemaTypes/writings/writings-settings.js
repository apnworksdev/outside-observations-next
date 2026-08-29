import {defineField, defineType} from 'sanity'

export const writingsSettings = defineType({
  name: 'writingsSettings',
  title: 'Writings Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'aboutFirstColumn',
      title: 'About our writing - first column',
      type: 'text',
      rows: 8,
    }),
    defineField({
      name: 'aboutSecondColumn',
      title: 'About our writing - second column',
      type: 'text',
      rows: 8,
    }),
  ],
  preview: {
    prepare: () => ({title: 'Writings Settings'}),
  },
})
