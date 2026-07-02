import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/user/preferences - Get user preferences
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get app user id
  const { data: appUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!appUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: preferences, error } = await supabase
    .from('user_preferences')
    .select('preference_key, preference_value')
    .eq('user_id', appUser.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to key-value object
  const result: Record<string, unknown> = {};
  for (const pref of preferences || []) {
    result[pref.preference_key] = pref.preference_value;
  }

  return NextResponse.json(result);
}

// PUT /api/user/preferences - Update a preference
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!appUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key) {
    return NextResponse.json(
      { error: 'Preference key is required' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: appUser.id,
      preference_key: key,
      preference_value: value,
    },
    {
      onConflict: 'user_id,preference_key',
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
