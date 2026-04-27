import {defineField, defineType} from 'sanity'

const mediaItemField = defineField({
  name: 'mediaItem',
  title: 'Media Item',
  type: 'object',
  fields: [
    defineField({
      name: 'mediaType',
      title: 'Media Type',
      type: 'string',
      options: {
        list: [
          {title: 'Image', value: 'image'},
          {title: 'Video', value: 'video'},
        ],
        layout: 'radio',
      },
      initialValue: 'image',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Shown as artwork title in archive views.',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.integer().min(1000).max(3000),
      description: 'Shown in archive list and image hover overlays.',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.mediaType !== 'image',
    }),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      options: {
        accept: 'video/*',
      },
      hidden: ({parent}) => parent?.mediaType !== 'video',
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'Recommended for images. Optional for videos.',
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      if (!value?.mediaType) {
        return 'Select a media type.'
      }

      if (value.mediaType === 'image' && !value?.image?.asset) {
        return 'Upload an image for image media items.'
      }

      if (value.mediaType === 'video' && !value?.video?.asset) {
        return 'Upload a video for video media items.'
      }

      if (value.mediaType === 'image' && value?.video?.asset) {
        return 'Remove video when media type is image.'
      }

      if (value.mediaType === 'video' && value?.image?.asset) {
        return 'Remove image when media type is video.'
      }

      return true
    }),
  preview: {
    select: {
      mediaType: 'mediaType',
      title: 'title',
      alt: 'alt',
      image: 'image',
      imageFileName: 'image.asset.originalFilename',
      videoFileName: 'video.asset.originalFilename',
    },
    prepare(selection) {
      const mediaTypeLabel = selection.mediaType === 'video' ? 'Video' : 'Image'
      const detail =
        selection.title ||
        selection.alt ||
        selection.imageFileName ||
        selection.videoFileName ||
        'No description'

      return {
        title: `${mediaTypeLabel} item`,
        subtitle: detail,
        media: selection.image,
      }
    },
  },
})

export const widlineCadet = defineType({
  name: 'widlineCadet',
  title: 'Widline Cadet',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'backgroundMedia',
      title: 'Background Media',
      type: 'array',
      of: [mediaItemField],
    }),
    defineField({
      name: 'foregroundMedia',
      title: 'Foreground Media',
      type: 'array',
      of: [mediaItemField],
    }),
    defineField({
      name: 'richText',
      title: 'Rich text',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading', value: 'h2'},
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'backgroundMedia.0.image',
    },
  },
})
