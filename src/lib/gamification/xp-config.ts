// ─── XP & Level Configuration ────────────────────────────────────────────
// Centralizes all gamification constants

export const XP_CONFIG = {
  // XP per action
  exercise_correct: 10,
  exercise_incorrect: 2, // Participation XP
  exercise_streak_bonus: 5, // Bonus per consecutive correct
  flashcard_correct: 5,
  flashcard_incorrect: 1,
  lesson_complete: 50,
  mock_exam_complete: 100,
  mock_exam_pass: 200,
  daily_goal_complete: 30,
  streak_day_bonus: 10, // Per day of streak
  first_login_of_day: 5,
  srs_review_correct: 8,
  srs_review_incorrect: 2,
  perfect_session: 50, // 100% in a session
  speed_bonus: 15, // < 5 sec per question avg
} as const;

// Level thresholds — exponential curve
// Level 1: 0 XP, Level 2: 100 XP, etc.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(1.4, level - 2));
}

export function levelFromXp(totalXp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) {
    level++;
  }
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpInLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  return {
    level,
    currentXp: xpInLevel,
    nextLevelXp: xpNeeded,
    progress: xpNeeded > 0 ? Math.round((xpInLevel / xpNeeded) * 100) : 100,
  };
}

export const MAX_LEVEL = 50;

// Level titles
export function levelTitle(level: number): string {
  if (level <= 3) return 'Beginner';
  if (level <= 7) return 'Apprentice';
  if (level <= 12) return 'Intermediate';
  if (level <= 18) return 'Advanced';
  if (level <= 25) return 'Expert';
  if (level <= 35) return 'Master';
  if (level <= 45) return 'Grand Master';
  return 'Legendary';
}

// Streak milestones for special rewards
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;
