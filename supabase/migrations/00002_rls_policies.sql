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
