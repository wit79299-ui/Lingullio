import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  Course,
  ContentStatus,
  License,
  LicenseStatus,
  User,
  VocabularyItem,
  GrammarPoint,
  Character,
} from '@/types/database';

// -------------------------------------------------------------------
// Types for joined/enriched data
// -------------------------------------------------------------------

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

export interface AdminStats {
  totalLearners: number;
  activeLicenses: number;
  totalCourses: number;
  publishedCourses: number;
  totalVocabulary: number;
  totalExercises: number;
}

// -------------------------------------------------------------------
// COURSES
// -------------------------------------------------------------------

export async function fetchCourses(): Promise<CourseWithTranslation[]> {
  const supabase = createServiceRoleClient();

  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_translations ( locale, title, description ),
      modules ( id ),
      licenses ( id )
    `)
    .order('slug');

  if (error) throw new Error(`fetchCourses: ${error.message}`);

  return (courses ?? []).map((c) => ({
    id: c.id,
    exam_type: c.exam_type,
    slug: c.slug,
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

  if (filters?.hskLevel) query = query.eq('hsk_level', filters.hskLevel);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(`simplified.ilike.%${filters.search}%,pinyin.ilike.%${filters.search}%`);
  }

  query = query.order('hsk_level').order('frequency_rank', { ascending: true, nullsFirst: false });

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

  if (filters?.hskLevel) query = query.eq('hsk_level', filters.hskLevel);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.ilike('pattern', `%${filters.search}%`);
  }

  query = query.order('hsk_level').order('sort_order');

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

  if (filters?.hskLevel) query = query.eq('hsk_level', filters.hskLevel);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(`character.ilike.%${filters.search}%,pinyin.ilike.%${filters.search}%`);
  }

  query = query.order('hsk_level').order('frequency_rank', { ascending: true, nullsFirst: false });

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

  // Get current license
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
}): Promise<(User & { learner_profiles: Array<{ id: string; target_exam: string; target_level: string; preparation_status: string }> })[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('users')
    .select(`
      *,
      learner_profiles ( id, target_exam, target_level, preparation_status )
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
  }));
}

// -------------------------------------------------------------------
// ADMIN STATS
// -------------------------------------------------------------------

export async function fetchAdminStats(): Promise<AdminStats> {
  const supabase = createServiceRoleClient();

  const [
    { count: totalLearners },
    { count: activeLicenses },
    { count: totalCourses },
    { count: publishedCourses },
    { count: totalVocabulary },
    { count: totalExercises },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'learner'),
    supabase.from('licenses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('vocabulary_items').select('*', { count: 'exact', head: true }),
    supabase.from('exercises').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalLearners: totalLearners ?? 0,
    activeLicenses: activeLicenses ?? 0,
    totalCourses: totalCourses ?? 0,
    publishedCourses: publishedCourses ?? 0,
    totalVocabulary: totalVocabulary ?? 0,
    totalExercises: totalExercises ?? 0,
  };
}
