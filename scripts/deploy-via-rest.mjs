#!/usr/bin/env node

// Deploy schema to Supabase via the Management API
// Uses the database password to connect directly via pg

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load .env.local
const envContent = readFileSync(join(rootDir, '.env.local'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

console.log(`Project: ${projectRef}`);
console.log(`URL: ${supabaseUrl}\n`);

// Read SQL files
const files = [
  { name: '00001_initial_schema.sql', path: 'supabase/migrations/00001_initial_schema.sql' },
  { name: '00002_rls_policies.sql', path: 'supabase/migrations/00002_rls_policies.sql' },
  { name: 'seed.sql', path: 'supabase/seed.sql' },
];

async function executeSqlViaFetch(sql, label) {
  // Use the Supabase SQL API endpoint (requires Management API token)
  // Since we only have service_role key, we use the PostgREST approach:
  // First create an exec function, then use it
  
  console.log(`Executing ${label}...`);
  
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/_lingullio_exec`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ sql_text: sql }),
  });
  
  if (res.ok) {
    console.log(`  OK: ${label}`);
    return true;
  }
  
  const body = await res.text();
  console.error(`  ERROR (${res.status}): ${body.substring(0, 300)}`);
  return false;
}

async function bootstrap() {
  // Create the exec function using a minimal approach
  // We can create it via a "SELECT" trick through PostgREST
  console.log('Bootstrapping exec function...');
  
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION public._lingullio_exec(sql_text text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      EXECUTE sql_text;
    END;
    $body$;
  `;
  
  // Can't create functions via REST API directly without already having one...
  // We need to check if it exists first
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/rpc/_lingullio_exec`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_text: 'SELECT 1;' }),
  });
  
  if (checkRes.status === 404) {
    console.log('');
    console.log('===========================================================');
    console.log('  ACTION REQUISE: Creez la fonction de deploiement');
    console.log('===========================================================');
    console.log('');
    console.log('Ouvrez le SQL Editor Supabase:');
    console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log('');
    console.log('Collez et executez ce SQL:');
    console.log('');
    console.log(createFnSQL);
    console.log('');
    console.log('Puis relancez ce script.');
    console.log('===========================================================');
    return false;
  }
  
  if (checkRes.ok || checkRes.status === 204) {
    console.log('  Exec function already exists.');
    return true;
  }
  
  const body = await checkRes.text();
  console.log(`  Response (${checkRes.status}): ${body.substring(0, 200)}`);
  return checkRes.ok;
}

async function main() {
  console.log('=== Lingullio Schema Deployment ===\n');
  
  const ready = await bootstrap();
  if (!ready) return;
  
  for (const file of files) {
    const sql = readFileSync(join(rootDir, file.path), 'utf-8');
    const ok = await executeSqlViaFetch(sql, file.name);
    if (!ok) {
      console.error(`\nFailed at ${file.name}. Fix the error and rerun.`);
      return;
    }
  }
  
  // Cleanup: drop the exec function
  console.log('\nCleaning up exec function...');
  await executeSqlViaFetch('DROP FUNCTION IF EXISTS public._lingullio_exec(text);', 'cleanup');
  
  // Verify
  console.log('\nVerifying...');
  const verifyRes = await fetch(`${supabaseUrl}/rest/v1/courses?select=id,slug&limit=5`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  
  if (verifyRes.ok) {
    const data = await verifyRes.json();
    console.log(`  Found ${data.length} courses: ${data.map(c => c.slug).join(', ')}`);
  }
  
  console.log('\n=== Deployment complete ===');
}

main().catch(console.error);
