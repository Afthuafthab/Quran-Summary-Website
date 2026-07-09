const fs = require('fs');
const path = require('path');

// 1. Read all_surahs.ts to get versesCount for each surah
const allSurahsContent = fs.readFileSync(path.join(__dirname, '../src/data/all_surahs.ts'), 'utf8');
const surahMetaMap = {};

// Use regex to parse allSurahs array
const surahRegex = /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",[^}]+versesCount:\s*(\d+)/g;
let match;
while ((match = surahRegex.exec(allSurahsContent)) !== null) {
  const id = parseInt(match[1], 10);
  const name = match[2];
  const versesCount = parseInt(match[3], 10);
  surahMetaMap[id] = { name, versesCount };
}

console.log(`Parsed metadata for ${Object.keys(surahMetaMap).length} surahs.`);

// 2. Read the 4 raw text parts of Volume 2
const part1 = fs.readFileSync('/tmp/volume2_raw_part1.txt', 'utf8');
const part2 = fs.readFileSync('/tmp/volume2_raw_part2.txt', 'utf8');
const part3 = fs.readFileSync('/tmp/volume2_raw_part3.txt', 'utf8');
const part4 = fs.readFileSync('/tmp/volume2_raw_part4.txt', 'utf8');

const fullContent = [part1, part2, part3, part4].join('\n');

// 3. Parse content into individual surahs
const lines = fullContent.split('\n');
const surahs = [];
let activeSurah = null;
let isFirstLineAfterChapter = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/^\uFEFF/, '').trim(); // Remove BOM and trim
  if (!line) continue;

  const chapterMatch = line.match(/^(അദ്ധ്യായം|അധ്യായം)\s+(\d+)/);
  if (chapterMatch) {
    if (activeSurah) {
      surahs.push(activeSurah);
    }
    const surahId = parseInt(chapterMatch[2], 10);
    activeSurah = {
      surah: surahId,
      context_chapter: line,
      name: '',
      text: []
    };
    isFirstLineAfterChapter = true;
  } else {
    if (activeSurah) {
      if (isFirstLineAfterChapter) {
        activeSurah.name = line;
        isFirstLineAfterChapter = false;
      } else {
        activeSurah.text.push(line);
      }
    }
  }
}
if (activeSurah) {
  surahs.push(activeSurah);
}

console.log(`Successfully parsed ${surahs.length} surahs.`);

// 4. Construct the volume2Data object
const volume2Data = {};

surahs.forEach(s => {
  const meta = surahMetaMap[s.surah];
  if (!meta) {
    console.warn(`WARNING: Metadata not found for surah ${s.surah}`);
  }
  const versesCount = meta ? meta.versesCount : 7; // Default fallback

  // Determine start_ayah and end_ayah
  // We default to 1 and versesCount respectively
  let start_ayah = 1;
  let end_ayah = versesCount;

  // Let's check if the first text line has a range prefix like "1-6." or "1-4."
  const firstTextLine = s.text.find(line => !line.startsWith('பரമകാരുണികനും') && !line.startsWith('പരമകാരുണികനായ'));
  if (firstTextLine) {
    const rangeMatch = firstTextLine.match(/^(\d+)-(\d+)\./);
    if (rangeMatch) {
      // Actually, since this is the entire text for the chapter, keeping start_ayah: 1 and end_ayah: versesCount
      // is much cleaner and more accurate for the overall chapter block representation.
      // But let's verify if there are any specific ranges we can extract.
      // Keeping start_ayah: 1 and end_ayah: versesCount matches the overall chapter view perfectly.
    }
  }

  const key = `${s.surah}:1`;
  const textArray = s.name ? [s.name, ...s.text] : s.text;
  volume2Data[key] = {
    surah: s.surah,
    start_ayah,
    end_ayah,
    context_chapter: s.context_chapter,
    text: textArray
  };
});

// 5. Generate /src/data/volume2.ts
const outputContent = `// Automatically generated Volume 2 Quran data
import { QuranVerse } from "./pmd_converted_content";

export const volume2Data: Record<string, QuranVerse> = ${JSON.stringify(volume2Data, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/volume2.ts'), outputContent, 'utf8');
console.log('Successfully wrote /src/data/volume2.ts!');
