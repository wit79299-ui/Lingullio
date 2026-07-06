-- ============================================================
-- Lingullio - Migration 00005: Progression Sync System
-- Enables real user progression data to be persisted in Supabase
-- instead of localStorage only.
--
-- New tables:
--   1. user_knowledge_items  - SRS knowledge map (the "brain")
--   2. placement_results     - Placement test results
--
-- Altered tables:
--   3. learner_profiles += training_mode_config JSONB
--   4. learner_profiles += gamification_state JSONB (sessions_history, daily counters)
--   5. learner_profiles += knowledge_sync_version, gamification_sync_version
-- ============================================================

-- ============================================================
-- 1. USER_KNOWLEDGE_ITEMS — SRS Knowledge Map
-- Each row = one vocabulary/character/grammar item the user has encountered.
-- Maps directly to the KnowledgeItem interface in user-knowledge-store.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Item identity
    item_id TEXT NOT NULL,                -- vocabulary_id, character_id, or grammar_point_id
    item_type TEXT NOT NULL CHECK (item_type IN ('vocabulary', 'character', 'grammar')),
    level TEXT NOT NULL,                  -- "1", "2", ..., "7"

    -- Display info (cached)
    display TEXT NOT NULL,                -- simplified char or pattern
    pinyin TEXT NOT NULL,
    meaning TEXT NOT NULL,
    audio_url TEXT,
    theme TEXT,

    -- SRS State (SM-2)
    srs_ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.5,
    srs_interval_days INTEGER NOT NULL DEFAULT 0,
    srs_repetitions INTEGER NOT NULL DEFAULT 0,
    srs_next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    srs_last_quality INTEGER NOT NULL DEFAULT 0,

    -- Mastery
    mastery TEXT NOT NULL DEFAULT 'unknown' 
        CHECK (mastery IN ('unknown', 'seen', 'learning', 'familiar', 'mastered')),

    -- History counters
    times_seen INTEGER NOT NULL DEFAULT 0,
    times_correct INTEGER NOT NULL DEFAULT 0,
    times_incorrect INTEGER NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_correct_at TIMESTAMPTZ,
    last_incorrect_at TIMESTAMPTZ,

    -- Context (arrays stored as JSONB for flexibility)
    source_lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_exercise_ids JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One item per user per content item
    UNIQUE(user_id, item_id)
);

-- ============================================================
-- 2. PLACEMENT_RESULTS — Placement Test Outcomes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.placement_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Result data (the full result object from placement engine)
    result_data JSONB NOT NULL,           -- Full placement result JSON
    
    -- Key extracted fields for querying
    recommended_level TEXT,               -- "HSK1", "HSK2", etc.
    total_score NUMERIC(5,2),
    profile_answers JSONB,                -- User's profile question answers
    
    -- Metadata
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. ADD COLUMNS TO learner_profiles
-- ============================================================

-- Training mode configuration (Parcours Inversé, Coach Autonome settings)
ALTER TABLE public.learner_profiles
    ADD COLUMN IF NOT EXISTS training_mode_config JSONB DEFAULT '{}'::jsonb;

-- Extended gamification state that doesn't fit in existing columns
-- (sessions_history, daily counters, last_activity_date)
ALTER TABLE public.learner_profiles
    ADD COLUMN IF NOT EXISTS gamification_extended JSONB DEFAULT '{}'::jsonb;

-- Sync versioning — incremented on each client write
-- Server uses this for conflict detection (last-write-wins with version check)
ALTER TABLE public.learner_profiles
    ADD COLUMN IF NOT EXISTS sync_version INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Knowledge items: fast lookup by user
CREATE INDEX IF NOT EXISTS idx_knowledge_items_user 
    ON public.user_knowledge_items(user_id);

-- Knowledge items: SRS review queue (items due for review)
CREATE INDEX IF NOT EXISTS idx_knowledge_items_review 
    ON public.user_knowledge_items(user_id, srs_next_review_at)
    WHERE times_seen > 0;

-- Knowledge items: mastery queries
CREATE INDEX IF NOT EXISTS idx_knowledge_items_mastery 
    ON public.user_knowledge_items(user_id, mastery);

-- Knowledge items: by level
CREATE INDEX IF NOT EXISTS idx_knowledge_items_level 
    ON public.user_knowledge_items(user_id, level);

-- Placement results: by user
CREATE INDEX IF NOT EXISTS idx_placement_results_user 
    ON public.placement_results(user_id);

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Auto-update updated_at on knowledge items
CREATE OR REPLACE TRIGGER update_knowledge_items_updated_at 
    BEFORE UPDATE ON public.user_knowledge_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- user_knowledge_items: Users can only access their own items
ALTER TABLE public.user_knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_items_select_own" ON public.user_knowledge_items
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "knowledge_items_insert_own" ON public.user_knowledge_items
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "knowledge_items_update_own" ON public.user_knowledge_items
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "knowledge_items_delete_own" ON public.user_knowledge_items
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- placement_results: Users can only access their own results
ALTER TABLE public.placement_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "placement_results_select_own" ON public.placement_results
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "placement_results_insert_own" ON public.placement_results
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- Service role bypass (for API routes using service role client)
-- Note: Service role client already bypasses RLS by default in Supabase.
-- The above policies are for anon/authenticated direct access.
