import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// GET /api/setup/get-sql?step=all|schema|rls|seed
// Returns SQL as plain text, optionally split by step
export async function GET(request: Request) {
  try {
    const cwd = process.cwd();
    const url = new URL(request.url);
    const step = url.searchParams.get('step') || 'all';

    const schema = readFileSync(
      join(cwd, 'supabase/migrations/00001_initial_schema.sql'),
      'utf-8'
    );
    const rls = readFileSync(
      join(cwd, 'supabase/migrations/00002_rls_policies.sql'),
      'utf-8'
    );
    const seed = readFileSync(join(cwd, 'supabase/seed.sql'), 'utf-8');

    if (step === 'json') {
      return NextResponse.json({
        schema,
        rls,
        seed,
      }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    let content: string;
    switch (step) {
      case 'schema':
        content = schema;
        break;
      case 'rls':
        content = rls;
        break;
      case 'seed':
        content = seed;
        break;
      default:
        content = [
          '-- ============================================================',
          '-- LINGULLIO - FULL DEPLOYMENT',
          '-- 33 tables + RLS + seed data',
          '-- ============================================================',
          '',
          schema,
          '',
          '-- ============================================================',
          '-- ROW LEVEL SECURITY POLICIES',
          '-- ============================================================',
          '',
          rls,
          '',
          '-- ============================================================',
          '-- SEED DATA (donnees de test)',
          '-- ============================================================',
          '',
          seed,
        ].join('\n');
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new NextResponse(`Error: ${String(err)}`, { status: 500 });
  }
}
