import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-07-01'})

const NON_ML_BLOCKS = [
  {name: 'Devanagari', re: /[\u0900-\u097F]/g},
  {name: 'Bengali', re: /[\u0980-\u09FF]/g},
  {name: 'Gurmukhi', re: /[\u0A00-\u0A7F]/g},
  {name: 'Gujarati', re: /[\u0A80-\u0AFF]/g},
  {name: 'Oriya', re: /[\u0B00-\u0B7F]/g},
  {name: 'Tamil', re: /[\u0B80-\u0BFF]/g},
  {name: 'Telugu', re: /[\u0C00-\u0C7F]/g},
  {name: 'Kannada', re: /[\u0C80-\u0CFF]/g},
]

function collectMatches(text, re) {
  const out = []
  for (const m of text.matchAll(re)) out.push({idx: m.index ?? 0, ch: m[0]})
  return out
}

function lineAt(text, idx) {
  const start = text.lastIndexOf('\n', idx)
  const end = text.indexOf('\n', idx)
  return text.slice(start + 1, end === -1 ? undefined : end).trim()
}

async function main() {
  const docs = await client.fetch(`*[_type == "chapter"]{_id, chapterNumber, content}`)
  const findings = []

  for (const d of docs) {
    const text = String(d.content || '')
    if (!text) continue

    for (const block of NON_ML_BLOCKS) {
      const m = collectMatches(text, block.re)
      if (!m.length) continue
      findings.push({
        id: d._id,
        chapter: d.chapterNumber,
        block: block.name,
        count: m.length,
        sampleLine: lineAt(text, m[0].idx),
      })
    }
  }

  findings.sort((a,b)=> (a.chapter - b.chapter) || a.block.localeCompare(b.block))
  if (!findings.length) {
    console.log('No non-Malayalam Indic script characters found in chapter content.')
    return
  }

  console.log(`Found ${findings.length} chapter/block findings:`)
  for (const f of findings) {
    console.log(`${f.id} (chapter ${f.chapter}) [${f.block}] count=${f.count}`)
    console.log(`  sample: ${f.sampleLine}`)
  }
}

main().catch((e)=>{
  console.error(e)
  process.exit(1)
})
