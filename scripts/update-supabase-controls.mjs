#!/usr/bin/env node
/**
 * Updates game_controls in the Supabase game_templates table
 * for all templates from index.json.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, '..', 'templates', 'index.json');

// Read Supabase creds from quizgames/.env.local
const envPath = join(__dirname, '..', '..', 'quizhp', 'quizgames', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

// Use direct Supabase URL (the custom domain CNAME doesn't proxy REST API)
const SUPABASE_URL = 'https://aymoxdcqkjtaqmgvwxzc.supabase.co';
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY');
  process.exit(1);
}

const data = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));

let updated = 0;
let notFound = 0;
let errors = 0;

// Process in batches of 10
const BATCH_SIZE = 10;

for (let i = 0; i < data.templates.length; i += BATCH_SIZE) {
  const batch = data.templates.slice(i, i + BATCH_SIZE);

  const results = await Promise.all(batch.map(async (template) => {
    const { name, controls } = template;

    // Use Supabase REST API to update
    const url = `${SUPABASE_URL}/rest/v1/game_templates?name=eq.${encodeURIComponent(name)}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ game_controls: controls }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`  ERROR updating "${name}": ${res.status} ${text}`);
        return 'error';
      }

      const result = await res.json();
      if (result.length === 0) {
        return 'notfound';
      }
      return 'updated';
    } catch (err) {
      console.error(`  FETCH ERROR for "${name}":`, err.message);
      return 'error';
    }
  }));

  for (let j = 0; j < results.length; j++) {
    const status = results[j];
    const name = batch[j].name;
    if (status === 'updated') {
      updated++;
    } else if (status === 'notfound') {
      notFound++;
      console.log(`  NOT IN DB: "${name}"`);
    } else {
      errors++;
    }
  }

  process.stdout.write(`  Processed ${Math.min(i + BATCH_SIZE, data.templates.length)}/${data.templates.length}\r`);
}

console.log(`\n\n=== Supabase Update Results ===`);
console.log(`Updated: ${updated}`);
console.log(`Not found in DB: ${notFound}`);
console.log(`Errors: ${errors}`);
