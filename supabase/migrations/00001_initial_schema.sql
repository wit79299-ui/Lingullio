-- ============================================================
-- Lingullio - Initial Database Schema
-- Migration: 00001_initial_schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS AND ROLES
-- ============================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- links to Supabase Auth
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'learner'
        CHECK (role IN ('admin', 'editor', 'reviewer', 'learner')),
    interface_language TEXT NOT NULL DEFAULT 'fr',
    is_active BOOLEAN NOT NULL DEFAULT true,
    first_login_code TEXT,
    first_login_code_expires_at TIMESTAMPTZ,
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.learner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_exam TEXT NOT NULL,
    target_level TEXT NOT NULL,
    objective TEXT,
    exam_date DATE,
    target_score INTEGER,
    weekly_hours NUMERIC(4,1),
    initial_score INTEGER,
    current_estimated_score INTEGER,
    expected_score_at_date INTEGER,
    confidence_level TEXT DEFAULT 'low'
        CHECK (confidence_level IN ('low', 'medium', 'high')),
    preparation_status TEXT DEFAULT 'not_started'
        CHECK (preparation_status IN (
            'not_started', 'in_progress', 'on_track',
            'near_target', 'ready', 'at_risk'
        )),
    total_study_time_minutes INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN DEFAULT false,
    diagnostic_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, target_exam, target_level)
);

-- ============================================================
-- LICENSES
-- ============================================================

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.course_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    UNIQUE(course_id, locale)
);

CREATE TABLE public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    shopify_order_id TEXT,
    shopify_order_number TEXT,
    activation_code TEXT UNIQUE NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'refunded')),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    duration_months INTEGER NOT NULL DEFAULT 12,
    extended_months INTEGER DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id),
    revocation_reason TEXT,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULES AND LESSONS
-- ============================================================

CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.module_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    objectives JSONB DEFAULT '[]',
    UNIQUE(module_id, locale)
);

CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    lesson_type TEXT NOT NULL DEFAULT 'standard'
        CHECK (lesson_type IN (
            'standard', 'review', 'diagnostic', 'mock_exam',
            'practice', 'assessment'
        )),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    estimated_duration_minutes INTEGER,
    prerequisites JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lesson_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_html TEXT,
    UNIQUE(lesson_id, locale)
);

-- ============================================================
-- VOCABULARY, GRAMMAR, CHARACTERS
-- ============================================================

CREATE TABLE public.grammar_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern TEXT NOT NULL,
    hsk_level TEXT NOT NULL,
    sort_order INTEGER,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.grammar_point_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grammar_point_id UUID NOT NULL REFERENCES public.grammar_points(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    explanation_html TEXT NOT NULL,
    examples JSONB DEFAULT '[]',
    common_errors JSONB DEFAULT '[]',
    UNIQUE(grammar_point_id, locale)
);

CREATE TABLE public.vocabulary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simplified TEXT NOT NULL,
    traditional TEXT,
    pinyin TEXT NOT NULL,
    audio_url TEXT,
    hsk_level TEXT NOT NULL,
    frequency_rank INTEGER,
    radical TEXT,
    stroke_count INTEGER,
    word_type TEXT,
    theme TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vocabulary_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vocabulary_id UUID NOT NULL REFERENCES public.vocabulary_items(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example_sentence TEXT,
    example_pinyin TEXT,
    example_translation TEXT,
    usage_notes TEXT,
    UNIQUE(vocabulary_id, locale)
);

CREATE TABLE public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character TEXT NOT NULL UNIQUE,
    pinyin TEXT NOT NULL,
    radical TEXT,
    stroke_count INTEGER NOT NULL,
    hsk_level TEXT NOT NULL,
    frequency_rank INTEGER,
    decomposition TEXT,
    audio_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.character_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    meaning TEXT NOT NULL,
    mnemonic TEXT,
    UNIQUE(character_id, locale)
);

CREATE TABLE public.stroke_order_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    strokes JSONB NOT NULL,
    medians JSONB,
    svg_data TEXT,
    animation_data JSONB,
    bounding_box JSONB,
    source TEXT DEFAULT 'makemeahanzi',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(character_id)
);

-- ============================================================
-- EXERCISES
-- ============================================================

CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    exercise_type TEXT NOT NULL
        CHECK (exercise_type IN (
            'mcq', 'multiple_choice', 'fill_blank', 'matching',
            'reorder', 'dictation', 'listening_comprehension',
            'reading_comprehension', 'short_answer', 'essay',
            'speaking', 'flashcard', 'character_recognition',
            'handwriting', 'stroke_order', 'handwriting_comparison',
            'controlled_translation', 'timed_exam'
        )),
    difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    points INTEGER NOT NULL DEFAULT 10,
    estimated_duration_seconds INTEGER,
    audio_url TEXT,
    image_url TEXT,
    skill_tags TEXT[] NOT NULL DEFAULT '{}',
    hsk_level TEXT,
    grammar_point_id UUID REFERENCES public.grammar_points(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exercise_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    prompt TEXT NOT NULL,
    instruction TEXT,
    explanation TEXT,
    hint TEXT,
    UNIQUE(exercise_id, locale)
);

CREATE TABLE public.exercise_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exercise_option_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES public.exercise_options(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    content TEXT NOT NULL,
    error_explanation TEXT,
    UNIQUE(option_id, locale)
);

-- ============================================================
-- PROGRESSION AND ATTEMPTS
-- ============================================================

CREATE TABLE public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES public.learner_profiles(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    is_correct BOOLEAN,
    score NUMERIC(5,2),
    max_score NUMERIC(5,2),
    user_answer JSONB,
    ai_feedback JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.handwriting_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.characters(id),
    strokes_data JSONB NOT NULL,
    image_url TEXT,
    total_strokes INTEGER,
    time_spent_ms INTEGER,
    difficulty_mode TEXT DEFAULT 'beginner'
        CHECK (difficulty_mode IN ('beginner', 'intermediate', 'advanced', 'exam')),
    score_overall NUMERIC(5,2),
    score_accuracy NUMERIC(5,2),
    score_proportion NUMERIC(5,2),
    score_stroke_order NUMERIC(5,2),
    score_stroke_direction NUMERIC(5,2),
    score_fluidity NUMERIC(5,2),
    score_memorization NUMERIC(5,2),
    feedback JSONB,
    comparison_overlay_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES public.learner_profiles(id),
    snapshot_type TEXT NOT NULL DEFAULT 'daily'
        CHECK (snapshot_type IN ('daily', 'weekly', 'post_exam', 'diagnostic', 'manual')),
    estimated_score INTEGER,
    confidence_level TEXT,
    scores_by_skill JSONB NOT NULL,
    total_exercises_done INTEGER,
    total_correct INTEGER,
    study_time_minutes INTEGER,
    streak_days INTEGER,
    completion_percentage NUMERIC(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES public.learner_profiles(id),
    recommendation_type TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    target_id UUID,
    target_type TEXT,
    reason_key TEXT,
    estimated_duration_minutes INTEGER,
    estimated_score_impact INTEGER,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SPACED REPETITION
-- ============================================================

CREATE TABLE public.spaced_repetition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES public.learner_profiles(id),
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    ease_factor NUMERIC(4,2) DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reviewed_at TIMESTAMPTZ,
    last_quality INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, learner_profile_id, item_type, item_id)
);

-- ============================================================
-- MOCK EXAMS
-- ============================================================

CREATE TABLE public.mock_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id),
    sort_order INTEGER NOT NULL,
    total_duration_minutes INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_exam_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    UNIQUE(mock_exam_id, locale)
);

CREATE TABLE public.mock_exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_exam_section_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.mock_exam_sections(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    instructions TEXT,
    UNIQUE(section_id, locale)
);

CREATE TABLE public.mock_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.mock_exam_sections(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id),
    sort_order INTEGER NOT NULL,
    points INTEGER NOT NULL
);

CREATE TABLE public.mock_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mock_exam_id UUID NOT NULL REFERENCES public.mock_exams(id),
    learner_profile_id UUID NOT NULL REFERENCES public.learner_profiles(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    is_submitted BOOLEAN DEFAULT false,
    total_score NUMERIC(5,2),
    max_score NUMERIC(5,2),
    scores_by_section JSONB,
    time_spent_seconds INTEGER,
    auto_saved_answers JSONB,
    analysis JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIO
-- ============================================================

CREATE TABLE public.audio_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path TEXT NOT NULL,
    public_url TEXT,
    duration_seconds NUMERIC(8,2),
    file_size_bytes INTEGER,
    mime_type TEXT DEFAULT 'audio/mpeg',
    source TEXT DEFAULT 'tts'
        CHECK (source IN ('tts', 'recorded', 'imported')),
    tts_model TEXT,
    tts_voice TEXT,
    reference_type TEXT,
    reference_id UUID,
    transcript TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AI FEEDBACK
-- ============================================================

CREATE TABLE public.ai_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES public.attempts(id),
    feedback_type TEXT NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    model_used TEXT,
    input_text TEXT,
    output_text TEXT,
    structured_feedback JSONB,
    quality_rating INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ADMIN AND LOGS
-- ============================================================

CREATE TABLE public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.users(id),
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by UUID REFERENCES public.users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL,
    UNIQUE(user_id, preference_key)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_learner_profiles_user ON public.learner_profiles(user_id);
CREATE INDEX idx_licenses_user ON public.licenses(user_id);
CREATE INDEX idx_licenses_email ON public.licenses(email);
CREATE INDEX idx_licenses_code ON public.licenses(activation_code);
CREATE INDEX idx_licenses_status ON public.licenses(status);
CREATE INDEX idx_modules_course ON public.modules(course_id);
CREATE INDEX idx_lessons_module ON public.lessons(module_id);
CREATE INDEX idx_exercises_lesson ON public.exercises(lesson_id);
CREATE INDEX idx_exercises_type ON public.exercises(exercise_type);
CREATE INDEX idx_exercises_skill ON public.exercises USING GIN(skill_tags);
CREATE INDEX idx_exercises_level ON public.exercises(hsk_level);
CREATE INDEX idx_attempts_user ON public.attempts(user_id);
CREATE INDEX idx_attempts_exercise ON public.attempts(exercise_id);
CREATE INDEX idx_attempts_profile ON public.attempts(learner_profile_id);
CREATE INDEX idx_handwriting_user ON public.handwriting_attempts(user_id);
CREATE INDEX idx_handwriting_char ON public.handwriting_attempts(character_id);
CREATE INDEX idx_progress_user ON public.progress_snapshots(user_id);
CREATE INDEX idx_progress_profile ON public.progress_snapshots(learner_profile_id);
CREATE INDEX idx_recommendations_user ON public.user_recommendations(user_id);
CREATE INDEX idx_spaced_rep_next ON public.spaced_repetition_items(user_id, next_review_at);
CREATE INDEX idx_vocab_level ON public.vocabulary_items(hsk_level);
CREATE INDEX idx_grammar_level ON public.grammar_points(hsk_level);
CREATE INDEX idx_characters_level ON public.characters(hsk_level);
CREATE INDEX idx_audio_ref ON public.audio_files(reference_type, reference_id);
CREATE INDEX idx_mock_attempts_user ON public.mock_exam_attempts(user_id);
CREATE INDEX idx_admin_actions_admin ON public.admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_target ON public.admin_actions(target_type, target_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learner_profiles_updated_at BEFORE UPDATE ON public.learner_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON public.licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
