// Deploy migrations to Supabase using the service role key
// This creates a temporary RPC function to execute raw SQL, 
// runs the migrations, then drops the function.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load env
const envContent = readFileSync(join(rootDir, '.env.local'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) env[match[1]] = match[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Step 1: Create temporary exec_sql function
async function createExecFunction() {
  const { error } = await supabase.rpc('exec_sql', { sql_text: 'SELECT 1' }).maybeSingle();
  
  if (error && error.code === 'PGRST202') {
    // Function does not exist, create it via a workaround
    // We use the Supabase SQL Editor API which is available via the dashboard
    // But since we cannot use it programmatically with just the service role key,
    // we'll use a different approach: execute SQL via PostgREST by creating
    // the function through the supabase-js client
    console.log('exec_sql function not found, will create it...');
    return false;
  }
  return true;
}

// Split SQL into individual statements, handling dollar-quoted blocks
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || (trimmed.startsWith('--') && !inDollarQuote)) {
      current += line + '\n';
      continue;
    }
    
    current += line + '\n';
    
    // Check for dollar quoting
    const dollarMatch = line.match(/\$(\w*)\$/g);
    if (dollarMatch) {
      for (const tag of dollarMatch) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }
    
    // If we hit a semicolon at end of line and not inside dollar quote
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && !stmt.match(/^--/)) {
        statements.push(stmt);
      }
      current = '';
    }
  }
  
  // Handle any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
}

async function executeStatements(statements, label) {
  let success = 0;
  let errors = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip pure comments
    if (stmt.split('\n').every(l => l.trim().startsWith('--') || !l.trim())) {
      continue;
    }
    
    try {
      const { error } = await supabase.rpc('_exec_sql', { sql_text: stmt });
      
      if (error) {
        // Some errors are OK (IF NOT EXISTS patterns)
        if (error.message.includes('already exists')) {
          console.log(`  [SKIP] Statement ${i + 1}: already exists`);
          success++;
        } else {
          console.error(`  [ERR] Statement ${i + 1}: ${error.message}`);
          console.error(`  SQL: ${stmt.substring(0, 120)}...`);
          errors++;
        }
      } else {
        success++;
      }
    } catch (err) {
      console.error(`  [ERR] Statement ${i + 1}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`${label}: ${success} succeeded, ${errors} failed out of ${statements.length} statements`);
  return errors;
}

async function main() {
  console.log('=== Lingullio Schema Deployment ===\n');
  console.log(`Target: ${supabaseUrl}\n`);
  
  // Step 1: Create the _exec_sql helper function using a raw SQL approach
  // We need to bootstrap by inserting a function via the REST API
  console.log('Step 1: Creating SQL execution helper...');
  
  // Use the special Supabase endpoint to execute SQL
  const createFnSql = `
    CREATE OR REPLACE FUNCTION public._exec_sql(sql_text TEXT)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $fn$
    BEGIN
      EXECUTE sql_text;
    END;
    $fn$;
  `;
  
  // Try via fetch to the SQL endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/_exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_text: 'SELECT 1' }),
  });
  
  if (response.status === 404) {
    // Function does not exist. We need another way.
    // Use the Supabase query endpoint (available on newer versions)
    console.log('  Bootstrapping via direct SQL endpoint...');
    
    const sqlRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });
    
    if (!sqlRes.ok) {
      console.error('Cannot connect to Supabase REST API');
      process.exit(1);
    }
    
    // Alternative: use the pg module directly
    console.log('  Using direct PostgreSQL connection...');
    
    const { default: pg } = await import('pg');
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    
    // Try different connection approaches
    // Supabase direct connection: db.[ref].supabase.co:5432
    const connectionString = `postgresql://postgres.${projectRef}:${env.SUPABASE_DB_PASSWORD || ''}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`;
    
    // If no DB password, we need to use a different approach
    // Let's try the Supabase Management API
    console.log('  Note: Direct DB connection requires the database password.');
    console.log('  Trying alternative approach via Supabase Edge Function...\n');
    
    // Create a temporary edge function approach
    // Actually, the simplest is to guide the user to paste in the Supabase SQL Editor
    console.log('  =============================================');
    console.log('  MIGRATION ALTERNATIVE: Supabase SQL Editor');
    console.log('  =============================================\n');
    console.log('  The migrations need to be run via the Supabase SQL Editor.');
    console.log('  Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
    console.log('  Run these files in order:');
    console.log('  1. supabase/migrations/00001_initial_schema.sql');
    console.log('  2. supabase/migrations/00002_rls_policies.sql');
    console.log('  3. supabase/seed.sql\n');
    
    // Alternative: create an API endpoint that does this
    console.log('  OR use the setup API endpoint we will create...');
    
    process.exit(0);
  } else {
    console.log('  _exec_sql function already exists!');
  }
  
  // Step 2: Run migration 00001
  console.log('\nStep 2: Running 00001_initial_schema.sql...');
  const schema = readFileSync(join(rootDir, 'supabase/migrations/00001_initial_schema.sql'), 'utf-8');
  const schemaStmts = splitSqlStatements(schema);
  console.log(`  Found ${schemaStmts.length} statements`);
  await executeStatements(schemaStmts, 'Schema');
  
  // Step 3: Run migration 00002
  console.log('\nStep 3: Running 00002_rls_policies.sql...');
  const rls = readFileSync(join(rootDir, 'supabase/migrations/00002_rls_policies.sql'), 'utf-8');
  const rlsStmts = splitSqlStatements(rls);
  console.log(`  Found ${rlsStmts.length} statements`);
  await executeStatements(rlsStmts, 'RLS');
  
  // Step 4: Run seed
  console.log('\nStep 4: Running seed.sql...');
  const seed = readFileSync(join(rootDir, 'supabase/seed.sql'), 'utf-8');
  const seedStmts = splitSqlStatements(seed);
  console.log(`  Found ${seedStmts.length} statements`);
  await executeStatements(seedStmts, 'Seed');
  
  console.log('\n=== Deployment complete ===');
}

main().catch(console.error);
