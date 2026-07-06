// ─── Placement Result Sync API ────────────────────────────────────────
// POST /api/sync/placement — Save placement test result
// GET  /api/sync/placement — Get latest placement test result
//
// The placement result is a large JSON blob from the placement engine.
// We store the full blob + extract key fields for querying.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSyncUser } from '@/lib/sync/auth-helper';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ─── POST: Save placement result ──────────────────────────────────

export async function POST(request: NextRequest) {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as PlacementPayload;
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('placement_results')
      .insert({
        user_id: syncUser.user_id,
        result_data: body.result_data,
        recommended_level: body.recommended_level || null,
        total_score: body.total_score || null,
        profile_answers: body.profile_answers || null,
        completed_at: body.completed_at || new Date().toISOString(),
      });

    if (error) {
      console.error('[sync/placement] Insert error:', error);
      return NextResponse.json(
        { error: 'Database error', detail: error.message },
        { status: 500 }
      );
    }

    // Also mark diagnostic as completed on learner_profile
    await supabase
      .from('learner_profiles')
      .update({ diagnostic_completed: true })
      .eq('id', syncUser.profile_id);

    return NextResponse.json({
      saved: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync/placement] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── GET: Get latest placement result ──────────────────────────────

export async function GET() {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('placement_results')
      .select('*')
      .eq('user_id', syncUser.user_id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (not an error for us)
      console.error('[sync/placement] Fetch error:', error);
      return NextResponse.json(
        { error: 'Database error', detail: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ result: null });
    }

    return NextResponse.json({
      result: data.result_data,
      recommended_level: data.recommended_level,
      total_score: data.total_score,
      completed_at: data.completed_at,
    });
  } catch (err) {
    console.error('[sync/placement] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Types ─────────────────────────────────────────────────────────

interface PlacementPayload {
  result_data: unknown;           // Full placement result JSON
  recommended_level?: string;
  total_score?: number;
  profile_answers?: unknown;
  completed_at?: string;
}
