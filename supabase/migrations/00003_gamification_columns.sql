-- ============================================================
-- Migration: Add gamification columns to learner_profiles
-- ============================================================

-- XP and leveling
ALTER TABLE public.learner_profiles
  ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS perfect_sessions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badges_unlocked JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add "passed" column to mock_exam_attempts if it doesn't exist
ALTER TABLE public.mock_exam_attempts
  ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT false;

-- Add snapshot_type 'post_session' to progress_snapshots check constraint
-- (The existing constraint allows specific values; we need to add 'post_session')
-- Drop and recreate since ALTER CONSTRAINT doesn't exist in PostgreSQL
ALTER TABLE public.progress_snapshots
  DROP CONSTRAINT IF EXISTS progress_snapshots_snapshot_type_check;

ALTER TABLE public.progress_snapshots
  ADD CONSTRAINT progress_snapshots_snapshot_type_check
  CHECK (snapshot_type IN ('daily', 'weekly', 'post_exam', 'diagnostic', 'manual', 'post_session'));

-- Add metadata column to attempts if not exists
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Index for daily queries
CREATE INDEX IF NOT EXISTS idx_attempts_user_date
  ON public.attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_profile
  ON public.attempts(learner_profile_id, created_at DESC);

-- Index for SRS due items
CREATE INDEX IF NOT EXISTS idx_srs_due
  ON public.spaced_repetition_items(user_id, learner_profile_id, next_review_at)
  WHERE next_review_at <= now();

-- Index for badges
CREATE INDEX IF NOT EXISTS idx_profiles_level
  ON public.learner_profiles(level DESC);

-- Lesson completions tracking table
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  learner_profile_id UUID NOT NULL REFERENCES public.learner_profiles(id),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score_percentage NUMERIC(5,2),
  time_spent_seconds INTEGER,
  xp_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, learner_profile_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user
  ON public.lesson_completions(user_id, learner_profile_id);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  learner_profile_id UUID NOT NULL REFERENCES public.learner_profiles(id),
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_type TEXT NOT NULL DEFAULT 'mixed',
  target_exercises INTEGER NOT NULL DEFAULT 10,
  completed_exercises INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  xp_reward INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date
  ON public.daily_challenges(user_id, challenge_date DESC);
