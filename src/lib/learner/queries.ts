import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ContentStatus } from '@/types/database';

// -------------------------------------------------------------------
// Translation fallback helper
// -------------------------------------------------------------------

/** Pick best translation: exact locale → en → fr → first available */
function pickTranslation<T extends { locale: string }>(
  translations: T[],
  locale: string
): T | undefined {
  return (
    translations.find((tr) => tr.locale === locale) ??
    translations.find((tr) => tr.locale === 'en') ??
    translations.find((tr) => tr.locale === 'fr') ??
    translations[0]
  );
}

// -------------------------------------------------------------------
// Types for learner-facing data
// -------------------------------------------------------------------

export interface CourseCard {
  id: string;
  slug: string;
  exam_type: string;
  status: ContentStatus;
  title: string;
  description: string | null;
  module_count: number;
  vocabulary_count: number;
  grammar_count: number;
  character_count: number;
}

export interface CourseDetail extends CourseCard {
  modules: ModuleCard[];
}

export interface LessonCard {
  id: string;
  sort_order: number;
  status: ContentStatus;
  lesson_type: string;
  estimated_duration_minutes: number | null;
  title: string;
  description: string | null;
  exercise_count: number;
}

export interface ModuleCard {
  id: string;
  sort_order: number;
  status: ContentStatus;
  estimated_duration_minutes: number | null;
  title: string;
  description: string | null;
  lesson_count: number;
  lessons: LessonCard[];
}

export interface VocabWord {
  id: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  level: string;
  frequency_rank: number | null;
  word_type: string | null;
  theme: string | null;
  audio_url: string | null;
  meaning: string;
  example_sentence: string | null;
  example_pinyin: string | null;
  example_translation: string | null;
}

export interface GrammarCard {
  id: string;
  pattern: string;
  level: string;
  difficulty: number;
  title: string;
  explanation_html: string;
}

export interface CharacterCard {
  id: string;
  character: string;
  pinyin: string;
  radical: string | null;
  stroke_count: number;
  level: string;
  frequency_rank: number | null;
  audio_url: string | null;
  meaning: string;
  mnemonic: string | null;
}

export interface CourseStats {
  totalCourses: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalCharacters: number;
}

// -------------------------------------------------------------------
// COURSES LIST (for /courses page)
// -------------------------------------------------------------------

export async function fetchLearnerCourses(locale: string): Promise<CourseCard[]> {
  const supabase = createServiceRoleClient();

  // Fetch all published courses with their translations and content counts
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id, slug, exam_type, status,
      course_translations ( locale, title, description ),
      modules ( id )
    `)
    .in('status', ['published', 'draft']) // show draft too for demo
    .order('slug');

  if (error) throw new Error(`fetchLearnerCourses: ${error.message}`);

  // Get vocabulary counts per HSK level
  const { data: vocabCounts } = await supabase
    .from('vocabulary_items')
    .select('level');

  const vocabByLevel: Record<string, number> = {};
  (vocabCounts ?? []).forEach((v) => {
    const lvl = v.level;
    vocabByLevel[lvl] = (vocabByLevel[lvl] ?? 0) + 1;
  });

  // Get grammar counts per HSK level
  const { data: grammarCounts } = await supabase
    .from('grammar_points')
    .select('level');

  const grammarByLevel: Record<string, number> = {};
  (grammarCounts ?? []).forEach((g) => {
    const lvl = g.level;
    grammarByLevel[lvl] = (grammarByLevel[lvl] ?? 0) + 1;
  });

  // Get character counts per HSK level
  const { data: charCounts } = await supabase
    .from('characters')
    .select('level');

  const charByLevel: Record<string, number> = {};
  (charCounts ?? []).forEach((c) => {
    const lvl = c.level;
    charByLevel[lvl] = (charByLevel[lvl] ?? 0) + 1;
  });

  return (courses ?? []).map((c) => {
    const translations = (c.course_translations as Array<{ locale: string; title: string; description: string | null }>) ?? [];
    const t = pickTranslation(translations, locale);
    // Extract HSK level number from slug (e.g., "hsk-1" -> "1")
    const hskLevel = c.slug.replace('hsk-', '');

    return {
      id: c.id,
      slug: c.slug,
      exam_type: c.exam_type,
      status: c.status as ContentStatus,
      title: t?.title ?? c.slug.toUpperCase(),
      description: t?.description ?? null,
      module_count: (c.modules as unknown[])?.length ?? 0,
      vocabulary_count: vocabByLevel[hskLevel] ?? 0,
      grammar_count: grammarByLevel[hskLevel] ?? 0,
      character_count: charByLevel[hskLevel] ?? 0,
    };
  });
}

// -------------------------------------------------------------------
// SINGLE COURSE DETAIL (for /courses/[slug] page)
// -------------------------------------------------------------------

export async function fetchCourseBySlug(slug: string, locale: string): Promise<CourseDetail | null> {
  const supabase = createServiceRoleClient();

  const { data: course, error } = await supabase
    .from('courses')
    .select(`
      id, slug, exam_type, status,
      course_translations ( locale, title, description ),
      modules (
        id, sort_order, status, estimated_duration_minutes,
        module_translations ( locale, title, description ),
        lessons (
          id, sort_order, status, lesson_type, estimated_duration_minutes,
          lesson_translations ( locale, title, description ),
          exercises ( id )
        )
      )
    `)
    .eq('slug', slug)
    .single();

  if (error || !course) return null;

  const hskLevel = slug.replace('hsk-', '');

  // Count content for this level
  const [
    { count: vocabCount },
    { count: grammarCount },
    { count: charCount },
  ] = await Promise.all([
    supabase.from('vocabulary_items').select('*', { count: 'exact', head: true }).eq('level', hskLevel),
    supabase.from('grammar_points').select('*', { count: 'exact', head: true }).eq('level', hskLevel),
    supabase.from('characters').select('*', { count: 'exact', head: true }).eq('level', hskLevel),
  ]);

  const courseTranslations = (course.course_translations as Array<{ locale: string; title: string; description: string | null }>) ?? [];
  const ct = pickTranslation(courseTranslations, locale);

  const modules = ((course.modules as Array<{
    id: string;
    sort_order: number;
    status: string;
    estimated_duration_minutes: number | null;
    module_translations: Array<{ locale: string; title: string; description: string | null }>;
    lessons: Array<{
      id: string;
      sort_order: number;
      status: string;
      lesson_type: string;
      estimated_duration_minutes: number | null;
      lesson_translations: Array<{ locale: string; title: string; description: string | null }>;
      exercises: Array<{ id: string }>;
    }>;
  }>) ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => {
      const mt = pickTranslation(m.module_translations ?? [], locale);
      const lessons: LessonCard[] = (m.lessons ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => {
          const lt = pickTranslation(l.lesson_translations ?? [], locale);
          return {
            id: l.id,
            sort_order: l.sort_order,
            status: l.status as ContentStatus,
            lesson_type: l.lesson_type,
            estimated_duration_minutes: l.estimated_duration_minutes,
            title: lt?.title ?? `Lesson ${l.sort_order}`,
            description: lt?.description ?? null,
            exercise_count: (l.exercises as unknown[])?.length ?? 0,
          };
        });
      return {
        id: m.id,
        sort_order: m.sort_order,
        status: m.status as ContentStatus,
        estimated_duration_minutes: m.estimated_duration_minutes,
        title: mt?.title ?? `Module ${m.sort_order}`,
        description: mt?.description ?? null,
        lesson_count: lessons.length,
        lessons,
      };
    });

  return {
    id: course.id,
    slug: course.slug,
    exam_type: course.exam_type,
    status: course.status as ContentStatus,
    title: ct?.title ?? slug.toUpperCase(),
    description: ct?.description ?? null,
    module_count: modules.length,
    vocabulary_count: vocabCount ?? 0,
    grammar_count: grammarCount ?? 0,
    character_count: charCount ?? 0,
    modules,
  };
}

// -------------------------------------------------------------------
// VOCABULARY for a specific HSK level (for /courses/[slug]/vocabulary)
// -------------------------------------------------------------------

export async function fetchLearnerVocabulary(
  hskLevel: string,
  locale: string,
  filters?: {
    search?: string;
    theme?: string;
    wordType?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ words: VocabWord[]; total: number; themes: string[]; wordTypes: string[] }> {
  const supabase = createServiceRoleClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  // Main query with translations
  let query = supabase
    .from('vocabulary_items')
    .select(`
      id, simplified, traditional, pinyin, level, frequency_rank, word_type, theme, audio_url,
      vocabulary_translations ( locale, meaning, example_sentence, example_pinyin, example_translation )
    `, { count: 'exact' })
    .eq('level', hskLevel)
    .order('frequency_rank', { ascending: true, nullsFirst: false });

  if (filters?.theme) query = query.eq('theme', filters.theme);
  if (filters?.wordType) query = query.eq('word_type', filters.wordType);
  if (filters?.search) {
    query = query.or(`simplified.ilike.%${filters.search}%,pinyin.ilike.%${filters.search}%`);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`fetchLearnerVocabulary: ${error.message}`);

  // Get distinct themes and wordTypes for filters
  const { data: allItems } = await supabase
    .from('vocabulary_items')
    .select('theme, word_type')
    .eq('level', hskLevel);

  const themes = [...new Set((allItems ?? []).map((i) => i.theme).filter(Boolean))] as string[];
  const wordTypes = [...new Set((allItems ?? []).map((i) => i.word_type).filter(Boolean))] as string[];

  const words: VocabWord[] = (data ?? []).map((v) => {
    const translations = (v.vocabulary_translations as Array<{
      locale: string;
      meaning: string;
      example_sentence: string | null;
      example_pinyin: string | null;
      example_translation: string | null;
    }>) ?? [];
    const t = pickTranslation(translations, locale);

    return {
      id: v.id,
      simplified: v.simplified,
      traditional: v.traditional,
      pinyin: v.pinyin,
      level: v.level,
      frequency_rank: v.frequency_rank,
      word_type: v.word_type,
      theme: v.theme,
      audio_url: (v as Record<string, unknown>).audio_url as string | null ?? null,
      meaning: t?.meaning ?? '',
      example_sentence: t?.example_sentence ?? null,
      example_pinyin: t?.example_pinyin ?? null,
      example_translation: t?.example_translation ?? null,
    };
  });

  return { words, total: count ?? 0, themes: themes.sort(), wordTypes: wordTypes.sort() };
}

// -------------------------------------------------------------------
// GRAMMAR for a specific HSK level
// -------------------------------------------------------------------

export async function fetchLearnerGrammar(
  hskLevel: string,
  locale: string
): Promise<GrammarCard[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('grammar_points')
    .select(`
      id, pattern, level, difficulty, sort_order,
      grammar_point_translations ( locale, title, explanation_html )
    `)
    .eq('level', hskLevel)
    .order('sort_order');

  if (error) throw new Error(`fetchLearnerGrammar: ${error.message}`);

  return (data ?? []).map((g) => {
    const translations = (g.grammar_point_translations as Array<{
      locale: string;
      title: string;
      explanation_html: string;
    }>) ?? [];
    const t = pickTranslation(translations, locale);

    return {
      id: g.id,
      pattern: g.pattern,
      level: g.level,
      difficulty: g.difficulty,
      title: t?.title ?? g.pattern,
      explanation_html: t?.explanation_html ?? '',
    };
  });
}

// -------------------------------------------------------------------
// CHARACTERS for a specific HSK level
// -------------------------------------------------------------------

export async function fetchLearnerCharacters(
  hskLevel: string,
  locale: string
): Promise<CharacterCard[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('characters')
    .select(`
      id, character, pinyin, radical, stroke_count, level, frequency_rank, audio_url,
      character_translations ( locale, meaning, mnemonic )
    `)
    .eq('level', hskLevel)
    .order('frequency_rank', { ascending: true, nullsFirst: false });

  if (error) throw new Error(`fetchLearnerCharacters: ${error.message}`);

  return (data ?? []).map((c) => {
    const translations = (c.character_translations as Array<{
      locale: string;
      meaning: string;
      mnemonic: string | null;
    }>) ?? [];
    const t = pickTranslation(translations, locale);

    return {
      id: c.id,
      character: c.character,
      pinyin: c.pinyin,
      radical: c.radical,
      stroke_count: c.stroke_count,
      level: c.level,
      frequency_rank: c.frequency_rank,
      audio_url: (c as Record<string, unknown>).audio_url as string | null ?? null,
      meaning: t?.meaning ?? '',
      mnemonic: t?.mnemonic ?? null,
    };
  });
}

// -------------------------------------------------------------------
// CHARACTERS for writing practice (includes audio_url)
// -------------------------------------------------------------------

export interface PracticeCharacter {
  id: string;
  character: string;
  pinyin: string;
  stroke_count: number;
  level: string;
  audio_url: string | null;
  meaning: string;
}

export async function fetchPracticeCharacters(
  hskLevel: string,
  locale: string
): Promise<PracticeCharacter[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('characters')
    .select(`
      id, character, pinyin, stroke_count, level, audio_url,
      character_translations ( locale, meaning )
    `)
    .eq('level', hskLevel)
    .order('frequency_rank', { ascending: true, nullsFirst: false });

  if (error) throw new Error(`fetchPracticeCharacters: ${error.message}`);

  return (data ?? []).map((c) => {
    const translations = (c.character_translations as Array<{
      locale: string;
      meaning: string;
    }>) ?? [];
    const t = pickTranslation(translations, locale);

    return {
      id: c.id,
      character: c.character,
      pinyin: c.pinyin,
      stroke_count: c.stroke_count,
      level: c.level,
      audio_url: (c as Record<string, unknown>).audio_url as string | null ?? null,
      meaning: t?.meaning ?? '',
    };
  });
}

// -------------------------------------------------------------------
// SINGLE LESSON DETAIL (for /courses/[slug]/lessons/[lessonId])
// -------------------------------------------------------------------

export interface LessonDetail {
  id: string;
  sort_order: number;
  status: ContentStatus;
  lesson_type: string;
  estimated_duration_minutes: number | null;
  title: string;
  description: string | null;
  content_html: string;
  module_id: string;
  module_title: string;
  module_sort_order: number;
  exercise_count: number;
  /** IDs of prev/next lessons within same module, if any */
  prev_lesson_id: string | null;
  next_lesson_id: string | null;
}

export async function fetchLessonById(
  lessonId: string,
  locale: string
): Promise<LessonDetail | null> {
  const supabase = createServiceRoleClient();

  // Fetch lesson with its translations, module info, and exercise count
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select(`
      id, sort_order, status, lesson_type, estimated_duration_minutes, module_id,
      lesson_translations ( locale, title, description, content_html ),
      exercises ( id )
    `)
    .eq('id', lessonId)
    .single();

  if (error || !lesson) return null;

  // Get module info
  const { data: mod } = await supabase
    .from('modules')
    .select(`
      id, sort_order,
      module_translations ( locale, title )
    `)
    .eq('id', lesson.module_id)
    .single();

  const modTranslations = (mod?.module_translations as Array<{ locale: string; title: string }>) ?? [];
  const modT = pickTranslation(modTranslations, locale);

  // Get sibling lessons for prev/next navigation
  const { data: siblings } = await supabase
    .from('lessons')
    .select('id, sort_order')
    .eq('module_id', lesson.module_id)
    .order('sort_order');

  const siblingList = (siblings ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const currentIdx = siblingList.findIndex((s) => s.id === lessonId);
  const prevLesson = currentIdx > 0 ? siblingList[currentIdx - 1] : null;
  const nextLesson = currentIdx < siblingList.length - 1 ? siblingList[currentIdx + 1] : null;

  const translations = (lesson.lesson_translations as Array<{
    locale: string;
    title: string;
    description: string | null;
    content_html: string;
  }>) ?? [];
  const t = pickTranslation(translations, locale);

  return {
    id: lesson.id,
    sort_order: lesson.sort_order,
    status: lesson.status as ContentStatus,
    lesson_type: lesson.lesson_type,
    estimated_duration_minutes: lesson.estimated_duration_minutes,
    title: t?.title ?? `Lesson ${lesson.sort_order}`,
    description: t?.description ?? null,
    content_html: t?.content_html ?? '',
    module_id: lesson.module_id,
    module_title: modT?.title ?? `Module ${mod?.sort_order ?? '?'}`,
    module_sort_order: mod?.sort_order ?? 0,
    exercise_count: (lesson.exercises as unknown[])?.length ?? 0,
    prev_lesson_id: prevLesson?.id ?? null,
    next_lesson_id: nextLesson?.id ?? null,
  };
}

// -------------------------------------------------------------------
// EXERCISES for a specific lesson (for /courses/[slug]/lessons/[lessonId]/exercises)
// -------------------------------------------------------------------

export interface ExerciseItem {
  id: string;
  exercise_type: string;
  difficulty: number;
  points: number;
  sort_order: number;
  audio_url: string | null;
  metadata: Record<string, unknown>;
  prompt: string;
  instruction: string;
  explanation: string;
  hint: string | null;
}

export async function fetchLessonExercises(
  lessonId: string,
  locale: string
): Promise<ExerciseItem[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('exercises')
    .select(`
      id, exercise_type, difficulty, points, sort_order, audio_url, metadata, status,
      exercise_translations ( locale, prompt, instruction, explanation, hint )
    `)
    .eq('lesson_id', lessonId)
    .eq('status', 'published')
    .order('sort_order');

  if (error) throw new Error(`fetchLessonExercises: ${error.message}`);

  return (data ?? []).map((e) => {
    const translations = (e.exercise_translations as Array<{
      locale: string;
      prompt: string;
      instruction: string;
      explanation: string;
      hint: string | null;
    }>) ?? [];
    const t = pickTranslation(translations, locale);
    const meta = (e.metadata as Record<string, unknown>) ?? {};

    return {
      id: e.id,
      exercise_type: e.exercise_type,
      difficulty: e.difficulty,
      points: e.points,
      sort_order: e.sort_order,
      audio_url: (e as Record<string, unknown>).audio_url as string | null ?? null,
      metadata: meta,
      // Prefer translation table, fall back to metadata fields
      prompt: t?.prompt || (meta.prompt as string) || '',
      instruction: t?.instruction || (meta.instruction as string) || '',
      explanation: t?.explanation || (meta.explanation as string) || '',
      hint: t?.hint || (meta.hint as string) || null,
    };
  });
}

// -------------------------------------------------------------------
// DASHBOARD STATS
// -------------------------------------------------------------------

export async function fetchDashboardStats(locale: string): Promise<CourseStats> {
  const supabase = createServiceRoleClient();

  const [
    { count: totalCourses },
    { count: totalVocabulary },
    { count: totalGrammar },
    { count: totalCharacters },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('vocabulary_items').select('*', { count: 'exact', head: true }),
    supabase.from('grammar_points').select('*', { count: 'exact', head: true }),
    supabase.from('characters').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalCourses: totalCourses ?? 0,
    totalVocabulary: totalVocabulary ?? 0,
    totalGrammar: totalGrammar ?? 0,
    totalCharacters: totalCharacters ?? 0,
  };
}

// -------------------------------------------------------------------
// MOCK EXAMS
// -------------------------------------------------------------------

export interface MockExamCard {
  id: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  status: string;
  total_points: number;
  total_duration_minutes: number;
  sort_order: number;
  title: string;
  description: string | null;
  section_count: number;
  question_count: number;
}

export interface MockExamSection {
  id: string;
  section_type: string;
  sort_order: number;
  total_points: number;
  duration_minutes: number | null;
  title: string;
  instructions: string | null;
}

export interface MockExamQuestion {
  id: string;
  sort_order: number;
  points: number;
  exercise_id: string;
  exercise_type: string;
  difficulty: number;
  audio_url: string | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
  prompt: string;
  instruction: string;
  explanation: string;
  hint: string | null;
  options: MockExamOption[];
}

export interface MockExamOption {
  id: string;
  sort_order: number;
  is_correct: boolean;
  content: string;
  metadata: Record<string, unknown> | null;
}

export interface MockExamDetail {
  id: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  status: string;
  total_points: number;
  total_duration_minutes: number;
  title: string;
  description: string | null;
  sections: (MockExamSection & { questions: MockExamQuestion[] })[];
  scoring: {
    total_points: number;
    pass_threshold: number;
    points_per_item: number;
    listening_points: number;
    reading_points: number;
  };
}

/** Fetch all available mock exams for the listing page */
export async function fetchMockExams(locale: string): Promise<MockExamCard[]> {
  const supabase = createServiceRoleClient();

  const { data: exams, error } = await supabase
    .from('mock_exams')
    .select(`
      id, course_id, status, total_points, total_duration_minutes, sort_order,
      mock_exam_translations ( locale, title, description ),
      courses!inner ( slug, course_translations ( locale, title ) ),
      mock_exam_sections ( id ),
      mock_exam_questions:mock_exam_sections ( mock_exam_questions ( id ) )
    `)
    .eq('status', 'published')
    .order('sort_order');

  if (error || !exams) {
    console.error('fetchMockExams error:', error);
    return [];
  }

  return exams.map((exam: Record<string, unknown>) => {
    const translations = (exam.mock_exam_translations as Array<{
      locale: string; title: string; description: string | null;
    }>) ?? [];
    const tr = pickTranslation(translations, locale);

    const course = exam.courses as Record<string, unknown>;
    const courseTrs = (course?.course_translations as Array<{
      locale: string; title: string;
    }>) ?? [];
    const courseTr = pickTranslation(courseTrs, locale);

    const sections = (exam.mock_exam_sections as Array<{ id: string }>) ?? [];

    // Count questions across all sections
    const sectionQuestions = (exam.mock_exam_questions as Array<{
      mock_exam_questions: Array<{ id: string }>;
    }>) ?? [];
    const questionCount = sectionQuestions.reduce(
      (sum, s) => sum + (s.mock_exam_questions?.length ?? 0), 0
    );

    return {
      id: exam.id as string,
      course_id: exam.course_id as string,
      course_slug: (course?.slug as string) ?? '',
      course_title: courseTr?.title ?? '',
      status: exam.status as string,
      total_points: exam.total_points as number,
      total_duration_minutes: exam.total_duration_minutes as number,
      sort_order: exam.sort_order as number,
      title: tr?.title ?? '',
      description: tr?.description ?? null,
      section_count: sections.length,
      question_count: questionCount,
    };
  });
}

/** Fetch a single mock exam with all sections, questions, and options for the exam runner */
export async function fetchMockExamDetail(
  examId: string,
  locale: string
): Promise<MockExamDetail | null> {
  const supabase = createServiceRoleClient();

  // Fetch the exam
  const { data: exam, error } = await supabase
    .from('mock_exams')
    .select(`
      id, course_id, status, total_points, total_duration_minutes,
      mock_exam_translations ( locale, title, description ),
      courses!inner ( slug, course_translations ( locale, title ) )
    `)
    .eq('id', examId)
    .single();

  if (error || !exam) {
    console.error('fetchMockExamDetail error:', error);
    return null;
  }

  const translations = (exam.mock_exam_translations as Array<{
    locale: string; title: string; description: string | null;
  }>) ?? [];
  const tr = pickTranslation(translations, locale);

  const course = exam.courses as unknown as Record<string, unknown>;
  const courseTrs = (course?.course_translations as Array<{
    locale: string; title: string;
  }>) ?? [];
  const courseTr = pickTranslation(courseTrs, locale);

  // Fetch sections
  const { data: sections } = await supabase
    .from('mock_exam_sections')
    .select(`
      id, section_type, sort_order, total_points, duration_minutes,
      mock_exam_section_translations ( locale, title, instructions )
    `)
    .eq('mock_exam_id', examId)
    .order('sort_order');

  // Fetch all questions for this exam
  const sectionIds = (sections ?? []).map((s: Record<string, unknown>) => s.id as string);
  const { data: questions } = await supabase
    .from('mock_exam_questions')
    .select(`
      id, sort_order, points, section_id,
      exercises!inner (
        id, exercise_type, difficulty, audio_url, image_url, metadata,
        exercise_translations ( locale, prompt, instruction, explanation, hint ),
        exercise_options (
          id, sort_order, is_correct, metadata,
          exercise_option_translations ( locale, content, error_explanation )
        )
      )
    `)
    .in('section_id', sectionIds)
    .order('sort_order');

  // Build section + questions map
  const questionsBySection = new Map<string, MockExamQuestion[]>();
  for (const q of (questions ?? [])) {
    const sectionId = (q as Record<string, unknown>).section_id as string;
    if (!questionsBySection.has(sectionId)) {
      questionsBySection.set(sectionId, []);
    }

    const exercise = (q as Record<string, unknown>).exercises as Record<string, unknown>;
    const exTrs = (exercise?.exercise_translations as Array<{
      locale: string; prompt: string; instruction: string; explanation: string; hint: string | null;
    }>) ?? [];
    const exTr = pickTranslation(exTrs, locale);

    const rawOptions = (exercise?.exercise_options as Array<{
      id: string; sort_order: number; is_correct: boolean; metadata: Record<string, unknown> | null;
      exercise_option_translations: Array<{
        locale: string; content: string; error_explanation: string | null;
      }>;
    }>) ?? [];

    const options: MockExamOption[] = rawOptions
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((opt) => {
        const optTr = pickTranslation(opt.exercise_option_translations ?? [], locale);
        return {
          id: opt.id,
          sort_order: opt.sort_order,
          is_correct: opt.is_correct,
          content: optTr?.content ?? '',
          metadata: opt.metadata,
        };
      });

    const meta = (exercise?.metadata as Record<string, unknown>) ?? {};

    questionsBySection.get(sectionId)!.push({
      id: (q as Record<string, unknown>).id as string,
      sort_order: (q as Record<string, unknown>).sort_order as number,
      points: (q as Record<string, unknown>).points as number,
      exercise_id: exercise?.id as string,
      exercise_type: exercise?.exercise_type as string,
      difficulty: exercise?.difficulty as number,
      audio_url: (exercise?.audio_url as string) ?? null,
      image_url: (exercise?.image_url as string) ?? null,
      metadata: meta,
      prompt: exTr?.prompt ?? (meta.prompt as string) ?? '',
      instruction: exTr?.instruction ?? (meta.instruction as string) ?? '',
      explanation: exTr?.explanation ?? (meta.explanation as string) ?? '',
      hint: exTr?.hint ?? (meta.hint as string) ?? null,
      options,
    });
  }

  const builtSections = (sections ?? []).map((s: Record<string, unknown>) => {
    const secTrs = (s.mock_exam_section_translations as Array<{
      locale: string; title: string; instructions: string | null;
    }>) ?? [];
    const secTr = pickTranslation(secTrs, locale);

    return {
      id: s.id as string,
      section_type: s.section_type as string,
      sort_order: s.sort_order as number,
      total_points: s.total_points as number,
      duration_minutes: s.duration_minutes as number | null,
      title: secTr?.title ?? '',
      instructions: secTr?.instructions ?? null,
      questions: (questionsBySection.get(s.id as string) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    };
  });

  return {
    id: exam.id as string,
    course_id: exam.course_id as string,
    course_slug: (course?.slug as string) ?? '',
    course_title: courseTr?.title ?? '',
    status: exam.status as string,
    total_points: exam.total_points as number,
    total_duration_minutes: exam.total_duration_minutes as number,
    title: tr?.title ?? '',
    description: tr?.description ?? null,
    sections: builtSections,
    scoring: {
      total_points: exam.total_points as number,
      pass_threshold: 120,
      points_per_item: 5,
      listening_points: 100,
      reading_points: 100,
    },
  };
}
