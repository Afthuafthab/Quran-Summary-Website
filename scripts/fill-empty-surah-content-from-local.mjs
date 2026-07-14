import {getCliClient} from 'sanity/cli'
import {readFile} from 'node:fs/promises'

const client = getCliClient({apiVersion: '2025-07-01'})

const pmdRaw = await readFile('../src/data/pmd_converted_content.json', 'utf8')
const pmdData = JSON.parse(pmdRaw)

const volume2Ts = await readFile('../src/data/volume2.ts', 'utf8')
const eqIndex = volume2Ts.indexOf('=')
const endIndex = volume2Ts.lastIndexOf('};')
if (eqIndex === -1 || endIndex === -1) {
  throw new Error('Failed to parse volume2.ts payload')
}
const objLiteral = volume2Ts.slice(eqIndex + 1, endIndex + 1).trim()
const volume2Data = Function(`"use strict"; return (${objLiteral});`)()

const quranData = {...pmdData, ...volume2Data}

const chapterRegex = /^(?:അധ്യായം|അദ്ധ്യായം)\s*(\d+)\b.*$/

function gatherChapterText(chapterNumber) {
  const blocks = []

  for (const [key, verse] of Object.entries(quranData)) {
    if (!verse || typeof verse !== 'object') continue

    let isMatch = false
    if (Number(verse.surah) === chapterNumber) {
      isMatch = true
    } else if (typeof verse.context_chapter === 'string') {
      const m = verse.context_chapter.trim().match(chapterRegex)
      if (m && Number(m[1]) === chapterNumber) {
        isMatch = true
      }
    }

    if (!isMatch) continue

    const textParts = Array.isArray(verse.text) ? verse.text : []
    const cleaned = textParts
      .map((t) => String(t ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    if (!cleaned.length) continue

    blocks.push({
      key,
      body: cleaned.join('\n\n'),
    })
  }

  blocks.sort((a, b) => {
    const [as, aa] = String(a.key).split(':').map(Number)
    const [bs, ba] = String(b.key).split(':').map(Number)
    if (as !== bs) return as - bs
    return aa - ba
  })

  const chapterText = blocks.map((b) => b.body).join('\n\n').trim()
  return chapterText
}

const surahDocs = await client.fetch(`
  *[_type == "bookSection" && sectionType == "surah" && coalesce(surahNumber, chapterNumber) >= 2 && coalesce(surahNumber, chapterNumber) <= 114]{
    _id,
    "num": coalesce(surahNumber, chapterNumber),
    "contentLen": length(coalesce(content, "")),
    "bodyLen": length(coalesce(body, ""))
  }
`)

const empties = surahDocs.filter((d) => Math.max(Number(d.contentLen || 0), Number(d.bodyLen || 0)) === 0)
const missingLocal = []
const updates = []

for (const doc of empties) {
  const n = Number(doc.num)
  const text = gatherChapterText(n)
  if (!text) {
    missingLocal.push(n)
    continue
  }
  updates.push({id: doc._id, n, text})
}

const BATCH_SIZE = 8
for (let i = 0; i < updates.length; i += BATCH_SIZE) {
  const batch = updates.slice(i, i + BATCH_SIZE)
  let tx = client.transaction()
  for (const item of batch) {
    tx = tx.patch(item.id, {
      set: {
        content: item.text,
        body: item.text,
      },
    })
  }
  await tx.commit()
  console.log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} docs)`)
}

console.log(JSON.stringify({
  emptyDocsBefore: empties.length,
  patchedDocs: updates.length,
  missingLocal: [...new Set(missingLocal)].sort((a, b) => a - b),
}, null, 2))
