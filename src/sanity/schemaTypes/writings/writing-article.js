import {createElement as h} from 'react'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {ColumnBandPreview} from '../../components/previews/ColumnBandPreview'
import {ColumnBandInput} from '../../components/inputs/ColumnBandInput'

export const writingArticle = defineType({
  name: 'writingArticle',
  title: 'Writing',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().min(1).max(180),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'author'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published on',
      type: 'date',
      description:
        'Shown under the title, and controls visibility: a published article only appears on the site once this date is reached. Set a future date to schedule.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'One or two sentences used on the listing page and for search engines.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'textSection',
          title: 'Text section',
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Text',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'block',
                  styles: [{title: 'Normal', value: 'normal'}],
                  lists: [],
                  marks: {
                    decorators: [
                      {title: 'Bold', value: 'strong'},
                      {title: 'Italic', value: 'em'},
                    ],
                    annotations: [
                      {
                        name: 'link',
                        type: 'object',
                        title: 'Link (URL)',
                        fields: [{name: 'href', type: 'url', title: 'URL'}],
                      },
                      {
                        name: 'hoverImage',
                        type: 'object',
                        title: 'Link (image on hover)',
                        description:
                          'Underlines the text and reveals this image while the reader hovers it.',
                        fields: [
                          {
                            name: 'image',
                            type: 'image',
                            title: 'Image',
                            options: {hotspot: true},
                            validation: (Rule) => Rule.required(),
                          },
                          {name: 'caption', type: 'string', title: 'Caption / credit'},
                        ],
                      },
                    ],
                  },
                }),
              ],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'startColumn',
              title: 'Starts at line',
              type: 'number',
              initialValue: 2,
              hidden: true,
              validation: (Rule) => Rule.required().integer().min(1).max(12),
            }),
            defineField({
              name: 'columnSpan',
              title: 'Width',
              type: 'number',
              initialValue: 8,
              hidden: true,
              validation: (Rule) => Rule.required().integer().min(1).max(12),
            }),
          ],
          components: {input: ColumnBandInput},
          preview: {
            select: {text: 'text', startColumn: 'startColumn', columnSpan: 'columnSpan'},
            prepare({text, startColumn, columnSpan}) {
              const first = Array.isArray(text)
                ? text.find((block) => block?._type === 'block')
                : null
              const plain = first?.children?.map((child) => child.text).join('') || 'Text section'
              const from = startColumn ?? 2
              const width = columnSpan ?? 8
              return {
                title: plain.slice(0, 80),
                subtitle: `Line ${from} → ${from + width} (${width} col.)`,
                media: h(ColumnBandPreview, {start: from, span: width}),
              }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  orderings: [
    {
      title: 'Published date, newest first',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {title: 'title', authorName: 'author.name', date: 'publishedAt'},
    prepare({title, authorName, date}) {
      return {title, subtitle: [authorName, date].filter(Boolean).join(' - ')}
    },
  },
})
