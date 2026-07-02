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

-- ============================================================
-- Lingullio - Row Level Security Policies
-- Migration: 00002_rls_policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_point_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stroke_order_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_option_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handwriting_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_section_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: get app user ID from auth ID
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_app_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_app_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role IN ('admin', 'editor', 'reviewer')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS: own profile read/update, admins see all
-- ============================================================

CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth_id = auth.uid() OR public.is_admin_or_editor());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY users_admin_all ON public.users
  FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- LEARNER PROFILES: own profile only, admins see all
-- ============================================================

CREATE POLICY learner_profiles_select ON public.learner_profiles
  FOR SELECT USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

CREATE POLICY learner_profiles_insert ON public.learner_profiles
  FOR INSERT WITH CHECK (
    user_id = public.get_app_user_id()
  );

CREATE POLICY learner_profiles_update ON public.learner_profiles
  FOR UPDATE USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

-- ============================================================
-- LICENSES: own licenses only, admins see all
-- ============================================================

CREATE POLICY licenses_select ON public.licenses
  FOR SELECT USING (
    user_id = public.get_app_user_id()
    OR email = (SELECT email FROM public.users WHERE auth_id = auth.uid())
    OR public.is_admin_or_editor()
  );

CREATE POLICY licenses_admin_manage ON public.licenses
  FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- CONTENT TABLES: published content readable by all authenticated users
-- Admin/editor can manage all content
-- ============================================================

-- Courses
CREATE POLICY courses_select ON public.courses
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY courses_admin ON public.courses
  FOR ALL USING (public.is_admin_or_editor());

-- Course translations
CREATE POLICY course_translations_select ON public.course_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND (c.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY course_translations_admin ON public.course_translations
  FOR ALL USING (public.is_admin_or_editor());

-- Modules
CREATE POLICY modules_select ON public.modules
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY modules_admin ON public.modules
  FOR ALL USING (public.is_admin_or_editor());

-- Module translations
CREATE POLICY module_translations_select ON public.module_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_id AND (m.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY module_translations_admin ON public.module_translations
  FOR ALL USING (public.is_admin_or_editor());

-- Lessons
CREATE POLICY lessons_select ON public.lessons
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY lessons_admin ON public.lessons
  FOR ALL USING (public.is_admin_or_editor());

-- Lesson translations
CREATE POLICY lesson_translations_select ON public.lesson_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id AND (l.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY lesson_translations_admin ON public.lesson_translations
  FOR ALL USING (public.is_admin_or_editor());

-- Grammar points
CREATE POLICY grammar_points_select ON public.grammar_points
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY grammar_points_admin ON public.grammar_points
  FOR ALL USING (public.is_admin_or_editor());

-- Grammar point translations
CREATE POLICY grammar_translations_select ON public.grammar_point_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.grammar_points gp
      WHERE gp.id = grammar_point_id AND (gp.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY grammar_translations_admin ON public.grammar_point_translations
  FOR ALL USING (public.is_admin_or_editor());

-- Vocabulary items
CREATE POLICY vocabulary_select ON public.vocabulary_items
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY vocabulary_admin ON public.vocabulary_items
  FOR ALL USING (public.is_admin_or_editor());

-- Vocabulary translations
CREATE POLICY vocab_translations_select ON public.vocabulary_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vocabulary_items v
      WHERE v.id = vocabulary_id AND (v.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY vocab_translations_admin ON public.vocabulary_translations
  FOR ALL USING (public.is_admin_or_editor());

-- Characters
CREATE POLICY characters_select ON public.characters
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY characters_admin ON public.characters
  FOR ALL USING (public.is_admin_or_editor());

-- Character translations
CREATE POLICY char_translations_select ON public.character_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id AND (c.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY char_translations_admin ON public.character_translations
  FOR ALL USING (public.is_admin_or_editor());

-- Stroke order data
CREATE POLICY stroke_order_select ON public.stroke_order_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id AND (c.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY stroke_order_admin ON public.stroke_order_data
  FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- EXERCISES: published readable, admin manages
-- ============================================================

CREATE POLICY exercises_select ON public.exercises
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY exercises_admin ON public.exercises
  FOR ALL USING (public.is_admin_or_editor());

CREATE POLICY exercise_translations_select ON public.exercise_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id AND (e.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY exercise_translations_admin ON public.exercise_translations
  FOR ALL USING (public.is_admin_or_editor());

CREATE POLICY exercise_options_select ON public.exercise_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id AND (e.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY exercise_options_admin ON public.exercise_options
  FOR ALL USING (public.is_admin_or_editor());

CREATE POLICY exercise_option_translations_select ON public.exercise_option_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exercise_options eo
      JOIN public.exercises e ON e.id = eo.exercise_id
      WHERE eo.id = option_id AND (e.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY exercise_option_translations_admin ON public.exercise_option_translations
  FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- USER DATA: own data only, admins see all
-- ============================================================

-- Attempts
CREATE POLICY attempts_select ON public.attempts
  FOR SELECT USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

CREATE POLICY attempts_insert ON public.attempts
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

-- Handwriting attempts
CREATE POLICY handwriting_select ON public.handwriting_attempts
  FOR SELECT USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

CREATE POLICY handwriting_insert ON public.handwriting_attempts
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

-- Progress snapshots
CREATE POLICY progress_select ON public.progress_snapshots
  FOR SELECT USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

CREATE POLICY progress_insert ON public.progress_snapshots
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

-- Recommendations
CREATE POLICY recommendations_select ON public.user_recommendations
  FOR SELECT USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

CREATE POLICY recommendations_update ON public.user_recommendations
  FOR UPDATE USING (user_id = public.get_app_user_id());

CREATE POLICY recommendations_admin ON public.user_recommendations
  FOR ALL USING (public.is_admin_or_editor());

-- Spaced repetition
CREATE POLICY spaced_rep_select ON public.spaced_repetition_items
  FOR SELECT USING (user_id = public.get_app_user_id());

CREATE POLICY spaced_rep_insert ON public.spaced_repetition_items
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY spaced_rep_update ON public.spaced_repetition_items
  FOR UPDATE USING (user_id = public.get_app_user_id());

-- ============================================================
-- MOCK EXAMS: published readable, admin manages
-- ============================================================

CREATE POLICY mock_exams_select ON public.mock_exams
  FOR SELECT USING (status = 'published' OR public.is_admin_or_editor());

CREATE POLICY mock_exams_admin ON public.mock_exams
  FOR ALL USING (public.is_admin_or_editor());

CREATE POLICY mock_exam_translations_select ON public.mock_exam_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mock_exams me
      WHERE me.id = mock_exam_id AND (me.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY mock_exam_translations_admin ON public.mock_exam_translations
  FOR ALL USING (public.is_admin_or_editor());

CREATE POLICY mock_exam_sections_select ON public.mock_exam_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mock_exams me
      WHERE me.id = mock_exam_id AND (me.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY mock_exam_sections_admin ON public.mock_exam_sections
  FOR ALL USING (public.is_admin_or_editor());

CREATE POLICY mock_exam_section_translations_select ON public.mock_exam_section_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mock_exam_sections ms
      JOIN public.mock_exams me ON me.id = ms.mock_exam_id
      WHERE ms.id = section_id AND (me.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY mock_exam_section_translations_admin ON public.mock_exam_section_translations
  FOR ALL USING (public.is_admin_or_editor());

CREATE POLICY mock_exam_questions_select ON public.mock_exam_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mock_exam_sections ms
      JOIN public.mock_exams me ON me.id = ms.mock_exam_id
      WHERE ms.id = section_id AND (me.status = 'published' OR public.is_admin_or_editor())
    )
  );

CREATE POLICY mock_exam_questions_admin ON public.mock_exam_questions
  FOR ALL USING (public.is_admin_or_editor());

-- Mock exam attempts
CREATE POLICY mock_attempts_select ON public.mock_exam_attempts
  FOR SELECT USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

CREATE POLICY mock_attempts_insert ON public.mock_exam_attempts
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY mock_attempts_update ON public.mock_exam_attempts
  FOR UPDATE USING (user_id = public.get_app_user_id());

-- ============================================================
-- AUDIO FILES: readable by all authenticated
-- ============================================================

CREATE POLICY audio_select ON public.audio_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY audio_admin ON public.audio_files
  FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- AI FEEDBACK LOGS: own data, admin reads all
-- ============================================================

CREATE POLICY ai_feedback_select ON public.ai_feedback_logs
  FOR SELECT USING (
    user_id = public.get_app_user_id() OR public.is_admin_or_editor()
  );

CREATE POLICY ai_feedback_insert ON public.ai_feedback_logs
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

-- ============================================================
-- ADMIN TABLES: admin only
-- ============================================================

CREATE POLICY admin_actions_select ON public.admin_actions
  FOR SELECT USING (public.is_admin_or_editor());

CREATE POLICY admin_actions_insert ON public.admin_actions
  FOR INSERT WITH CHECK (
    admin_user_id = public.get_app_user_id()
    AND public.is_admin_or_editor()
  );

CREATE POLICY content_versions_select ON public.content_versions
  FOR SELECT USING (public.is_admin_or_editor());

CREATE POLICY content_versions_insert ON public.content_versions
  FOR INSERT WITH CHECK (public.is_admin_or_editor());

-- ============================================================
-- USER PREFERENCES: own only
-- ============================================================

CREATE POLICY preferences_select ON public.user_preferences
  FOR SELECT USING (user_id = public.get_app_user_id());

CREATE POLICY preferences_insert ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY preferences_update ON public.user_preferences
  FOR UPDATE USING (user_id = public.get_app_user_id());

CREATE POLICY preferences_delete ON public.user_preferences
  FOR DELETE USING (user_id = public.get_app_user_id());

-- ============================================================
-- Lingullio - Seed Data for Development
-- Run with: supabase db seed or manually
-- ============================================================

-- ============================================================
-- COURSES (HSK 1-9)
-- ============================================================

INSERT INTO public.courses (id, exam_type, slug, status, version) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'HSK', 'hsk-1', 'published', 1),
  ('a0000000-0000-0000-0000-000000000002', 'HSK', 'hsk-2', 'published', 1),
  ('a0000000-0000-0000-0000-000000000003', 'HSK', 'hsk-3', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000004', 'HSK', 'hsk-4', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000005', 'HSK', 'hsk-5', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000006', 'HSK', 'hsk-6', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000007', 'HSK', 'hsk-7', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000008', 'HSK', 'hsk-8', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000009', 'HSK', 'hsk-9', 'draft', 1);

-- Course translations (FR + EN for published courses)
INSERT INTO public.course_translations (course_id, locale, title, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'fr', 'HSK 1', 'Preparation complete au HSK niveau 1. 500 mots, 150 caracteres, grammaire de base.'),
  ('a0000000-0000-0000-0000-000000000001', 'en', 'HSK 1', 'Complete HSK Level 1 preparation. 500 words, 150 characters, basic grammar.'),
  ('a0000000-0000-0000-0000-000000000002', 'fr', 'HSK 2', 'Preparation complete au HSK niveau 2. 1272 mots, 300 caracteres, grammaire elementaire.'),
  ('a0000000-0000-0000-0000-000000000002', 'en', 'HSK 2', 'Complete HSK Level 2 preparation. 1272 words, 300 characters, elementary grammar.'),
  ('a0000000-0000-0000-0000-000000000003', 'fr', 'HSK 3', 'Preparation complete au HSK niveau 3. 2245 mots, 600 caracteres, grammaire intermediaire.'),
  ('a0000000-0000-0000-0000-000000000003', 'en', 'HSK 3', 'Complete HSK Level 3 preparation. 2245 words, 600 characters, intermediate grammar.');

-- ============================================================
-- MODULES for HSK 1
-- ============================================================

INSERT INTO public.modules (id, course_id, sort_order, status, estimated_duration_minutes) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'published', 120),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 2, 'published', 150),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 3, 'published', 180);

INSERT INTO public.module_translations (module_id, locale, title, description, objectives) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'fr', 'Les bases du chinois', 'Decouvrez les fondamentaux : pinyin, tons, premiers caracteres et salutations.', '["Maitriser le systeme pinyin", "Reconnaitre les 4 tons", "Ecrire les 20 premiers caracteres", "Se presenter en chinois"]'),
  ('b0000000-0000-0000-0000-000000000001', 'en', 'Chinese basics', 'Discover the fundamentals: pinyin, tones, first characters and greetings.', '["Master the pinyin system", "Recognize the 4 tones", "Write the first 20 characters", "Introduce yourself in Chinese"]'),
  ('b0000000-0000-0000-0000-000000000002', 'fr', 'La vie quotidienne', 'Parlez de votre quotidien : famille, nourriture, nombres et dates.', '["Presenter sa famille", "Commander au restaurant", "Compter jusqu''a 100", "Dire la date et l''heure"]'),
  ('b0000000-0000-0000-0000-000000000002', 'en', 'Daily life', 'Talk about your daily life: family, food, numbers and dates.', '["Introduce your family", "Order at a restaurant", "Count to 100", "Say the date and time"]'),
  ('b0000000-0000-0000-0000-000000000003', 'fr', 'Communication essentielle', 'Exprimez-vous dans les situations courantes : transport, achats, directions.', '["Demander son chemin", "Faire des achats", "Prendre les transports", "Exprimer des preferences"]'),
  ('b0000000-0000-0000-0000-000000000003', 'en', 'Essential communication', 'Express yourself in common situations: transport, shopping, directions.', '["Ask for directions", "Go shopping", "Use public transport", "Express preferences"]');

-- ============================================================
-- LESSONS for Module 1
-- ============================================================

INSERT INTO public.lessons (id, module_id, sort_order, lesson_type, status, estimated_duration_minutes) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 'standard', 'published', 25),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 2, 'standard', 'published', 30),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 3, 'practice', 'published', 20),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 4, 'review', 'published', 15);

INSERT INTO public.lesson_translations (lesson_id, locale, title, description) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'fr', 'Le systeme pinyin', 'Decouvrez le pinyin, le systeme de romanisation du chinois mandarin.'),
  ('c0000000-0000-0000-0000-000000000001', 'en', 'The pinyin system', 'Discover pinyin, the romanization system for Mandarin Chinese.'),
  ('c0000000-0000-0000-0000-000000000002', 'fr', 'Les quatre tons', 'Apprenez a distinguer et prononcer les quatre tons du chinois.'),
  ('c0000000-0000-0000-0000-000000000002', 'en', 'The four tones', 'Learn to distinguish and pronounce the four tones of Chinese.'),
  ('c0000000-0000-0000-0000-000000000003', 'fr', 'Pratique : pinyin et tons', 'Exercices de reconnaissance et prononciation.'),
  ('c0000000-0000-0000-0000-000000000003', 'en', 'Practice: pinyin and tones', 'Recognition and pronunciation exercises.'),
  ('c0000000-0000-0000-0000-000000000004', 'fr', 'Revision du module 1', 'Revisez les concepts cles du module.'),
  ('c0000000-0000-0000-0000-000000000004', 'en', 'Module 1 review', 'Review the key concepts of the module.');

-- ============================================================
-- SAMPLE VOCABULARY (HSK 1 first 20 words)
-- ============================================================

INSERT INTO public.vocabulary_items (id, simplified, traditional, pinyin, hsk_level, frequency_rank, word_type, theme, status) VALUES
  ('d0000000-0000-0000-0000-000000000001', '你', NULL, 'ni3', '1', 1, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000002', '好', NULL, 'hao3', '1', 2, 'adjective', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000003', '我', NULL, 'wo3', '1', 3, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000004', '是', NULL, 'shi4', '1', 4, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000005', '的', NULL, 'de', '1', 5, 'particle', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000006', '了', NULL, 'le', '1', 6, 'particle', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000007', '不', NULL, 'bu4', '1', 7, 'adverb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000008', '在', NULL, 'zai4', '1', 8, 'preposition', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000009', '人', NULL, 'ren2', '1', 9, 'noun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000010', '有', NULL, 'you3', '1', 10, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000011', '他', NULL, 'ta1', '1', 11, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000012', '这', NULL, 'zhe4', '1', 12, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000013', '中', NULL, 'zhong1', '1', 13, 'noun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000014', '大', NULL, 'da4', '1', 14, 'adjective', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000015', '来', NULL, 'lai2', '1', 15, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000016', '上', NULL, 'shang4', '1', 16, 'preposition', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000017', '国', NULL, 'guo2', '1', 17, 'noun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000018', '个', NULL, 'ge4', '1', 18, 'measure_word', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000019', '到', NULL, 'dao4', '1', 19, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000020', '说', NULL, 'shuo1', '1', 20, 'verb', 'basic', 'published');

-- Vocabulary translations (FR + EN)
INSERT INTO public.vocabulary_translations (vocabulary_id, locale, meaning, example_sentence, example_pinyin, example_translation) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'fr', 'tu, vous', '你好！', 'ni3 hao3', 'Bonjour !'),
  ('d0000000-0000-0000-0000-000000000001', 'en', 'you', '你好！', 'ni3 hao3', 'Hello!'),
  ('d0000000-0000-0000-0000-000000000002', 'fr', 'bon, bien', '很好', 'hen3 hao3', 'Tres bien'),
  ('d0000000-0000-0000-0000-000000000002', 'en', 'good, well', '很好', 'hen3 hao3', 'Very good'),
  ('d0000000-0000-0000-0000-000000000003', 'fr', 'je, moi', '我是学生。', 'wo3 shi4 xue2sheng', 'Je suis etudiant.'),
  ('d0000000-0000-0000-0000-000000000003', 'en', 'I, me', '我是学生。', 'wo3 shi4 xue2sheng', 'I am a student.'),
  ('d0000000-0000-0000-0000-000000000004', 'fr', 'etre', '他是老师。', 'ta1 shi4 lao3shi1', 'Il est professeur.'),
  ('d0000000-0000-0000-0000-000000000004', 'en', 'to be', '他是老师。', 'ta1 shi4 lao3shi1', 'He is a teacher.'),
  ('d0000000-0000-0000-0000-000000000005', 'fr', 'particule structurale', '我的书', 'wo3 de shu1', 'Mon livre'),
  ('d0000000-0000-0000-0000-000000000005', 'en', 'structural particle', '我的书', 'wo3 de shu1', 'My book'),
  ('d0000000-0000-0000-0000-000000000010', 'fr', 'avoir, il y a', '我有一本书。', 'wo3 you3 yi4 ben3 shu1', 'J''ai un livre.'),
  ('d0000000-0000-0000-0000-000000000010', 'en', 'to have, there is', '我有一本书。', 'wo3 you3 yi4 ben3 shu1', 'I have a book.');

-- ============================================================
-- SAMPLE GRAMMAR POINTS (HSK 1)
-- ============================================================

INSERT INTO public.grammar_points (id, pattern, hsk_level, sort_order, difficulty, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'S + 是 + N', '1', 1, 1, 'published'),
  ('e0000000-0000-0000-0000-000000000002', 'S + 不 + V', '1', 2, 1, 'published'),
  ('e0000000-0000-0000-0000-000000000003', 'S + 很 + Adj', '1', 3, 1, 'published'),
  ('e0000000-0000-0000-0000-000000000004', 'S + V + 了', '1', 4, 2, 'published'),
  ('e0000000-0000-0000-0000-000000000005', '在 + Place + V', '1', 5, 2, 'published');

INSERT INTO public.grammar_point_translations (grammar_point_id, locale, title, explanation_html, examples, common_errors) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'fr', 'Phrase avec 是 (etre)', '<p>Le verbe <strong>是</strong> (shi) est utilise pour identifier ou classifier. Equivalent de "etre" en francais.</p><p>Structure : Sujet + 是 + Nom</p>', '[{"zh": "我是学生。", "pinyin": "Wo shi xuesheng.", "translation": "Je suis etudiant."}, {"zh": "他是老师。", "pinyin": "Ta shi laoshi.", "translation": "Il est professeur."}]', '[{"error": "我是好。", "correction": "我很好。", "explanation": "On n''utilise pas 是 devant un adjectif. Utilisez 很 a la place."}]'),
  ('e0000000-0000-0000-0000-000000000001', 'en', 'Sentences with 是 (to be)', '<p>The verb <strong>是</strong> (shi) is used to identify or classify. Equivalent to "to be" in English.</p><p>Structure: Subject + 是 + Noun</p>', '[{"zh": "我是学生。", "pinyin": "Wo shi xuesheng.", "translation": "I am a student."}, {"zh": "他是老师。", "pinyin": "Ta shi laoshi.", "translation": "He is a teacher."}]', '[{"error": "我是好。", "correction": "我很好。", "explanation": "Do not use 是 before an adjective. Use 很 instead."}]'),
  ('e0000000-0000-0000-0000-000000000002', 'fr', 'Negation avec 不', '<p>La negation se forme en placant <strong>不</strong> (bu) avant le verbe ou l''adjectif.</p><p>Structure : Sujet + 不 + Verbe</p>', '[{"zh": "我不是老师。", "pinyin": "Wo bu shi laoshi.", "translation": "Je ne suis pas professeur."}, {"zh": "他不去。", "pinyin": "Ta bu qu.", "translation": "Il n''y va pas."}]', '[]'),
  ('e0000000-0000-0000-0000-000000000002', 'en', 'Negation with 不', '<p>Negation is formed by placing <strong>不</strong> (bu) before the verb or adjective.</p><p>Structure: Subject + 不 + Verb</p>', '[{"zh": "我不是老师。", "pinyin": "Wo bu shi laoshi.", "translation": "I am not a teacher."}, {"zh": "他不去。", "pinyin": "Ta bu qu.", "translation": "He is not going."}]', '[]');

-- ============================================================
-- SAMPLE CHARACTERS (HSK 1 first 10)
-- ============================================================

INSERT INTO public.characters (id, character, pinyin, radical, stroke_count, hsk_level, frequency_rank, status) VALUES
  ('f0000000-0000-0000-0000-000000000001', '你', 'ni3', '亻', 7, '1', 1, 'published'),
  ('f0000000-0000-0000-0000-000000000002', '好', 'hao3', '女', 6, '1', 2, 'published'),
  ('f0000000-0000-0000-0000-000000000003', '我', 'wo3', '戈', 7, '1', 3, 'published'),
  ('f0000000-0000-0000-0000-000000000004', '是', 'shi4', '日', 9, '1', 4, 'published'),
  ('f0000000-0000-0000-0000-000000000005', '人', 'ren2', '人', 2, '1', 5, 'published'),
  ('f0000000-0000-0000-0000-000000000006', '大', 'da4', '大', 3, '1', 6, 'published'),
  ('f0000000-0000-0000-0000-000000000007', '中', 'zhong1', '丨', 4, '1', 7, 'published'),
  ('f0000000-0000-0000-0000-000000000008', '国', 'guo2', '囗', 8, '1', 8, 'published'),
  ('f0000000-0000-0000-0000-000000000009', '学', 'xue2', '子', 8, '1', 9, 'published'),
  ('f0000000-0000-0000-0000-000000000010', '生', 'sheng1', '生', 5, '1', 10, 'published');

INSERT INTO public.character_translations (character_id, locale, meaning, mnemonic) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'fr', 'tu, vous', 'Un personne (亻) debout avec le numero sept (七) en dessous'),
  ('f0000000-0000-0000-0000-000000000001', 'en', 'you', 'A person (亻) standing with the number seven (七) below'),
  ('f0000000-0000-0000-0000-000000000002', 'fr', 'bon, bien', 'Une femme (女) avec son enfant (子) : tout va bien'),
  ('f0000000-0000-0000-0000-000000000002', 'en', 'good, well', 'A woman (女) with her child (子): all is well'),
  ('f0000000-0000-0000-0000-000000000005', 'fr', 'personne, homme', 'Deux traits qui representent une personne debout'),
  ('f0000000-0000-0000-0000-000000000005', 'en', 'person, people', 'Two strokes representing a person standing'),
  ('f0000000-0000-0000-0000-000000000006', 'fr', 'grand', 'Une personne (人) avec les bras grands ouverts'),
  ('f0000000-0000-0000-0000-000000000006', 'en', 'big, large', 'A person (人) with arms spread wide open');

-- ============================================================
-- SAMPLE EXERCISES (HSK 1 Module 1 Lesson 1)
-- ============================================================

INSERT INTO public.exercises (id, lesson_id, exercise_type, difficulty, points, estimated_duration_seconds, skill_tags, hsk_level, sort_order, status) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'mcq', 1, 10, 30, '{vocabulary}', '1', 1, 'published'),
  ('a1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'mcq', 1, 10, 30, '{vocabulary}', '1', 2, 'published'),
  ('a1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'fill_blank', 1, 15, 45, '{grammar,vocabulary}', '1', 3, 'published'),
  ('a1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'matching', 1, 20, 60, '{vocabulary}', '1', 4, 'published'),
  ('a1000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'character_recognition', 1, 10, 20, '{characters}', '1', 5, 'published');

INSERT INTO public.exercise_translations (exercise_id, locale, prompt, instruction, explanation, hint) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'fr', 'Que signifie 你好 ?', 'Choisissez la bonne traduction.', '你好 (ni hao) est la salutation standard en chinois mandarin.', 'Pensez a une salutation courante.'),
  ('a1000000-0000-0000-0000-000000000001', 'en', 'What does 你好 mean?', 'Choose the correct translation.', '你好 (ni hao) is the standard greeting in Mandarin Chinese.', 'Think of a common greeting.'),
  ('a1000000-0000-0000-0000-000000000002', 'fr', 'Comment dit-on "je" en chinois ?', 'Choisissez le bon caractere.', '我 (wo) est le pronom de la premiere personne du singulier.', 'C''est l''un des premiers mots appris.'),
  ('a1000000-0000-0000-0000-000000000002', 'en', 'How do you say "I" in Chinese?', 'Choose the correct character.', '我 (wo) is the first person singular pronoun.', 'It is one of the first words learned.'),
  ('a1000000-0000-0000-0000-000000000003', 'fr', '我___学生。(Je suis etudiant.)', 'Completez avec le mot correct.', '是 (shi) est utilise pour identifier ou classifier, similaire a "etre".', 'Un verbe d''identification.'),
  ('a1000000-0000-0000-0000-000000000003', 'en', '我___学生。(I am a student.)', 'Complete with the correct word.', '是 (shi) is used to identify or classify, similar to "to be".', 'A verb of identification.');

-- Exercise options for MCQ exercises
INSERT INTO public.exercise_options (id, exercise_id, sort_order, is_correct) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 1, true),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 2, false),
  ('a2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 3, false),
  ('a2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 4, false),
  ('a2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 1, false),
  ('a2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 2, true),
  ('a2000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 3, false),
  ('a2000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 4, false);

INSERT INTO public.exercise_option_translations (option_id, locale, content, error_explanation) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'fr', 'Bonjour', NULL),
  ('a2000000-0000-0000-0000-000000000001', 'en', 'Hello', NULL),
  ('a2000000-0000-0000-0000-000000000002', 'fr', 'Au revoir', '再见 (zaijian) signifie "au revoir", pas 你好.'),
  ('a2000000-0000-0000-0000-000000000002', 'en', 'Goodbye', '再见 (zaijian) means "goodbye", not 你好.'),
  ('a2000000-0000-0000-0000-000000000003', 'fr', 'Merci', '谢谢 (xiexie) signifie "merci", pas 你好.'),
  ('a2000000-0000-0000-0000-000000000003', 'en', 'Thank you', '谢谢 (xiexie) means "thank you", not 你好.'),
  ('a2000000-0000-0000-0000-000000000004', 'fr', 'Pardon', '对不起 (duibuqi) signifie "pardon", pas 你好.'),
  ('a2000000-0000-0000-0000-000000000004', 'en', 'Sorry', '对不起 (duibuqi) means "sorry", not 你好.'),
  ('a2000000-0000-0000-0000-000000000005', 'fr', '他 (ta)', '他 signifie "il/lui", pas "je".'),
  ('a2000000-0000-0000-0000-000000000005', 'en', '他 (ta)', '他 means "he/him", not "I".'),
  ('a2000000-0000-0000-0000-000000000006', 'fr', '我 (wo)', NULL),
  ('a2000000-0000-0000-0000-000000000006', 'en', '我 (wo)', NULL),
  ('a2000000-0000-0000-0000-000000000007', 'fr', '你 (ni)', '你 signifie "tu/vous", pas "je".'),
  ('a2000000-0000-0000-0000-000000000007', 'en', '你 (ni)', '你 means "you", not "I".'),
  ('a2000000-0000-0000-0000-000000000008', 'fr', '她 (ta)', '她 signifie "elle", pas "je".'),
  ('a2000000-0000-0000-0000-000000000008', 'en', '她 (ta)', '她 means "she/her", not "I".');

-- ============================================================
-- ADMIN USER (for development only - will be created via Supabase Auth)
-- Note: In development, create this user via Supabase Auth first,
-- then update the auth_id field
-- ============================================================

-- Placeholder admin user (auth_id will be set after Supabase Auth creation)
INSERT INTO public.users (id, email, display_name, role, interface_language, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@lingullio.com', 'Admin Lingullio', 'admin', 'fr', true);

-- ============================================================
-- SAMPLE LICENSES (for testing activation flow)
-- ============================================================

INSERT INTO public.licenses (id, email, activation_code, course_id, status, duration_months) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'test@example.com', 'TEST1234', 'a0000000-0000-0000-0000-000000000001', 'pending', 12),
  ('a3000000-0000-0000-0000-000000000002', 'demo@example.com', 'DEMO5678', 'a0000000-0000-0000-0000-000000000001', 'pending', 12);
