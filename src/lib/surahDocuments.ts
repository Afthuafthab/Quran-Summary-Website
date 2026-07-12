import type {SurahMeta} from '../data/all_surahs'
import type {QuranVerse} from '../data/pmd_converted_content'

export type SanityBookSectionDocument = {
  _id: string
  _type: 'bookSection'
  title: string
  titleMal: string
  titleEng: string
  malayalamName: string
  englishName: string
  arabicName: string
  translation: string
  translationEng: string
  revelation: SurahMeta['revelation']
  revelationMal: string
  versesCount: number
  summary: string
  content: string
  body: string
  slug: {_type: 'slug'; current: string}
  category: 'quran'
  sectionType: 'surah'
  surahNumber: number
  chapterNumber: number
  volumeNumber: 2 | 3 | 4 | 5
  volumeTitle: string
  displayOrder: number
  sortOrder: number
  published: boolean
}

export const SURAH_VOLUME_DEFINITIONS = [
  {volumeNumber: 2 as const, title: 'Volume 2: Surahs 114-41', minSurah: 41, maxSurah: 114},
  {volumeNumber: 3 as const, title: 'Volume 3: Surahs 40-20', minSurah: 20, maxSurah: 40},
  {volumeNumber: 4 as const, title: 'Volume 4: Surahs 19-7', minSurah: 7, maxSurah: 19},
  {volumeNumber: 5 as const, title: 'Volume 5: Surahs 6-2', minSurah: 2, maxSurah: 6},
]

export const SURAH_VOLUME_COUNTS: Record<2 | 3 | 4 | 5, number> = {
  2: 74,
  3: 21,
  4: 13,
  5: 5,
}

export const SANITY_SURAH_QUERY_FIELDS = `
  _id,
  _type,
  title,
  titleMal,
  titleEng,
  malayalamName,
  englishName,
  arabicName,
  translation,
  translationEng,
  revelation,
  revelationMal,
  versesCount,
  summary,
  content,
  body,
  slug,
  category,
  sectionType,
  surahNumber,
  chapterNumber,
  volumeNumber,
  volumeTitle,
  displayOrder,
  sortOrder,
  published
`

export function getVolumeNumberForSurah(surahNumber: number): 2 | 3 | 4 | 5 {
  if (surahNumber >= 41 && surahNumber <= 114) return 2
  if (surahNumber >= 20 && surahNumber <= 40) return 3
  if (surahNumber >= 7 && surahNumber <= 19) return 4
  if (surahNumber >= 2 && surahNumber <= 6) return 5

  throw new Error(`Surah ${surahNumber} is not part of CMS volumes 2-5`)
}

export function getVolumeTitleForSurah(surahNumber: number): string {
  const volumeNumber = getVolumeNumberForSurah(surahNumber)
  const volume = SURAH_VOLUME_DEFINITIONS.find((item) => item.volumeNumber === volumeNumber)
  return volume?.title ?? `Volume ${volumeNumber}`
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'surah'
}

function isSpecificSurahVerse(verse: QuranVerse, surahNumber: number): boolean {
  if (verse.surah === surahNumber) {
    return true
  }

  const chapterMatch = verse.context_chapter?.trim().match(/^(?:അധ്യായം|അദ്ധ്യായം)\s*(\d+)$/)
  return chapterMatch ? Number(chapterMatch[1]) === surahNumber : false
}

function getSeedContentForSurah(
  quranData: Record<string, QuranVerse> | undefined,
  surahNumber: number,
  fallbackSummary: string,
): string {
  if (!quranData) {
    return fallbackSummary
  }

  const paragraphs = Object.entries(quranData)
    .filter(([key, verse]) => {
      if (['6:154', '52:2', '29:48', '2:61'].includes(key)) return false
      return isSpecificSurahVerse(verse, surahNumber)
    })
    .sort(([, a], [, b]) => {
      if (a.surah !== b.surah) return a.surah - b.surah
      return a.start_ayah - b.start_ayah
    })
    .flatMap(([, verse]) => verse.text)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return paragraphs.length > 0 ? paragraphs.join('\n\n') : fallbackSummary
}

export function buildSurahDocuments({
  surahs,
  quranData,
}: {
  surahs: SurahMeta[]
  quranData?: Record<string, QuranVerse>
}): SanityBookSectionDocument[] {
  return surahs
    .filter((surah) => surah.id >= 2 && surah.id <= 114)
    .sort((a, b) => b.id - a.id)
    .map((surah) => {
      const volumeNumber = getVolumeNumberForSurah(surah.id)
      const content = getSeedContentForSurah(quranData, surah.id, surah.description)
      const displayOrder = 115 - surah.id

      return {
        _id: `chapter-${surah.id}`,
        _type: 'bookSection',
        title: `${surah.id}. ${surah.nameMal}`,
        titleMal: surah.nameMal,
        titleEng: surah.name,
        malayalamName: surah.nameMal,
        englishName: surah.name,
        arabicName: surah.arabicName,
        translation: surah.translation,
        translationEng: surah.translationEng,
        revelation: surah.revelation,
        revelationMal: surah.revelationMal,
        versesCount: surah.versesCount,
        summary: surah.description,
        content,
        body: content,
        slug: {_type: 'slug', current: `surah-${surah.id}-${slugify(surah.name)}`},
        category: 'quran',
        sectionType: 'surah',
        surahNumber: surah.id,
        chapterNumber: surah.id,
        volumeNumber,
        volumeTitle: getVolumeTitleForSurah(surah.id),
        displayOrder,
        sortOrder: displayOrder,
        published: true,
      }
    })
}

export function getSanitySurahNumber(document: Partial<SanityBookSectionDocument>): number | null {
  const value = document.surahNumber ?? document.chapterNumber
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function getSanitySurahText(document: Partial<SanityBookSectionDocument> | undefined): string[] {
  if (!document) {
    return []
  }

  const rawText = document.content || document.body || document.summary || ''
  return rawText
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}
