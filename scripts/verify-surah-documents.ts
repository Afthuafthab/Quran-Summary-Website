import * as assert from 'node:assert/strict';

import { allSurahs } from '../src/data/all_surahs';
import { quranData } from '../src/data/pmd_converted_content';
import { volume2Data } from '../src/data/volume2';
import {
  buildSurahDocuments,
  getVolumeNumberForSurah,
  SURAH_VOLUME_COUNTS,
} from '../src/lib/surahDocuments';

const docs = buildSurahDocuments({
  surahs: allSurahs,
  quranData: {...quranData, ...volume2Data},
});

assert.equal(docs.length, 113, 'Sanity seed should create documents for Surahs 114 down to 2 only');
assert.equal(docs[0].surahNumber, 114, 'first generated document should be Surah 114');
assert.equal(docs.at(-1)?.surahNumber, 2, 'last generated document should be Surah 2');

const ids = docs.map((doc) => doc._id);
assert.equal(new Set(ids).size, ids.length, 'each generated Sanity document must have a stable unique _id');
assert.equal(ids[0], 'chapter-114');
assert.equal(ids.at(-1), 'chapter-2');

for (const doc of docs) {
  assert.equal(doc._type, 'bookSection');
  assert.equal(doc.sectionType, 'surah');
  assert.equal(doc.published, true);
  assert.ok(doc.title, `Surah ${doc.surahNumber} should have a title`);
  assert.ok(doc.malayalamName, `Surah ${doc.surahNumber} should have a Malayalam name`);
  assert.ok(doc.englishName, `Surah ${doc.surahNumber} should have an English name`);
  assert.ok(doc.summary, `Surah ${doc.surahNumber} should have an editable summary`);
  assert.ok(doc.content, `Surah ${doc.surahNumber} should have initial editable content`);
  assert.equal(doc.volumeNumber, getVolumeNumberForSurah(doc.surahNumber));
}

assert.deepEqual(
  docs.reduce<Record<number, number>>((counts, doc) => {
    counts[doc.volumeNumber] = (counts[doc.volumeNumber] ?? 0) + 1;
    return counts;
  }, {}),
  SURAH_VOLUME_COUNTS,
  'generated documents must match the required volume split',
);

const bySurah = new Map(docs.map((doc) => [doc.surahNumber, doc]));
assert.equal(bySurah.get(114)?.volumeNumber, 2);
assert.equal(bySurah.get(41)?.volumeNumber, 2);
assert.equal(bySurah.get(40)?.volumeNumber, 3);
assert.equal(bySurah.get(20)?.volumeNumber, 3);
assert.equal(bySurah.get(19)?.volumeNumber, 4);
assert.equal(bySurah.get(7)?.volumeNumber, 4);
assert.equal(bySurah.get(6)?.volumeNumber, 5);
assert.equal(bySurah.get(2)?.volumeNumber, 5);

console.log(`Verified ${docs.length} generated Surah documents across volumes 2-5.`);
