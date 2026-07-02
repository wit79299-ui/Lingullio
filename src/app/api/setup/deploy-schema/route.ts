import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// POST /api/setup/deploy-schema
// Deploys the database schema, RLS policies, and seed data to Supabase
// This endpoint is meant to be called once during initial setup
export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Test connection first
    const { error: testError } = await supabase.from('users').select('id').limit(1);

    // If table doesn't exist, we need to create the schema
    const needsSchema = testError && testError.message.includes('does not exist');
    const alreadySetup = !testError;

    if (alreadySetup) {
      // Check if there's already data
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      return NextResponse.json({
        status: 'already_deployed',
        message: `Schema already exists. ${count || 0} users found.`,
        tables_exist: true,
        user_count: count || 0,
      });
    }

    if (!needsSchema) {
      return NextResponse.json({
        status: 'error',
        message: `Unexpected error: ${testError?.message}`,
      }, { status: 500 });
    }

    // Read SQL files
    const cwd = process.cwd();
    const schemaSQL = readFileSync(
      join(cwd, 'supabase/migrations/00001_initial_schema.sql'),
      'utf-8'
    );
    const rlsSQL = readFileSync(
      join(cwd, 'supabase/migrations/00002_rls_policies.sql'),
      'utf-8'
    );
    const seedSQL = readFileSync(
      join(cwd, 'supabase/seed.sql'),
      'utf-8'
    );

    const results: Array<{ step: string; status: string; error?: string }> = [];

    // Execute schema migration
    const { error: schemaError } = await supabase.rpc('exec_raw_sql', {
      sql_text: schemaSQL,
    });

    if (schemaError) {
      results.push({
        step: 'schema',
        status: 'error',
        error: schemaError.message,
      });
    } else {
      results.push({ step: 'schema', status: 'ok' });
    }

    // Execute RLS policies
    const { error: rlsError } = await supabase.rpc('exec_raw_sql', {
      sql_text: rlsSQL,
    });

    if (rlsError) {
      results.push({
        step: 'rls',
        status: 'error',
        error: rlsError.message,
      });
    } else {
      results.push({ step: 'rls', status: 'ok' });
    }

    // Execute seed data
    const { error: seedError } = await supabase.rpc('exec_raw_sql', {
      sql_text: seedSQL,
    });

    if (seedError) {
      results.push({
        step: 'seed',
        status: 'error',
        error: seedError.message,
      });
    } else {
      results.push({ step: 'seed', status: 'ok' });
    }

    return NextResponse.json({
      status: 'deployed',
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('users').select('id').limit(1);

    return NextResponse.json({
      schema_deployed: !error,
      error: error?.message || null,
    });
  } catch (err) {
    return NextResponse.json({
      schema_deployed: false,
      error: String(err),
    });
  }
}
