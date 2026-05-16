#!/usr/bin/env node
/**
 * validate_listening.mjs
 * ─────────────────────────────────────────────────────────────
 * Validates listeningData.js to catch authoring errors before
 * they reach production.
 *
 * Checks performed:
 *  1. Every song has required fields (id, title, artist, audioSrc, lyrics).
 *  2. Every lyric line has startTime < endTime.
 *  3. Placeholder count in `text` matches `answers` array length.
 *  4. No duplicate song IDs.
 *  5. Timestamps are monotonically increasing (no overlap).
 *
 * Usage:
 *   node validate_listening.mjs
 *   → exits 0 on success, 1 on any error
 *
 * Add to package.json scripts:
 *   "validate": "node validate_listening.mjs"
 */

import { listeningData } from './listeningData.js';

const PLACEHOLDER_RE = /\[.*?\]/g;

let errors   = 0;
let warnings = 0;

function err(msg)  { console.error(`  ❌ ERROR   ${msg}`); errors++; }
function warn(msg) { console.warn( `  ⚠️  WARN    ${msg}`); warnings++; }
function ok(msg)   { console.log(  `  ✅ OK      ${msg}`); }

// ── 1. Top-level array ────────────────────────────────────────
if (!Array.isArray(listeningData) || listeningData.length === 0) {
  err('listeningData is empty or not an array.');
  process.exit(1);
}

const seenIds = new Set();

for (const song of listeningData) {
  console.log(`\n📀 Song: "${song.id ?? '(no id)'}"  —  ${song.title ?? '(no title)'}`);

  // ── 2. Required top-level fields ─────────────────────────────
  for (const field of ['id', 'title', 'artist', 'audioSrc', 'lyrics']) {
    if (!song[field]) err(`Missing required field: ${field}`);
  }

  // ── 3. Duplicate ID check ────────────────────────────────────
  if (seenIds.has(song.id)) {
    err(`Duplicate song id: "${song.id}"`);
  } else {
    seenIds.add(song.id);
  }

  if (!Array.isArray(song.lyrics)) {
    err('lyrics must be an array — skipping line checks for this song.');
    continue;
  }

  let prevEnd = -Infinity;

  song.lyrics.forEach((line, idx) => {
    const prefix = `Line ${idx + 1}`;

    // ── 4. Required line fields ───────────────────────────────
    if (typeof line.startTime !== 'number') err(`${prefix}: startTime must be a number`);
    if (typeof line.endTime   !== 'number') err(`${prefix}: endTime must be a number`);
    if (typeof line.text      !== 'string') err(`${prefix}: text must be a string`);
    if (!Array.isArray(line.answers))       err(`${prefix}: answers must be an array`);

    // ── 5. startTime < endTime ────────────────────────────────
    if (line.startTime >= line.endTime) {
      err(`${prefix}: startTime (${line.startTime}) must be < endTime (${line.endTime})`);
    }

    // ── 6. No overlap with previous line ─────────────────────
    if (line.startTime < prevEnd) {
      warn(`${prefix}: startTime (${line.startTime}) overlaps previous endTime (${prevEnd})`);
    }
    prevEnd = line.endTime ?? prevEnd;

    // ── 7. Placeholder ↔ answers count ───────────────────────
    const placeholders = (line.text.match(PLACEHOLDER_RE) || []).length;
    const answerCount  = Array.isArray(line.answers) ? line.answers.length : 0;

    if (placeholders !== answerCount) {
      err(`${prefix}: ${placeholders} placeholder(s) in text but ${answerCount} answer(s). ` +
          `text="${line.text}"`);
    }

    // ── 8. Non-empty answers ──────────────────────────────────
    if (Array.isArray(line.answers)) {
      line.answers.forEach((a, ai) => {
        if (typeof a !== 'string' || a.trim() === '') {
          err(`${prefix}: answers[${ai}] is empty or not a string`);
        }
      });
    }
  });

  // Summary per song
  ok(`${song.lyrics.length} lyric lines validated for "${song.id}"`);
}

// ── Final report ─────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('🎉 All checks passed! No errors, no warnings.\n');
  process.exit(0);
} else {
  console.log(`Result: ${errors} error(s), ${warnings} warning(s)\n`);
  if (errors > 0) {
    console.error('Build FAILED — fix errors above before deploying.\n');
    process.exit(1);
  } else {
    console.warn('Build OK with warnings.\n');
    process.exit(0);
  }
}
