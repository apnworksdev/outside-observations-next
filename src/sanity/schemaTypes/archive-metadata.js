import {defineField, defineType} from 'sanity'
import {TagReferenceInput} from '../components/inputs/TagReferenceInput'
import {StringArrayInput} from '../components/inputs/StringArrayInput'
import {UrlArrayInput} from '../components/inputs/UrlArrayInput'

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
    defineField({
      name: 'credit',
      title: 'Credit',
      type: 'string',
    }),
    defineField({
      name: 'action',
      title: 'Action',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'color',
      title: 'Color',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'timeOfDay',
      title: 'Time of day',
      type: 'string',
      options: {
        list: [
          {title: 'Day', value: 'day'},
          {title: 'Night', value: 'night'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'season',
      title: 'Season',
      type: 'string',
      options: {
        list: [
          {title: 'Spring', value: 'spring'},
          {title: 'Summer', value: 'summer'},
          {title: 'Fall', value: 'fall'},
          {title: 'Winter', value: 'winter'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'string',
      options: {
        list: [
          {title: 'Landscape', value: 'landscape'},
          {title: 'Portrait', value: 'portrait'},
          {title: 'Urban', value: 'urban'},
          {title: 'Study', value: 'study'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'landscapeType',
      title: 'Landscape type',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'subjectType',
      title: 'Subject type',
      type: 'string',
    }),
    defineField({
      name: 'gender',
      title: 'Gender',
      type: 'string',
      options: {
        list: [
          {title: 'Man', value: 'man'},
          {title: 'Woman', value: 'woman'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'humanStructure1',
      title: 'Human structure 1',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'humanStructure2',
      title: 'Human structure 2',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'mainDriveFolder',
      title: 'Main Drive Folder',
      type: 'string',
    }),
    defineField({
      name: 'typeOfWork',
      title: 'Type of work',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions',
      type: 'string',
    }),
    defineField({
      name: 'seriesTitle',
      title: 'Series Title',
      type: 'string',
    }),
    defineField({
      name: 'publication',
      title: 'Publication',
      type: 'string',
    }),
    defineField({
      name: 'publisher',
      title: 'Publisher',
      type: 'string',
    }),
    defineField({
      name: 'artContextBackground',
      title: 'Art context/background',
      type: 'string',
    }),
    defineField({
      name: 'medium',
      title: 'Medium',
      type: 'string',
    }),
    defineField({
      name: 'exhibition',
      title: 'Exhibition',
      type: 'string',
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
    }),
    defineField({
      name: 'altTitles',
      title: 'Alt titles',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'externalLinks',
      title: 'External links',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: UrlArrayInput,
      },
    }),
  ],
})
