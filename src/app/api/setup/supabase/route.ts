import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// POST /api/setup/supabase
// Securely writes Supabase credentials to .env.local
// Protected by a one-time token stored server-side
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = body;

    // 1. Verify setup token
    const expectedToken = process.env.SETUP_SECRET_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Setup already completed or token not configured.' },
        { status: 403 }
      );
    }

    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid setup token.' },
        { status: 401 }
      );
    }

    // 2. Validate inputs
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'All three Supabase fields are required.' },
        { status: 400 }
      );
    }

    // Basic URL validation
    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
      return NextResponse.json(
        { error: 'Supabase URL must be a valid https://*.supabase.co URL.' },
        { status: 400 }
      );
    }

    // Key format validation (Supabase keys are JWT-like base64 strings)
    if (supabaseAnonKey.length < 100 || supabaseServiceRoleKey.length < 100) {
      return NextResponse.json(
        { error: 'Keys appear too short. Please paste the full key.' },
        { status: 400 }
      );
    }

    // 3. Write to .env.local
    const envPath = join(process.cwd(), '.env.local');
    let envContent = '';

    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf-8');
    }

    // Replace or add each variable
    const replacements: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.trim(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey.trim(),
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey.trim(),
    };

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    // Remove the setup token (one-time use)
    envContent = envContent.replace(/^SETUP_SECRET_TOKEN=.*\n?/m, '');

    writeFileSync(envPath, envContent.trim() + '\n', { mode: 0o600 });

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase credentials saved. Restart the server to apply.',
    });
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// GET /api/setup/supabase
// Check if setup is still available (token exists)
export async function GET() {
  const token = process.env.SETUP_SECRET_TOKEN;
  return NextResponse.json({
    available: !!token,
  });
}
