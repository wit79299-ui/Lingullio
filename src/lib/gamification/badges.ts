// ─── Badge / Achievement System ──────────────────────────────────────────
// Defines all badges and their unlock conditions

export type BadgeCategory = 'streak' | 'mastery' | 'exam' | 'practice' | 'social' | 'milestone';

export interface BadgeDefinition {
  id: string;
  name_fr: string;
  description_fr: string;
  icon: string; // emoji or lucide icon name
  category: BadgeCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  /** Check function receives user stats */
  condition: (stats: UserBadgeStats) => boolean;
}

export interface UserBadgeStats {
  total_exercises: number;
  total_correct: number;
  streak_days: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  mock_exams_taken: number;
  mock_exams_passed: number;
  vocab_mastered: number; // SRS items with interval > 21 days
  chars_mastered: number;
  grammar_mastered: number;
  total_study_minutes: number;
  perfect_sessions: number; // 100% sessions
  lessons_completed: number;
  days_active: number;
  levels_completed: string[]; // ["1", "2", ...]
}

export const BADGES: BadgeDefinition[] = [
  // ─── Streak badges ────────────────────────────────
  {
    id: 'streak_3', name_fr: 'Persevering', description_fr: '3 consecutive days',
    icon: '🔥', category: 'streak', rarity: 'common', xp_reward: 20,
    condition: (s) => s.streak_days >= 3,
  },
  {
    id: 'streak_7', name_fr: 'Consistent', description_fr: '7 consecutive days',
    icon: '🔥', category: 'streak', rarity: 'common', xp_reward: 50,
    condition: (s) => s.streak_days >= 7,
  },
  {
    id: 'streak_14', name_fr: 'Disciplined', description_fr: '14 consecutive days',
    icon: '💪', category: 'streak', rarity: 'rare', xp_reward: 100,
    condition: (s) => s.streak_days >= 14,
  },
  {
    id: 'streak_30', name_fr: 'Unstoppable', description_fr: '30 consecutive days',
    icon: '⚡', category: 'streak', rarity: 'epic', xp_reward: 250,
    condition: (s) => s.streak_days >= 30,
  },
  {
    id: 'streak_100', name_fr: 'Legendary', description_fr: '100 consecutive days',
    icon: '👑', category: 'streak', rarity: 'legendary', xp_reward: 1000,
    condition: (s) => s.streak_days >= 100,
  },

  // ─── Practice badges ──────────────────────────────
  {
    id: 'first_exercise', name_fr: 'First step', description_fr: 'Complete your first exercise',
    icon: '🎯', category: 'practice', rarity: 'common', xp_reward: 10,
    condition: (s) => s.total_exercises >= 1,
  },
  {
    id: 'exercises_50', name_fr: 'Dedicated', description_fr: '50 exercises completed',
    icon: '📝', category: 'practice', rarity: 'common', xp_reward: 30,
    condition: (s) => s.total_exercises >= 50,
  },
  {
    id: 'exercises_200', name_fr: 'Hard worker', description_fr: '200 exercises completed',
    icon: '📚', category: 'practice', rarity: 'rare', xp_reward: 100,
    condition: (s) => s.total_exercises >= 200,
  },
  {
    id: 'exercises_1000', name_fr: 'Machine', description_fr: '1000 exercises completed',
    icon: '🤖', category: 'practice', rarity: 'epic', xp_reward: 500,
    condition: (s) => s.total_exercises >= 1000,
  },
  {
    id: 'perfect_session_1', name_fr: 'Flawless', description_fr: '100% correct session',
    icon: '✨', category: 'practice', rarity: 'rare', xp_reward: 50,
    condition: (s) => s.perfect_sessions >= 1,
  },
  {
    id: 'perfect_session_10', name_fr: 'Perfectionist', description_fr: '10 perfect sessions',
    icon: '💎', category: 'practice', rarity: 'epic', xp_reward: 200,
    condition: (s) => s.perfect_sessions >= 10,
  },

  // ─── Mastery badges ───────────────────────────────
  {
    id: 'vocab_50', name_fr: 'Vocab beginner', description_fr: '50 words mastered',
    icon: '📖', category: 'mastery', rarity: 'common', xp_reward: 30,
    condition: (s) => s.vocab_mastered >= 50,
  },
  {
    id: 'vocab_200', name_fr: 'Polyglot', description_fr: '200 words mastered',
    icon: '🗣️', category: 'mastery', rarity: 'rare', xp_reward: 100,
    condition: (s) => s.vocab_mastered >= 200,
  },
  {
    id: 'vocab_500', name_fr: 'Lexicographer', description_fr: '500 words mastered',
    icon: '📕', category: 'mastery', rarity: 'epic', xp_reward: 300,
    condition: (s) => s.vocab_mastered >= 500,
  },
  {
    id: 'chars_100', name_fr: 'Calligrapher', description_fr: '100 characters mastered',
    icon: '✍️', category: 'mastery', rarity: 'rare', xp_reward: 100,
    condition: (s) => s.chars_mastered >= 100,
  },
  {
    id: 'chars_500', name_fr: 'Master calligrapher', description_fr: '500 characters mastered',
    icon: '🖌️', category: 'mastery', rarity: 'epic', xp_reward: 500,
    condition: (s) => s.chars_mastered >= 500,
  },

  // ─── Exam badges ──────────────────────────────────
  {
    id: 'first_mock', name_fr: 'First trial', description_fr: 'Complete a mock exam',
    icon: '📋', category: 'exam', rarity: 'common', xp_reward: 30,
    condition: (s) => s.mock_exams_taken >= 1,
  },
  {
    id: 'first_pass', name_fr: 'Passed!', description_fr: 'Pass a mock exam',
    icon: '🎓', category: 'exam', rarity: 'rare', xp_reward: 100,
    condition: (s) => s.mock_exams_passed >= 1,
  },
  {
    id: 'mock_exams_5', name_fr: 'Intensive training', description_fr: '5 mock exams completed',
    icon: '🏆', category: 'exam', rarity: 'rare', xp_reward: 150,
    condition: (s) => s.mock_exams_taken >= 5,
  },

  // ─── Milestone badges ─────────────────────────────
  {
    id: 'level_5', name_fr: 'Apprentice', description_fr: 'Reach level 5',
    icon: '⭐', category: 'milestone', rarity: 'common', xp_reward: 30,
    condition: (s) => s.level >= 5,
  },
  {
    id: 'level_10', name_fr: 'Intermediate', description_fr: 'Reach level 10',
    icon: '🌟', category: 'milestone', rarity: 'rare', xp_reward: 100,
    condition: (s) => s.level >= 10,
  },
  {
    id: 'level_25', name_fr: 'Expert', description_fr: 'Reach level 25',
    icon: '💫', category: 'milestone', rarity: 'epic', xp_reward: 500,
    condition: (s) => s.level >= 25,
  },
  {
    id: 'study_60min', name_fr: 'First hour', description_fr: '1 cumulative hour of study',
    icon: '⏰', category: 'milestone', rarity: 'common', xp_reward: 20,
    condition: (s) => s.total_study_minutes >= 60,
  },
  {
    id: 'study_600min', name_fr: 'Marathon runner', description_fr: '10 cumulative hours of study',
    icon: '🏃', category: 'milestone', rarity: 'rare', xp_reward: 100,
    condition: (s) => s.total_study_minutes >= 600,
  },
  {
    id: 'study_3000min', name_fr: 'Ultra runner', description_fr: '50 cumulative hours of study',
    icon: '🦾', category: 'milestone', rarity: 'epic', xp_reward: 500,
    condition: (s) => s.total_study_minutes >= 3000,
  },
  {
    id: 'lesson_10', name_fr: 'Model student', description_fr: '10 lessons completed',
    icon: '📘', category: 'milestone', rarity: 'common', xp_reward: 50,
    condition: (s) => s.lessons_completed >= 10,
  },
  {
    id: 'lesson_50', name_fr: 'Scholar', description_fr: '50 lessons completed',
    icon: '🎒', category: 'milestone', rarity: 'rare', xp_reward: 200,
    condition: (s) => s.lessons_completed >= 50,
  },
];

export function checkNewBadges(stats: UserBadgeStats, alreadyUnlocked: string[]): BadgeDefinition[] {
  const unlocked = new Set(alreadyUnlocked);
  return BADGES.filter(badge => !unlocked.has(badge.id) && badge.condition(stats));
}

export const RARITY_COLORS = {
  common: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  rare: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  epic: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  legendary: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
} as const;
