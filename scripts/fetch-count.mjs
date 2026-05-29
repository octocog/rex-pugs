// Fetches the pug count from the published Google Sheet CSV and writes it into
// src/data/pugs.json. Runs at build time (locally + in the hourly GitHub Action).
// On any failure it leaves the existing committed value untouched so the build
// never breaks and the site always shows the last-known-good count.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../src/data/pugs.json', import.meta.url));
const url = (process.env.SHEET_CSV_URL || '').trim();

if (!url) {
  console.log('[fetch-count] No SHEET_CSV_URL set — keeping committed count.');
  process.exit(0);
}

try {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const match = text.match(/-?\d+(?:\.\d+)?/); // first number = cell A1
  if (!match) throw new Error(`no number found in CSV: ${JSON.stringify(text.slice(0, 60))}`);

  const count = Math.max(0, Math.round(Number(match[0])));
  const data = { count, checkedAt: new Date().toISOString() };
  writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`[fetch-count] Pug count = ${count}`);
} catch (err) {
  const current = JSON.parse(readFileSync(OUT, 'utf8'));
  console.error(`[fetch-count] Fetch failed (${err.message}); keeping count = ${current.count}`);
  process.exit(0); // don't fail the build
}
