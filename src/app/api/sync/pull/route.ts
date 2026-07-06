// ─── Full Pull API ────────────────────────────────────────────────────
// GET /api/sync/pull — Pull ALL user progression data in one request.
// Called on login / app startup to hydrate client stores from server.
// Returns: knowledge items, gamification state, training mode, placement result.

import { NextResponse } from 'next/server';
import { getSyncUser } from '@/lib/sync/auth-helper';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // Fetch all data in parallel
    const [knowledgeResult, profileResult, placementResult] = await Promise.all([
      // 1. Knowledge items
      supabase
        .from('user_knowledge_items')
        .select('*')
        .eq('user_id', syncUser.user_id),

      // 2. Learner profile (gamification + training mode)
      supabase
        .from('learner_profiles')
        .select(`
          total_xp, level, perfect_sessions, badges_unlocked,
          streak_days, longest_streak, total_study_time_minutes, last_activity_at,
          gamification_extended, training_mode_config, sync_version
        `)
        .eq('id', syncUser.profile_id)
        .single(),

      // 3. Latest placement result
      supabase
        .from('placement_results')
        .select('result_data, recommended_level, total_score, completed_at')
        .eq('user_id', syncUser.user_id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // ── Transform knowledge items ──
    const knowledgeItems: Record<string, unknown> = {};
    if (knowledgeResult.data) {
      for (const row of knowledgeResult.data) {
        knowledgeItems[row.item_id] = {
          item_id: row.item_id,
          item_type: row.item_type,
          level: row.level,
          display: row.display,
          pinyin: row.pinyin,
          meaning: row.meaning,
          audio_url: row.audio_url,
          theme: row.theme,
          srs: {
            ease_factor: parseFloat(row.srs_ease_factor),
            interval_days: row.srs_interval_days,
            repetitions: row.srs_repetitions,
            next_review_at: row.srs_next_review_at,
            last_quality: row.srs_last_quality,
          },
          mastery: row.mastery,
          times_seen: row.times_seen,
          times_correct: row.times_correct,
          times_incorrect: row.times_incorrect,
          last_seen_at: row.last_seen_at,
          first_seen_at: row.first_seen_at,
          last_correct_at: row.last_correct_at,
          last_incorrect_at: row.last_incorrect_at,
          source_lesson_ids: typeof row.source_lesson_ids === 'string'
            ? JSON.parse(row.source_lesson_ids)
            : (row.source_lesson_ids || []),
          source_exercise_ids: typeof row.source_exercise_ids === 'string'
            ? JSON.parse(row.source_exercise_ids)
            : (row.source_exercise_ids || []),
        };
      }
    }

    // ── Transform gamification ──
    const profile = profileResult.data;
    const extended = (profile?.gamification_extended || {}) as Record<string, unknown>;
    const trainingConfig = (profile?.training_mode_config || {}) as Record<string, unknown>;

    const gamification = profile ? {
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
    } : null;

    // ── Transform training mode ──
    const trainingMode = {
      active_mode: trainingConfig.active_mode || 'standard',
      parcours_config: trainingConfig.parcours_config || null,
      parcours_words_learned_snapshot: trainingConfig.parcours_words_learned_snapshot || 0,
      coach_state: trainingConfig.coach_state || {
        auto_activated: false,
        activated_at: null,
        dismissed_until: null,
        prescribed_sessions: [],
      },
    };

    // ── Placement result ──
    const placement = placementResult.data ? {
      result: placementResult.data.result_data,
      recommended_level: placementResult.data.recommended_level,
      total_score: placementResult.data.total_score,
      completed_at: placementResult.data.completed_at,
    } : null;

    return NextResponse.json({
      knowledge: {
        items: knowledgeItems,
        count: Object.keys(knowledgeItems).length,
      },
      gamification,
      training_mode: trainingMode,
      placement,
      sync_version: profile?.sync_version || 0,
      pulled_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync/pull] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
