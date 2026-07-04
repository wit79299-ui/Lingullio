import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  Course,
  ContentStatus,
  License,
  LicenseStatus,
  User,
  Product,
  VocabularyItem,
  GrammarPoint,
  Character,
  Exercise,
  ExerciseType,
} from '@/types/database';

// -------------------------------------------------------------------
// Types for joined/enriched data
// -------------------------------------------------------------------

export interface ProductWithTranslation extends Product {
  translations: Array<{ locale: string; name: string; description: string | null; tagline: string | null }>;
  course_count: number;
  total_learners: number;
}

export interface CourseWithTranslation extends Course {
  translations: Array<{ locale: string; title: string; description: string | null }>;
  module_count: number;
  license_count: number;
}

export interface ModuleWithTranslation {
  id: string;
  course_id: string;
  sort_order: number;
  status: ContentStatus;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  translations: Array<{ locale: string; title: string; description: string | null }>;
  lesson_count: number;
}

export interface LessonWithTranslation {
  id: string;
  module_id: string;
  sort_order: number;
  lesson_type: string;
  status: ContentStatus;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  translations: Array<{ locale: string; title: string; description: string | null }>;
  exercise_count: number;
}

export interface ExerciseWithTranslation extends Exercise {
  translations: Array<{
    locale: string;
    prompt: string;
    instruction: string | null;
    explanation: string | null;
    hint: string | null;
  }>;
  option_count: number;
}

export interface MockExamWithTranslation {
  id: string;
  course_id: string;
  sort_order: number;
  total_duration_minutes: number;
  total_points: number;
  status: ContentStatus;
  created_at: string;
  translations: Array<{ locale: string; title: string; description: string | null }>;
  section_count: number;
  question_count: number;
}

export interface VocabularyWithTranslation extends VocabularyItem {
  translations: Array<{
    locale: string;
    meaning: string;
    example_sentence: string | null;
    example_pinyin: string | null;
    example_translation: string | null;
  }>;
}

export interface GrammarPointWithTranslation extends GrammarPoint {
  translations: Array<{
    locale: string;
    title: string;
    explanation_html: string;
  }>;
}

export interface CharacterWithTranslation extends Character {
  translations: Array<{
    locale: string;
    meaning: string;
    mnemonic: string | null;
  }>;
}

export interface LicenseWithUser extends License {
  user: { display_name: string | null; email: string } | null;
  course: { slug: string } | null;
}

export interface LearnerWithStats {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  learner_profiles: Array<{
    id: string;
    target_exam: string;
    target_level: string;
    preparation_status: string;
    total_study_time_minutes: number;
    streak_days: number;
    longest_streak: number;
    total_xp: number;
    level: number;
    last_activity_at: string | null;
  }>;
  attempt_count: number;
  lesson_completion_count: number;
}

export interface AdminStats {
  totalLearners: number;
  activeLicenses: number;
  totalProducts: number;
  totalCourses: number;
  publishedCourses: number;
  totalVocabulary: number;
  totalExercises: number;
  totalMockExams: number;
}

// -------------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------------

export async function fetchProducts(): Promise<ProductWithTranslation[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_translations ( locale, name, description, tagline ),
      courses ( id )
    `)
    .order('sort_order');

  if (error) throw new Error(`fetchProducts: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    exam_type: p.exam_type,
    target_language: p.target_language,
    icon_url: p.icon_url,
    status: p.status as ContentStatus,
    sort_order: p.sort_order,
    created_at: p.created_at,
    updated_at: p.updated_at,
    translations: p.product_translations ?? [],
    course_count: (p.courses as unknown[])?.length ?? 0,
    total_learners: 0, // Computed separately if needed
  }));
}

export async function fetchProductById(id: string): Promise<ProductWithTranslation | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_translations ( locale, name, description, tagline ),
      courses ( id )
    `)
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    id: data.id,
    code: data.code,
    exam_type: data.exam_type,
    target_language: data.target_language,
    icon_url: data.icon_url,
    status: data.status as ContentStatus,
    sort_order: data.sort_order,
    created_at: data.created_at,
    updated_at: data.updated_at,
    translations: data.product_translations ?? [],
    course_count: (data.courses as unknown[])?.length ?? 0,
    total_learners: 0,
  };
}

// -------------------------------------------------------------------
// COURSES
// -------------------------------------------------------------------

export async function fetchCourses(productId?: string): Promise<CourseWithTranslation[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('courses')
    .select(`
      *,
      course_translations ( locale, title, description ),
      modules ( id ),
      licenses ( id )
    `)
    .order('slug');

  if (productId) query = query.eq('product_id', productId);

  const { data: courses, error } = await query;

  if (error) throw new Error(`fetchCourses: ${error.message}`);

  return (courses ?? []).map((c) => ({
    id: c.id,
    exam_type: c.exam_type,
    slug: c.slug,
    product_id: c.product_id,
    status: c.status as ContentStatus,
    version: c.version,
    created_at: c.created_at,
    updated_at: c.updated_at,
    translations: c.course_translations ?? [],
    module_count: (c.modules as unknown[])?.length ?? 0,
    license_count: (c.licenses as unknown[])?.length ?? 0,
  }));
}

export async function fetchCourseById(id: string): Promise<CourseWithTranslation | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_translations ( locale, title, description ),
      modules ( id ),
      licenses ( id )
    `)
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    id: data.id,
    exam_type: data.exam_type,
    slug: data.slug,
    product_id: data.product_id,
    status: data.status as ContentStatus,
    version: data.version,
    created_at: data.created_at,
    updated_at: data.updated_at,
    translations: data.course_translations ?? [],
    module_count: (data.modules as unknown[])?.length ?? 0,
    license_count: (data.licenses as unknown[])?.length ?? 0,
  };
}

export async function updateCourseStatus(id: string, status: ContentStatus) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('courses').update({ status }).eq('id', id);
  if (error) throw new Error(`updateCourseStatus: ${error.message}`);
}

export async function upsertCourseTranslation(
  courseId: string,
  locale: string,
  title: string,
  description: string | null
) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('course_translations')
    .upsert({ course_id: courseId, locale, title, description }, { onConflict: 'course_id,locale' });
  if (error) throw new Error(`upsertCourseTranslation: ${error.message}`);
}

// -------------------------------------------------------------------
// MODULES
// -------------------------------------------------------------------

export async function fetchModules(courseId: string): Promise<ModuleWithTranslation[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('modules')
    .select(`
      *,
      module_translations ( locale, title, description ),
      lessons ( id )
    `)
    .eq('course_id', courseId)
    .order('sort_order');

  if (error) throw new Error(`fetchModules: ${error.message}`);

  return (data ?? []).map((m) => ({
    id: m.id,
    course_id: m.course_id,
    sort_order: m.sort_order,
    status: m.status as ContentStatus,
    estimated_duration_minutes: m.estimated_duration_minutes,
    created_at: m.created_at,
    updated_at: m.updated_at,
    translations: m.module_translations ?? [],
    lesson_count: (m.lessons as unknown[])?.length ?? 0,
  }));
}

// -------------------------------------------------------------------
// LESSONS
// -------------------------------------------------------------------

export async function fetchLessons(moduleId: string): Promise<LessonWithTranslation[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      lesson_translations ( locale, title, description ),
      exercises ( id )
    `)
    .eq('module_id', moduleId)
    .order('sort_order');

  if (error) throw new Error(`fetchLessons: ${error.message}`);

  return (data ?? []).map((l) => ({
    id: l.id,
    module_id: l.module_id,
    sort_order: l.sort_order,
    lesson_type: l.lesson_type,
    status: l.status as ContentStatus,
    estimated_duration_minutes: l.estimated_duration_minutes,
    created_at: l.created_at,
    updated_at: l.updated_at,
    translations: l.lesson_translations ?? [],
    exercise_count: (l.exercises as unknown[])?.length ?? 0,
  }));
}

// -------------------------------------------------------------------
// EXERCISES
// -------------------------------------------------------------------

export async function fetchExercises(filters?: {
  lessonId?: string;
  level?: string;
  exerciseType?: ExerciseType;
  status?: ContentStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ExerciseWithTranslation[]; total: number }> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('exercises')
    .select(`
      *,
      exercise_translations ( locale, prompt, instruction, explanation, hint ),
      exercise_options ( id )
    `, { count: 'exact' });

  if (filters?.lessonId) query = query.eq('lesson_id', filters.lessonId);
  if (filters?.level) query = query.eq('level', filters.level);
  if (filters?.exerciseType) query = query.eq('exercise_type', filters.exerciseType);
  if (filters?.status) query = query.eq('status', filters.status);

  query = query.order('sort_order').order('created_at', { ascending: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`fetchExercises: ${error.message}`);

  const items = (data ?? []).map((e) => ({
    ...e,
    status: e.status as ContentStatus,
    exercise_type: e.exercise_type as ExerciseType,
    skill_tags: e.skill_tags ?? [],
    metadata: e.metadata ?? {},
    translations: e.exercise_translations ?? [],
    option_count: (e.exercise_options as unknown[])?.length ?? 0,
  }));

  return { items, total: count ?? 0 };
}

// -------------------------------------------------------------------
// MOCK EXAMS
// -------------------------------------------------------------------

export async function fetchMockExams(courseId?: string): Promise<MockExamWithTranslation[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('mock_exams')
    .select(`
      *,
      mock_exam_translations ( locale, title, description ),
      mock_exam_sections ( id, mock_exam_questions ( id ) )
    `)
    .order('sort_order');

  if (courseId) query = query.eq('course_id', courseId);

  const { data, error } = await query;

  if (error) throw new Error(`fetchMockExams: ${error.message}`);

  return (data ?? []).map((exam) => {
    const sections = (exam.mock_exam_sections ?? []) as Array<{ id: string; mock_exam_questions: unknown[] }>;
    const questionCount = sections.reduce((sum, s) => sum + ((s.mock_exam_questions as unknown[])?.length ?? 0), 0);

    return {
      id: exam.id,
      course_id: exam.course_id,
      sort_order: exam.sort_order,
      total_duration_minutes: exam.total_duration_minutes,
      total_points: exam.total_points,
      status: (exam.status ?? 'published') as ContentStatus,
      created_at: exam.created_at,
      translations: exam.mock_exam_translations ?? [],
      section_count: sections.length,
      question_count: questionCount,
    };
  });
}

// -------------------------------------------------------------------
// VOCABULARY
// -------------------------------------------------------------------

export async function fetchVocabulary(filters?: {
  hskLevel?: string;
  status?: ContentStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: VocabularyWithTranslation[]; total: number }> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('vocabulary_items')
    .select(`
      *,
      vocabulary_translations ( locale, meaning, example_sentence, example_pinyin, example_translation )
    `, { count: 'exact' });

  if (filters?.hskLevel) query = query.eq('level', filters.hskLevel);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(`simplified.ilike.%${filters.search}%,pinyin.ilike.%${filters.search}%`);
  }

  query = query.order('level').order('frequency_rank', { ascending: true, nullsFirst: false });

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`fetchVocabulary: ${error.message}`);

  const items = (data ?? []).map((v) => ({
    ...v,
    status: v.status as ContentStatus,
    translations: v.vocabulary_translations ?? [],
  }));

  return { items, total: count ?? 0 };
}

export async function updateVocabularyStatus(id: string, status: ContentStatus) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('vocabulary_items').update({ status }).eq('id', id);
  if (error) throw new Error(`updateVocabularyStatus: ${error.message}`);
}

// -------------------------------------------------------------------
// GRAMMAR
// -------------------------------------------------------------------

export async function fetchGrammar(filters?: {
  hskLevel?: string;
  status?: ContentStatus;
  search?: string;
}): Promise<GrammarPointWithTranslation[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('grammar_points')
    .select(`
      *,
      grammar_point_translations ( locale, title, explanation_html )
    `);

  if (filters?.hskLevel) query = query.eq('level', filters.hskLevel);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.ilike('pattern', `%${filters.search}%`);
  }

  query = query.order('level').order('sort_order');

  const { data, error } = await query;

  if (error) throw new Error(`fetchGrammar: ${error.message}`);

  return (data ?? []).map((g) => ({
    ...g,
    status: g.status as ContentStatus,
    translations: g.grammar_point_translations ?? [],
  }));
}

// -------------------------------------------------------------------
// CHARACTERS
// -------------------------------------------------------------------

export async function fetchCharacters(filters?: {
  hskLevel?: string;
  status?: ContentStatus;
  search?: string;
}): Promise<CharacterWithTranslation[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('characters')
    .select(`
      *,
      character_translations ( locale, meaning, mnemonic )
    `);

  if (filters?.hskLevel) query = query.eq('level', filters.hskLevel);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(`character.ilike.%${filters.search}%,pinyin.ilike.%${filters.search}%`);
  }

  query = query.order('level').order('frequency_rank', { ascending: true, nullsFirst: false });

  const { data, error } = await query;

  if (error) throw new Error(`fetchCharacters: ${error.message}`);

  return (data ?? []).map((c) => ({
    ...c,
    status: c.status as ContentStatus,
    translations: c.character_translations ?? [],
  }));
}

// -------------------------------------------------------------------
// LICENSES
// -------------------------------------------------------------------

export async function fetchLicenses(filters?: {
  status?: LicenseStatus;
  search?: string;
}): Promise<LicenseWithUser[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('licenses')
    .select(`
      *,
      users ( display_name, email ),
      courses ( slug )
    `);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(`email.ilike.%${filters.search}%,activation_code.ilike.%${filters.search}%`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw new Error(`fetchLicenses: ${error.message}`);

  return (data ?? []).map((l) => ({
    ...l,
    status: l.status as LicenseStatus,
    user: l.users as LicenseWithUser['user'],
    course: l.courses as LicenseWithUser['course'],
  }));
}

export async function revokeLicense(id: string, adminUserId: string, reason: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('licenses')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: adminUserId,
      revocation_reason: reason,
    })
    .eq('id', id);
  if (error) throw new Error(`revokeLicense: ${error.message}`);
}

export async function extendLicense(id: string, extraMonths: number) {
  const supabase = createServiceRoleClient();

  const { data: license, error: fetchErr } = await supabase
    .from('licenses')
    .select('extended_months, expires_at')
    .eq('id', id)
    .single();

  if (fetchErr || !license) throw new Error(`extendLicense: license not found`);

  const newExpiry = license.expires_at
    ? new Date(new Date(license.expires_at).getTime() + extraMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('licenses')
    .update({
      extended_months: (license.extended_months ?? 0) + extraMonths,
      expires_at: newExpiry,
    })
    .eq('id', id);

  if (error) throw new Error(`extendLicense: ${error.message}`);
}

// -------------------------------------------------------------------
// USERS / LEARNERS
// -------------------------------------------------------------------

export async function fetchUsers(filters?: {
  role?: string;
  search?: string;
}): Promise<LearnerWithStats[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('users')
    .select(`
      *,
      learner_profiles ( id, target_exam, target_level, preparation_status, total_study_time_minutes, streak_days, longest_streak, total_xp, level, last_activity_at )
    `);

  if (filters?.role) query = query.eq('role', filters.role);
  if (filters?.search) {
    query = query.or(`email.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw new Error(`fetchUsers: ${error.message}`);

  return (data ?? []).map((u) => ({
    ...u,
    learner_profiles: u.learner_profiles ?? [],
    // These will be populated in a future phase with real counts from attempts/completions
    attempt_count: 0,
    lesson_completion_count: 0,
  }));
}

// -------------------------------------------------------------------
// SHOPIFY SKU MAPPINGS
// -------------------------------------------------------------------

export async function fetchSkuMappings() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('shopify_sku_mappings')
    .select(`
      *,
      courses ( slug ),
      products ( code )
    `)
    .order('sku');

  if (error) throw new Error(`fetchSkuMappings: ${error.message}`);
  return data ?? [];
}

// -------------------------------------------------------------------
// ADMIN STATS (Multi-product)
// -------------------------------------------------------------------

export async function fetchAdminStats(): Promise<AdminStats> {
  const supabase = createServiceRoleClient();

  const [
    { count: totalLearners },
    { count: activeLicenses },
    { count: totalProducts },
    { count: totalCourses },
    { count: publishedCourses },
    { count: totalVocabulary },
    { count: totalExercises },
    { count: totalMockExams },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'learner'),
    supabase.from('licenses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('vocabulary_items').select('*', { count: 'exact', head: true }),
    supabase.from('exercises').select('*', { count: 'exact', head: true }),
    supabase.from('mock_exams').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalLearners: totalLearners ?? 0,
    activeLicenses: activeLicenses ?? 0,
    totalProducts: totalProducts ?? 0,
    totalCourses: totalCourses ?? 0,
    publishedCourses: publishedCourses ?? 0,
    totalVocabulary: totalVocabulary ?? 0,
    totalExercises: totalExercises ?? 0,
    totalMockExams: totalMockExams ?? 0,
  };
}
