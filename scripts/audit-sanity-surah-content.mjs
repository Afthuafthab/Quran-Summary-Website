import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-07-01'})

const docs = await client.fetch(`
  *[_type == "bookSection" && sectionType == "surah"]{
    _id,
    title,
    titleMal,
    chapterNumber,
    surahNumber,
    "num": coalesce(surahNumber, chapterNumber),
    "contentLen": length(coalesce(content, "")),
    "bodyLen": length(coalesce(body, ""))
  }
`)

const byNum = new Map()
for (const d of docs) {
  const n = Number(d.num)
  if (!Number.isFinite(n)) continue
  byNum.set(n, d)
}

const missing = []
const empty = []
for (let n = 2; n <= 114; n++) {
  const d = byNum.get(n)
  if (!d) {
    missing.push(n)
    continue
  }
  const len = Math.max(d.contentLen || 0, d.bodyLen || 0)
  if (len === 0) empty.push(n)
}

const smallest20 = [...byNum.entries()]
  .map(([n, d]) => ({n, id: d._id, title: d.titleMal || d.title || '', len: Math.max(d.contentLen || 0, d.bodyLen || 0)}))
  .sort((a,b) => a.len - b.len)
  .slice(0, 20)

const chapter21 = byNum.get(21)

console.log(JSON.stringify({
  totalSurahDocs: docs.length,
  missing,
  empty,
  chapter21: chapter21 ? {
    id: chapter21._id,
    len: Math.max(chapter21.contentLen || 0, chapter21.bodyLen || 0),
    contentLen: chapter21.contentLen,
    bodyLen: chapter21.bodyLen,
    title: chapter21.titleMal || chapter21.title || null,
  } : null,
  smallest20
}, null, 2))
