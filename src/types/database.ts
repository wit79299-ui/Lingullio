// Core database types for Lingullio
// These will be auto-generated from Supabase later,
// but defined manually for development

export type UserRole = 'admin' | 'editor' | 'reviewer' | 'learner';

export type ContentStatus = 'draft' | 'validated' | 'published' | 'archived';

export type LicenseStatus = 'pending' | 'active' | 'expired' | 'revoked' | 'refunded';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type PreparationStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_track'
  | 'near_target'
  | 'ready'
  | 'at_risk';

export type ExerciseType =
  | 'mcq'
  | 'multiple_choice'
  | 'fill_blank'
  | 'matching'
  | 'reorder'
  | 'dictation'
  | 'listening_comprehension'
  | 'reading_comprehension'
  | 'short_answer'
  | 'essay'
  | 'speaking'
  | 'flashcard'
  | 'character_recognition'
  | 'handwriting'
  | 'stroke_order'
  | 'handwriting_comparison'
  | 'controlled_translation'
  | 'timed_exam';

export type SkillTag =
  | 'listening'
  | 'reading'
  | 'writing'
  | 'speaking'
  | 'grammar'
  | 'vocabulary'
  | 'characters'
  | 'handwriting';

export type HandwritingDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'exam';

export interface User {
  id: string;
  auth_id: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  interface_language: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearnerProfile {
  id: string;
  user_id: string;
  target_exam: string;
  target_level: string;
  objective: string | null;
  exam_date: string | null;
  target_score: number | null;
  weekly_hours: number | null;
  initial_score: number | null;
  current_estimated_score: number | null;
  expected_score_at_date: number | null;
  confidence_level: ConfidenceLevel;
  preparation_status: PreparationStatus;
  total_study_time_minutes: number;
  streak_days: number;
  longest_streak: number;
  last_activity_at: string | null;
  onboarding_completed: boolean;
  diagnostic_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: string;
  user_id: string | null;
  email: string;
  shopify_order_id: string | null;
  activation_code: string;
  course_id: string;
  status: LicenseStatus;
  activated_at: string | null;
  expires_at: string | null;
  duration_months: number;
  extended_months: number;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  exam_type: string;
  slug: string;
  status: ContentStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface VocabularyItem {
  id: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  audio_url: string | null;
  hsk_level: string;
  frequency_rank: number | null;
  radical: string | null;
  stroke_count: number | null;
  word_type: string | null;
  theme: string | null;
  status: ContentStatus;
  created_at: string;
}

export interface GrammarPoint {
  id: string;
  pattern: string;
  hsk_level: string;
  sort_order: number | null;
  difficulty: number;
  status: ContentStatus;
  created_at: string;
}

export interface Character {
  id: string;
  character: string;
  pinyin: string;
  radical: string | null;
  stroke_count: number;
  hsk_level: string;
  frequency_rank: number | null;
  decomposition: string | null;
  audio_url: string | null;
  status: ContentStatus;
  created_at: string;
}

export interface Exercise {
  id: string;
  lesson_id: string | null;
  exercise_type: ExerciseType;
  difficulty: number;
  points: number;
  estimated_duration_seconds: number | null;
  audio_url: string | null;
  skill_tags: SkillTag[];
  hsk_level: string | null;
  grammar_point_id: string | null;
  sort_order: number;
  status: ContentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  exercise_id: string;
  learner_profile_id: string;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
  is_correct: boolean | null;
  score: number | null;
  max_score: number | null;
  user_answer: unknown;
  ai_feedback: unknown;
  created_at: string;
}

export interface ProgressSnapshot {
  id: string;
  user_id: string;
  learner_profile_id: string;
  snapshot_type: string;
  estimated_score: number | null;
  confidence_level: string | null;
  scores_by_skill: Record<SkillTag, number>;
  total_exercises_done: number | null;
  total_correct: number | null;
  study_time_minutes: number | null;
  streak_days: number | null;
  completion_percentage: number | null;
  created_at: string;
}
