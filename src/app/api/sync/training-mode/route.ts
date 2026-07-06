// ─── Training Mode Sync API ──────────────────────────────────────────
// POST /api/sync/training-mode — Push training mode config to learner_profiles
// GET  /api/sync/training-mode — Pull training mode config
//
// Strategy: Store as JSONB in learner_profiles.training_mode_config

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSyncUser } from '@/lib/sync/auth-helper';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ─── POST: Push training mode config ──────────────────────────────

export async function POST(request: NextRequest) {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as TrainingModePayload;
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('learner_profiles')
      .update({
        training_mode_config: {
          active_mode: body.active_mode,
          parcours_config: body.parcours_config,
          parcours_words_learned_snapshot: body.parcours_words_learned_snapshot,
          coach_state: body.coach_state,
        },
      })
      .eq('id', syncUser.profile_id);

    if (error) {
      console.error('[sync/training-mode] Update error:', error);
      return NextResponse.json(
        { error: 'Database error', detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      synced: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync/training-mode] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── GET: Pull training mode config ────────────────────────────────

export async function GET() {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: profile, error } = await supabase
      .from('learner_profiles')
      .select('training_mode_config')
      .eq('id', syncUser.profile_id)
      .single();

    if (error) {
      console.error('[sync/training-mode] Fetch error:', error);
      return NextResponse.json(
        { error: 'Database error', detail: error.message },
        { status: 500 }
      );
    }

    const config = (profile?.training_mode_config || {}) as Record<string, unknown>;

    return NextResponse.json({
      active_mode: config.active_mode || 'standard',
      parcours_config: config.parcours_config || null,
      parcours_words_learned_snapshot: config.parcours_words_learned_snapshot || 0,
      coach_state: config.coach_state || {
        auto_activated: false,
        activated_at: null,
        dismissed_until: null,
        prescribed_sessions: [],
      },
    });
  } catch (err) {
    console.error('[sync/training-mode] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Types ─────────────────────────────────────────────────────────

interface TrainingModePayload {
  active_mode: string;
  parcours_config: unknown;
  parcours_words_learned_snapshot: number;
  coach_state: unknown;
}
