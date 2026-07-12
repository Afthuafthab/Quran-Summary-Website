import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {allSurahs} from '../src/data/all_surahs';
import {quranData} from '../src/data/pmd_converted_content';
import {volume2Data} from '../src/data/volume2';
import {buildSurahDocuments, SURAH_VOLUME_COUNTS} from '../src/lib/surahDocuments';

const outputPath = resolve(process.argv[2] || 'generated/sanity-surahs.ndjson');
const docs = buildSurahDocuments({
  surahs: allSurahs,
  quranData: {...quranData, ...volume2Data},
});

mkdirSync(dirname(outputPath), {recursive: true});
writeFileSync(outputPath, `${docs.map((doc) => JSON.stringify(doc)).join('\n')}\n`, 'utf8');

console.log(`Wrote ${docs.length} Surah documents to ${outputPath}`);
console.log(`Volume split: ${JSON.stringify(SURAH_VOLUME_COUNTS)}`);
console.log(`First: ${docs[0]._id} (${docs[0].title})`);
console.log(`Last: ${docs.at(-1)?._id} (${docs.at(-1)?.title})`);
