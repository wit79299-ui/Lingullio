// ─── Gamification Sync API ─────────────────────────────────────────
// POST /api/sync/gamification — Push gamification state to learner_profiles
// GET  /api/sync/gamification — Pull gamification state
//
// Strategy: The gamification state is split between:
//   - learner_profiles columns (total_xp, level, badges_unlocked, streak, etc.)
//   - learner_profiles.gamification_extended JSONB (sessions_history, daily counters)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSyncUser } from '@/lib/sync/auth-helper';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ─── POST: Push gamification state ─────────────────────────────────

export async function POST(request: NextRequest) {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as GamificationPayload;
    const supabase = createServiceRoleClient();

    // Update learner_profiles with gamification data
    const { error } = await supabase
      .from('learner_profiles')
      .update({
        // Direct columns (from migration 00003)
        total_xp: body.total_xp,
        level: body.level,
        perfect_sessions: body.perfect_sessions,
        badges_unlocked: body.badges_unlocked,
        // Columns from initial schema
        streak_days: body.streak_days,
        longest_streak: body.longest_streak,
        total_study_time_minutes: body.total_study_minutes,
        last_activity_at: body.last_activity_date 
          ? new Date(body.last_activity_date + 'T12:00:00Z').toISOString()
          : null,
        // Extended state as JSONB
        gamification_extended: {
          total_exercises: body.total_exercises,
          total_correct: body.total_correct,
          daily_exercises: body.daily_exercises,
          daily_correct: body.daily_correct,
          daily_xp: body.daily_xp,
          last_activity_date: body.last_activity_date,
          sessions_history: body.sessions_history || [],
        },
      })
      .eq('id', syncUser.profile_id);

    if (error) {
      console.error('[sync/gamification] Update error:', error);
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
    console.error('[sync/gamification] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── GET: Pull gamification state ──────────────────────────────────

export async function GET() {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: profile, error } = await supabase
      .from('learner_profiles')
      .select(`
        total_xp,
        level,
        perfect_sessions,
        badges_unlocked,
        streak_days,
        longest_streak,
        total_study_time_minutes,
        last_activity_at,
        gamification_extended
      `)
      .eq('id', syncUser.profile_id)
      .single();

    if (error) {
      console.error('[sync/gamification] Fetch error:', error);
      return NextResponse.json(
        { error: 'Database error', detail: error.message },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const extended = (profile.gamification_extended || {}) as Record<string, unknown>;

    return NextResponse.json({
      total_xp: profile.total_xp || 0,
      level: profile.level || 1,
      streak_days: profile.streak_days || 0,
      longest_streak: profile.longest_streak || 0,
      badges_unlocked: profile.badges_unlocked || [],
      perfect_sessions: profile.perfect_sessions || 0,
      total_exercises: (extended.total_exercises as number) || 0,
      total_correct: (extended.total_correct as number) || 0,
      total_study_minutes: profile.total_study_time_minutes || 0,
      last_activity_date: (extended.last_activity_date as string) || null,
      daily_exercises: (extended.daily_exercises as number) || 0,
      daily_correct: (extended.daily_correct as number) || 0,
      daily_xp: (extended.daily_xp as number) || 0,
      sessions_history: (extended.sessions_history as unknown[]) || [],
    });
  } catch (err) {
    console.error('[sync/gamification] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Types ─────────────────────────────────────────────────────────

interface GamificationPayload {
  total_xp: number;
  level: number;
  streak_days: number;
  longest_streak: number;
  badges_unlocked: string[];
  perfect_sessions: number;
  total_exercises: number;
  total_correct: number;
  total_study_minutes: number;
  last_activity_date: string | null;
  daily_exercises: number;
  daily_correct: number;
  daily_xp: number;
  sessions_history: unknown[];
}
