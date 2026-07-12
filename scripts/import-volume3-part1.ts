import * as dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';

dotenv.config();

const projectId = process.env.VITE_SANITY_PROJECT_ID || 'lgqos9pf';
const dataset = process.env.VITE_SANITY_DATASET || 'production';
const apiVersion = process.env.VITE_SANITY_API_VERSION || '2025-07-01';
const token = process.env.SANITY_API_TOKEN;

if (!token) {
  console.error('Missing SANITY_API_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const INPUT_PATH = '.hermes/desktop-attachments/Volume 3 part - 1-3.txt';
const TARGET_CHAPTERS = Array.from({ length: 11 }, (_, i) => 40 - i); // 40..30

function extractChapterChunks(text: string): Map<number, string> {
  const map = new Map<number, string>();
  const headerRegex = /^അദ്ധ്യായം\s+(\d+)\s*$/gm;
  const matches = [...text.matchAll(headerRegex)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const chapter = Number(m[1]);
    const start = m.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const chunk = text.slice(start, end);
    map.set(chapter, chunk);
  }

  return map;
}

async function run() {
  const raw = readFileSync(INPUT_PATH, 'utf8').replace(/^\uFEFF/, '');
  const chapterChunks = extractChapterChunks(raw);

  const missing = TARGET_CHAPTERS.filter((n) => !chapterChunks.has(n));
  if (missing.length > 0) {
    throw new Error(`Missing chapters in source file: ${missing.join(', ')}`);
  }

  console.log(`Project: ${projectId}`);
  console.log(`Dataset: ${dataset}`);
  console.log(`Input: ${INPUT_PATH}`);
  console.log(`Uploading chapters: ${TARGET_CHAPTERS.join(', ')}`);

  let tx = client.transaction();
  for (const chapter of TARGET_CHAPTERS) {
    const chunk = chapterChunks.get(chapter)!;
    tx = tx.patch(`chapter-${chapter}`, {
      set: {
        content: chunk,
        body: chunk,
      },
    });
  }

  await tx.commit({ autoGenerateArrayKeys: true });

  const docs = await client.fetch(
    `*[_type == "bookSection" && _id in $ids]{_id, content, body}`,
    { ids: TARGET_CHAPTERS.map((n) => `chapter-${n}`) },
  );

  const byId = new Map<string, { _id: string; content?: string; body?: string }>(
    docs.map((d: { _id: string; content?: string; body?: string }) => [d._id, d]),
  );

  for (const chapter of TARGET_CHAPTERS) {
    const id = `chapter-${chapter}`;
    const expected = chapterChunks.get(chapter)!;
    const doc = byId.get(id);
    if (!doc) {
      throw new Error(`Verification failed: ${id} not found after update.`);
    }
    if (doc.content !== expected || doc.body !== expected) {
      throw new Error(`Verification failed: ${id} content/body mismatch.`);
    }
    console.log(`✓ ${id} uploaded (${expected.length} chars)`);
  }

  console.log('Done: Volume 3 Part 1 chapters 40..30 uploaded and verified.');
}

run().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
