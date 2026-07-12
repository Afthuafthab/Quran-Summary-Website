import {getCliClient} from 'sanity/cli'

const TARGET_CHAPTERS = Array.from({length: 11}, (_, i) => 30 - i) // 30..20

const replacements = [
  ['ഉപജീവനValues', 'ഉപജീവനവിഭവങ്ങൾ'],
  [' Following divine instruction remains a persistent path for all followers.', ' ദൈവിക നിർദേശങ്ങൾ പിന്തുടരുന്നത് സത്യവിശ്വാസികൾക്കുള്ള സ്ഥിരമായ മാർഗമാണ്.'],
  ['মানুষকে', 'മനുഷ്യനെ'],
  ['താനuദ്ദേശിക്കുന്നത്', 'താനുദ്ദേശിക്കുന്നത്'],
  ['ദൈവാനuഗ്രഹത്താൽ', 'ദൈവാനുഗ്രഹത്താൽ'],
  ['ദൈവപരിшуദ്ധി', 'ദൈവപരിശുദ്ധി'],
  ['കഴിവуറ്റവനത്രെ.', 'കഴിവുറ്റവനത്രെ.'],
  ['ഭвиഷ്യത്ത്', 'ഭവിഷ്യത്ത്'],
  ['ഭвиഷ്യത്തുകള്‍ക്കും', 'ഭവിഷ്യത്തുകള്‍ക്കും'],
  ['നേര്‍марഗം', 'നേര്‍മാര്‍ഗം'],
  ['ശриയായി', 'ശരിയായി'],
  ['കഴിഞ്ഞu.', 'കഴിഞ്ഞു.'],
  ['അറേബ്യн', 'അറേബ്യൻ'],
]

function applyReplacements(text) {
  let output = text
  let touched = false

  for (const [from, to] of replacements) {
    if (output.includes(from)) {
      output = output.split(from).join(to)
      touched = true
    }
  }

  return {output, touched}
}

async function main() {
  const client = getCliClient({apiVersion: '2025-07-01'})
  const ids = TARGET_CHAPTERS.map((n) => `chapter-${n}`)

  const docs = await client.fetch('*[_id in $ids]{_id, content, body}', {ids})
  const byId = new Map(docs.map((d) => [d._id, d]))

  let tx = client.transaction()
  let changedCount = 0

  for (const chapter of TARGET_CHAPTERS) {
    const id = `chapter-${chapter}`
    const doc = byId.get(id)
    if (!doc) throw new Error(`Missing ${id}`)

    const content = doc.content || ''
    const body = doc.body || ''

    const contentFix = applyReplacements(content)
    const bodyFix = applyReplacements(body)

    if (contentFix.touched || bodyFix.touched) {
      changedCount++
      tx = tx.patch(id, {
        set: {
          content: contentFix.output,
          body: bodyFix.output,
        },
      })
      console.log(`~ ${id} corrected`) 
    }
  }

  if (changedCount === 0) {
    console.log('No known encoding/typo artifacts found in chapters 30..20.')
    return
  }

  await tx.commit({autoGenerateArrayKeys: true})

  const verify = await client.fetch('*[_id in $ids]{_id, content, body}', {ids})
  for (const d of verify) {
    for (const [from] of replacements) {
      if ((d.content || '').includes(from) || (d.body || '').includes(from)) {
        throw new Error(`Replacement artifact still present in ${d._id}: ${from}`)
      }
    }
  }

  console.log(`Done: corrected Malayalam/encoding artifacts in ${changedCount} chapter docs (30..20).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
