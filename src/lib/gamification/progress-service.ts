// ─── Progress Service ────────────────────────────────────────────────────
// Client-side service that writes exercise attempts, computes XP, 
// updates streaks, checks badges, and manages SRS items.
// Called from exercise-engine and mock-exam-runner after each answer.

import { createClient } from '@/lib/supabase/client';
import { XP_CONFIG, levelFromXp } from './xp-config';
import { calculateSRS, exerciseToQuality, createNewSRSItem } from './srs-engine';
import { BADGES, checkNewBadges, type UserBadgeStats } from './badges';

// ─── Types ──────────────────────────────────────────────────────────────

export interface AttemptPayload {
  exercise_id: string;
  is_correct: boolean;
  score: number;
  max_score: number;
  time_spent_seconds: number;
  user_answer: unknown;
  exercise_type: string;
  skill_tags?: string[];
  hint_used?: boolean;
}

export interface SessionSummary {
  xp_earned: number;
  streak_days: number;
  new_badges: string[];
  level_before: number;
  level_after: number;
  level_up: boolean;
  total_xp: number;
}

export interface GamificationState {
  total_xp: number;
  level: number;
  streak_days: number;
  longest_streak: number;
  badges_unlocked: string[];
  daily_xp: number;
  daily_exercises: number;
  daily_correct: number;
}

// ─── Get current gamification state ─────────────────────────────────────

export async function getGamificationState(userId: string, profileId: string): Promise<GamificationState | null> {
  const supabase = createClient();
  
  // Get learner profile
  const { data: profile } = await supabase
    .from('learner_profiles')
    .select('total_xp, level, streak_days, longest_streak, badges_unlocked, last_activity_at')
    .eq('id', profileId)
    .single();
  
  if (!profile) return null;
  
  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const { data: todayAttempts } = await supabase
    .from('attempts')
    .select('is_correct, score, time_spent_seconds')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);
  
  const dailyExercises = todayAttempts?.length ?? 0;
  const dailyCorrect = todayAttempts?.filter(a => a.is_correct)?.length ?? 0;
  
  return {
    total_xp: profile.total_xp ?? 0,
    level: profile.level ?? 1,
    streak_days: profile.streak_days ?? 0,
    longest_streak: profile.longest_streak ?? 0,
    badges_unlocked: profile.badges_unlocked ?? [],
    daily_xp: 0, // Will be computed from today's snapshots
    daily_exercises: dailyExercises,
    daily_correct: dailyCorrect,
  };
}

// ─── Record a single exercise attempt ───────────────────────────────────

export async function recordAttempt(
  userId: string,
  profileId: string,
  payload: AttemptPayload,
): Promise<{ xp: number; attempt_id: string } | null> {
  const supabase = createClient();
  
  // 1. Insert attempt
  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert({
      user_id: userId,
      exercise_id: payload.exercise_id,
      learner_profile_id: profileId,
      started_at: new Date(Date.now() - payload.time_spent_seconds * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      time_spent_seconds: payload.time_spent_seconds,
      is_correct: payload.is_correct,
      score: payload.score,
      max_score: payload.max_score,
      user_answer: payload.user_answer,
      metadata: {
        exercise_type: payload.exercise_type,
        skill_tags: payload.skill_tags ?? [],
        hint_used: payload.hint_used ?? false,
      },
    })
    .select('id')
    .single();
  
  if (error || !attempt) {
    console.error('Failed to record attempt:', error);
    return null;
  }
  
  // 2. Calculate XP
  let xp = payload.is_correct ? XP_CONFIG.exercise_correct : XP_CONFIG.exercise_incorrect;
  
  // 3. Update profile XP
  const { data: profile } = await supabase
    .from('learner_profiles')
    .select('total_xp, level')
    .eq('id', profileId)
    .single();
  
  if (profile) {
    const newTotalXp = (profile.total_xp ?? 0) + xp;
    const newLevel = levelFromXp(newTotalXp).level;
    
    await supabase
      .from('learner_profiles')
      .update({
        total_xp: newTotalXp,
        level: newLevel,
        last_activity_at: new Date().toISOString(),
        total_study_time_minutes: undefined, // Will be updated in finishSession
      })
      .eq('id', profileId);
  }
  
  return { xp, attempt_id: attempt.id };
}

// ─── Finish a session (batch of exercises) ──────────────────────────────

export async function finishSession(
  userId: string,
  profileId: string,
  attempts: AttemptPayload[],
  sessionTimeSeconds: number,
): Promise<SessionSummary> {
  const supabase = createClient();
  
  // 1. Get current profile state
  const { data: profile } = await supabase
    .from('learner_profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  
  if (!profile) {
    return { xp_earned: 0, streak_days: 0, new_badges: [], level_before: 1, level_after: 1, level_up: false, total_xp: 0 };
  }
  
  const levelBefore = profile.level ?? 1;
  let totalXp = profile.total_xp ?? 0;
  let xpEarned = 0;
  
  // 2. Batch-insert all attempts
  const attemptRows = attempts.map(a => ({
    user_id: userId,
    exercise_id: a.exercise_id,
    learner_profile_id: profileId,
    started_at: new Date(Date.now() - a.time_spent_seconds * 1000).toISOString(),
    completed_at: new Date().toISOString(),
    time_spent_seconds: a.time_spent_seconds,
    is_correct: a.is_correct,
    score: a.score,
    max_score: a.max_score,
    user_answer: a.user_answer,
    metadata: {
      exercise_type: a.exercise_type,
      skill_tags: a.skill_tags ?? [],
      hint_used: a.hint_used ?? false,
    },
  }));
  
  if (attemptRows.length > 0) {
    await supabase.from('attempts').insert(attemptRows);
  }
  
  // 3. Calculate XP
  const correctCount = attempts.filter(a => a.is_correct).length;
  const totalCount = attempts.length;
  const isPerfect = correctCount === totalCount && totalCount > 0;
  
  // Base XP
  attempts.forEach(a => {
    xpEarned += a.is_correct ? XP_CONFIG.exercise_correct : XP_CONFIG.exercise_incorrect;
  });
  
  // Perfect session bonus
  if (isPerfect && totalCount >= 3) {
    xpEarned += XP_CONFIG.perfect_session;
  }
  
  // Speed bonus (avg < 10 sec per question)
  const avgTime = sessionTimeSeconds / Math.max(1, totalCount);
  if (avgTime < 10 && correctCount > totalCount * 0.8) {
    xpEarned += XP_CONFIG.speed_bonus;
  }
  
  // 4. Update streak
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastActivity = profile.last_activity_at ? new Date(profile.last_activity_at) : null;
  const lastActivityDate = lastActivity?.toISOString().split('T')[0];
  
  let streakDays = profile.streak_days ?? 0;
  let longestStreak = profile.longest_streak ?? 0;
  
  if (lastActivityDate !== todayStr) {
    // New day
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastActivityDate === yesterdayStr) {
      // Consecutive day
      streakDays += 1;
      xpEarned += XP_CONFIG.streak_day_bonus;
    } else if (!lastActivityDate || lastActivityDate < yesterdayStr) {
      // Streak broken
      streakDays = 1;
    }
    // First login of day bonus
    xpEarned += XP_CONFIG.first_login_of_day;
  }
  
  if (streakDays > longestStreak) {
    longestStreak = streakDays;
  }
  
  // 5. Update profile
  totalXp += xpEarned;
  const levelAfter = levelFromXp(totalXp).level;
  const totalStudyMinutes = (profile.total_study_time_minutes ?? 0) + Math.ceil(sessionTimeSeconds / 60);
  
  // Count perfect sessions
  const perfectSessions = (profile.perfect_sessions ?? 0) + (isPerfect ? 1 : 0);
  
  // Update badges
  const currentBadges: string[] = profile.badges_unlocked ?? [];
  
  // Get full stats for badge checking
  const { count: totalExercises } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  const { count: totalCorrect } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_correct', true);
  
  const { count: mockExamsTaken } = await supabase
    .from('mock_exam_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  const { count: mockExamsPassed } = await supabase
    .from('mock_exam_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('passed', true);
  
  const { count: vocabMastered } = await supabase
    .from('spaced_repetition_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('item_type', 'vocabulary')
    .gt('interval_days', 21);
  
  const { count: charsMastered } = await supabase
    .from('spaced_repetition_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('item_type', 'character')
    .gt('interval_days', 21);
  
  const badgeStats: UserBadgeStats = {
    total_exercises: totalExercises ?? 0,
    total_correct: totalCorrect ?? 0,
    streak_days: streakDays,
    longest_streak: longestStreak,
    total_xp: totalXp,
    level: levelAfter,
    mock_exams_taken: mockExamsTaken ?? 0,
    mock_exams_passed: mockExamsPassed ?? 0,
    vocab_mastered: vocabMastered ?? 0,
    chars_mastered: charsMastered ?? 0,
    grammar_mastered: 0,
    total_study_minutes: totalStudyMinutes,
    perfect_sessions: perfectSessions,
    lessons_completed: 0, // TODO: track
    days_active: 0,
    hsk_levels_completed: [],
  };
  
  const newBadges = checkNewBadges(badgeStats, currentBadges);
  const newBadgeIds = newBadges.map(b => b.id);
  const allBadges = [...currentBadges, ...newBadgeIds];
  
  // Add badge XP
  newBadges.forEach(b => {
    xpEarned += b.xp_reward;
    totalXp += b.xp_reward;
  });
  
  // Recalculate level with badge XP
  const finalLevel = levelFromXp(totalXp).level;
  
  // 6. Write profile update
  await supabase
    .from('learner_profiles')
    .update({
      total_xp: totalXp,
      level: finalLevel,
      streak_days: streakDays,
      longest_streak: longestStreak,
      last_activity_at: now.toISOString(),
      total_study_time_minutes: totalStudyMinutes,
      perfect_sessions: perfectSessions,
      badges_unlocked: allBadges,
    })
    .eq('id', profileId);
  
  // 7. Write progress snapshot
  const skillScores: Record<string, number> = {};
  attempts.forEach(a => {
    (a.skill_tags ?? []).forEach(tag => {
      if (!skillScores[tag]) skillScores[tag] = 0;
      if (a.is_correct) skillScores[tag] += 1;
    });
  });
  
  await supabase.from('progress_snapshots').insert({
    user_id: userId,
    learner_profile_id: profileId,
    snapshot_type: 'post_session',
    estimated_score: null,
    confidence_level: null,
    scores_by_skill: skillScores,
    total_exercises_done: totalCount,
    total_correct: correctCount,
    study_time_minutes: Math.ceil(sessionTimeSeconds / 60),
    streak_days: streakDays,
    completion_percentage: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
    metadata: {
      xp_earned: xpEarned,
      perfect: isPerfect,
      new_badges: newBadgeIds,
    },
  });
  
  return {
    xp_earned: xpEarned,
    streak_days: streakDays,
    new_badges: newBadgeIds,
    level_before: levelBefore,
    level_after: finalLevel,
    level_up: finalLevel > levelBefore,
    total_xp: totalXp,
  };
}

// ─── SRS: Update or create SRS item after review ────────────────────────

export async function updateSRSItem(
  userId: string,
  profileId: string,
  itemType: 'vocabulary' | 'character' | 'grammar',
  itemId: string,
  isCorrect: boolean,
  timeSpentSeconds: number,
) {
  const supabase = createClient();
  const quality = exerciseToQuality(isCorrect, timeSpentSeconds);
  
  // Get existing SRS item
  const { data: existing } = await supabase
    .from('spaced_repetition_items')
    .select('*')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .single();
  
  if (existing) {
    // Update existing
    const updated = calculateSRS(existing, quality);
    await supabase
      .from('spaced_repetition_items')
      .update({
        ...updated,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new
    const newItem = createNewSRSItem();
    const updated = calculateSRS(newItem, quality);
    await supabase
      .from('spaced_repetition_items')
      .insert({
        user_id: userId,
        learner_profile_id: profileId,
        item_type: itemType,
        item_id: itemId,
        ...updated,
        last_reviewed_at: new Date().toISOString(),
      });
  }
}

// ─── Get SRS review queue ───────────────────────────────────────────────

export async function getSRSReviewQueue(
  userId: string,
  profileId: string,
  limit: number = 20,
) {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('spaced_repetition_items')
    .select('*')
    .eq('user_id', userId)
    .eq('learner_profile_id', profileId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(limit);
  
  return data ?? [];
}
