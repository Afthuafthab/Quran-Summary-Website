import * as dotenv from 'dotenv';
import { createClient } from '@sanity/client';

import { allSurahs } from '../src/data/all_surahs';
import { quranData } from '../src/data/pmd_converted_content';
import { volume2Data } from '../src/data/volume2';
import { buildSurahDocuments, SURAH_VOLUME_COUNTS } from '../src/lib/surahDocuments';

dotenv.config();

const projectId = process.env.VITE_SANITY_PROJECT_ID || 'lgqos9pf';
const dataset = process.env.VITE_SANITY_DATASET || 'production';
const apiVersion = process.env.VITE_SANITY_API_VERSION || '2025-07-01';
const token = process.env.SANITY_API_TOKEN;
const dryRun = process.argv.includes('--dry-run');

if (!token && !dryRun) {
  console.error('Missing SANITY_API_TOKEN. Create one in Sanity Manage > API > Tokens with Editor permission.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const docs = buildSurahDocuments({
  surahs: allSurahs,
  quranData: {...quranData, ...volume2Data},
});

function printPlan() {
  console.log(`Project: ${projectId}`);
  console.log(`Dataset: ${dataset}`);
  console.log(`Documents to create/update: ${docs.length}`);
  console.log(`Volume split: ${JSON.stringify(SURAH_VOLUME_COUNTS)}`);
  console.log(`First document: ${docs[0]._id} (${docs[0].title})`);
  console.log(`Last document: ${docs.at(-1)?._id} (${docs.at(-1)?.title})`);
}

async function importSurahs() {
  printPlan();

  if (dryRun) {
    console.log('Dry run only. No Sanity documents were changed.');
    return;
  }

  for (const doc of docs) {
    await client.createOrReplace(doc);
    console.log(`Upserted ${doc._id} (${doc.volumeTitle})`);
  }

  const importedCount = await client.fetch(
    'count(*[_type == "bookSection" && sectionType == "surah" && coalesce(surahNumber, chapterNumber) >= 2 && coalesce(surahNumber, chapterNumber) <= 114])',
  );

  console.log(`Imported ${docs.length} Surah documents into Sanity.`);
  console.log(`Sanity now reports ${importedCount} Surah documents for volumes 2-5.`);
}

importSurahs().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
