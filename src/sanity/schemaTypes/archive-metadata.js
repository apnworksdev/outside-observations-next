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
      name: 'excelID',
      title: 'Excel ID',
      type: 'string',
      description: 'Unique identifier from Excel/CSV import. Used to match and update existing entries.',
    }),
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
      name: 'contentWarning',
      title: 'Content Warning',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'fileName',
      title: 'File Name',
      type: 'string',
    }),
    defineField({
      name: 'artName',
      title: 'Art Name',
      type: 'string',
    }),
    defineField({
      name: 'source',
      title: 'Source/Author',
      type: 'string',
    }),
    defineField({
      name: 'credit',
      title: 'Credit',
      type: 'string',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'object',
      fields: [
        defineField({
          name: 'value',
          title: 'Year Value',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'isEstimate',
          title: 'Is Estimate',
          type: 'boolean',
          initialValue: false,
        }),
      ],
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
      name: 'action',
      title: 'Action',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'timeOfDay',
      title: 'Time of day',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Day', value: 'day'},
          {title: 'Night', value: 'night'},
        ],
      },
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'season',
      title: 'Season',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Spring', value: 'spring'},
          {title: 'Summer', value: 'summer'},
          {title: 'Fall', value: 'fall'},
          {title: 'Winter', value: 'winter'},
        ],
      },
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Landscape', value: 'landscape'},
          {title: 'Portrait', value: 'portrait'},
          {title: 'Urban', value: 'urban'},
          {title: 'Study', value: 'study'},
        ],
      },
      components: {
        input: StringArrayInput,
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
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'gender',
      title: 'Gender',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Man', value: 'man'},
          {title: 'Woman', value: 'woman'},
        ],
      },
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
      name: 'humanStructure1',
      title: 'Human structure 1',
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
      name: 'fontType',
      title: 'Font Type',
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
      name: 'exhibition',
      title: 'Exhibition',
      type: 'string',
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
    defineField({
      name: 'countryRegion',
      title: 'Country / Region',
      type: 'string',
    }),
    defineField({
      name: 'medium',
      title: 'Medium',
      type: 'string',
    }),
    defineField({
      name: 'languages',
      title: 'Languages',
      type: 'array',
      of: [{type: 'string'}],
      components: {
        input: StringArrayInput,
      },
    }),
    defineField({
      name: 'copyright',
      title: 'Copyright',
      type: 'object',
      fields: [
        defineField({
          name: 'status',
          title: 'Status',
          type: 'string',
        }),
        defineField({
          name: 'info',
          title: 'Info',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'artistContactInfo',
      title: 'Artist Contact Info',
      type: 'string',
    }),
  ],
})
