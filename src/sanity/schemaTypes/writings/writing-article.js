import {defineArrayMember, defineField, defineType} from 'sanity'

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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Footer subtitle',
      type: 'string',
      description: 'Short theme line shown at the bottom of the article (e.g. "Evidence as content").',
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
              description:
                'Which vertical line of the site grid the block starts on (1 = far left, 12 = far right). The lines are visible on the page.',
              validation: (Rule) => Rule.required().integer().min(1).max(12),
            }),
            defineField({
              name: 'columnSpan',
              title: 'Width',
              type: 'number',
              initialValue: 8,
              description: 'Preset widths, in columns of the site grid.',
              options: {
                list: [
                  {title: '2 columns — narrow', value: 2},
                  {title: '3 columns', value: 3},
                  {title: '4 columns', value: 4},
                  {title: '5 columns', value: 5},
                  {title: '6 columns', value: 6},
                  {title: '7 columns', value: 7},
                  {title: '8 columns — wide', value: 8},
                  {title: '9 columns', value: 9},
                  {title: '10 columns — full', value: 10},
                ],
                layout: 'radio',
              },
              validation: (Rule) => Rule.required(),
            }),
          ],
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
                subtitle: `Text — line ${from} → ${from + width} (${width} col.)`,
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
      return {title, subtitle: [authorName, date].filter(Boolean).join(' — ')}
    },
  },
})
