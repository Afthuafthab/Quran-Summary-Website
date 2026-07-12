import {readFileSync} from 'node:fs'
import {getCliClient} from 'sanity/cli'

const INPUT_PATH = '../.hermes/desktop-attachments/Volume 5 part 1.txt'
const TARGET_CHAPTERS = Array.from({length: 2}, (_, i) => 6 - i) // 6..5

function extractChapterChunks(text) {
  const map = new Map()
  const headerRegex = /^അദ്ധ്യായം\s+(\d+)\b.*$/gm
  const matches = [...text.matchAll(headerRegex)]

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const chapter = Number(m[1])
    const start = m.index ?? 0
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length
    map.set(chapter, text.slice(start, end))
  }

  return map
}

async function main() {
  const text = readFileSync(INPUT_PATH, 'utf8').replace(/^\uFEFF/, '')
  const chunks = extractChapterChunks(text)

  const missing = TARGET_CHAPTERS.filter((n) => !chunks.has(n))
  if (missing.length) {
    throw new Error(`Missing chapters in source: ${missing.join(', ')}`)
  }

  const client = getCliClient({apiVersion: '2025-07-01'})

  let tx = client.transaction()
  for (const chapter of TARGET_CHAPTERS) {
    const chunk = chunks.get(chapter)
    tx = tx.patch(`chapter-${chapter}`, {
      set: {
        content: chunk,
        body: chunk,
      },
    })
  }

  await tx.commit({autoGenerateArrayKeys: true})

  const ids = TARGET_CHAPTERS.map((n) => `chapter-${n}`)
  const docs = await client.fetch('*[_id in $ids]{_id, content, body}', {ids})
  const byId = new Map(docs.map((d) => [d._id, d]))

  for (const chapter of TARGET_CHAPTERS) {
    const id = `chapter-${chapter}`
    const expected = chunks.get(chapter)
    const doc = byId.get(id)
    if (!doc) throw new Error(`Missing ${id} after upload`)
    if (doc.content !== expected || doc.body !== expected) {
      throw new Error(`Mismatch after upload for ${id}`)
    }
    console.log(`✓ ${id} uploaded (${expected.length} chars)`)
  }

  console.log('Done: uploaded chapters 6..5 from Volume 5 Part 1 and verified content/body.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
