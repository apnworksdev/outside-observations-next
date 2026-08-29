import {defineField, defineType} from 'sanity'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required().min(1).max(120),
    }),
    defineField({
      name: 'link',
      title: 'Website / social link',
      type: 'url',
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'link'},
  },
})
