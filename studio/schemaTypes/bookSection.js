import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'bookSection',
  title: 'Book Sections',
  type: 'document',
  fields: [
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      description: 'Reader order inside volumes. Surah 114 starts at 1 and Surah 2 ends at 113.',
      type: 'number',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'sectionType',
      title: 'Section Type',
      type: 'string',
      initialValue: 'surah',
      options: {
        list: [
          {title: 'Introduction', value: 'introduction'},
          {title: 'Surah', value: 'surah'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'volumeNumber',
      title: 'Volume Number',
      type: 'number',
      options: {
        list: [
          {title: 'Volume 2: Surahs 114-41', value: 2},
          {title: 'Volume 3: Surahs 40-20', value: 3},
          {title: 'Volume 4: Surahs 19-7', value: 4},
          {title: 'Volume 5: Surahs 6-2', value: 5},
        ],
      },
      validation: (Rule) => Rule.required().min(2).max(5),
    }),
    defineField({
      name: 'volumeTitle',
      title: 'Volume Title',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'surahNumber',
      title: 'Surah Number',
      type: 'number',
      validation: (Rule) => Rule.min(2).max(114),
    }),
    defineField({
      name: 'chapterNumber',
      title: 'Chapter Number (legacy alias)',
      description: 'Kept for the existing frontend/backend code. Use the same value as Surah Number.',
      type: 'number',
      validation: (Rule) => Rule.min(1).max(114),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'titleMal',
      title: 'Malayalam Title',
      type: 'string',
    }),
    defineField({
      name: 'titleEng',
      title: 'English Title',
      type: 'string',
    }),
    defineField({
      name: 'malayalamName',
      title: 'Malayalam Name',
      type: 'string',
    }),
    defineField({
      name: 'englishName',
      title: 'English Name',
      type: 'string',
    }),
    defineField({
      name: 'arabicName',
      title: 'Arabic Name',
      type: 'string',
    }),
    defineField({
      name: 'translation',
      title: 'Malayalam Translation',
      type: 'string',
    }),
    defineField({
      name: 'translationEng',
      title: 'English Translation',
      type: 'string',
    }),
    defineField({
      name: 'revelation',
      title: 'Revelation (English)',
      type: 'string',
      options: {
        list: [
          {title: 'Meccan', value: 'Meccan'},
          {title: 'Medinan', value: 'Medinan'},
        ],
      },
    }),
    defineField({
      name: 'revelationMal',
      title: 'Revelation (Malayalam)',
      type: 'string',
    }),
    defineField({
      name: 'versesCount',
      title: 'Verses Count',
      type: 'number',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'summary',
      title: 'Short Summary',
      description: 'This appears in the volume cards and is used as fallback reader content.',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'content',
      title: 'Reader Content',
      description: 'Main Malayalam text shown on the frontend. Use blank lines to separate paragraphs.',
      type: 'text',
      rows: 18,
    }),
    defineField({
      name: 'body',
      title: 'Body (legacy fallback)',
      type: 'text',
      rows: 18,
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'englishName', maxLength: 96},
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      initialValue: 'quran',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      description: 'Legacy sort field. Same as Display Order.',
      type: 'number',
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      surahNumber: 'surahNumber',
      volumeNumber: 'volumeNumber',
    },
    prepare({title, surahNumber, volumeNumber}) {
      return {
        title: title || `Surah ${surahNumber || ''}`,
        subtitle: volumeNumber ? `Volume ${volumeNumber} • Surah ${surahNumber}` : undefined,
      }
    },
  },
})
