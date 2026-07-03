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

export interface ModuleCard {
  id: string;
  sort_order: number;
  status: ContentStatus;
  estimated_duration_minutes: number | null;
  title: string;
  description: string | null;
  lesson_count: number;
}

export interface VocabWord {
  id: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  hsk_level: string;
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
  hsk_level: string;
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
  hsk_level: string;
  frequency_rank: number | null;
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
    .select('hsk_level');

  const vocabByLevel: Record<string, number> = {};
  (vocabCounts ?? []).forEach((v) => {
    const lvl = v.hsk_level;
    vocabByLevel[lvl] = (vocabByLevel[lvl] ?? 0) + 1;
  });

  // Get grammar counts per HSK level
  const { data: grammarCounts } = await supabase
    .from('grammar_points')
    .select('hsk_level');

  const grammarByLevel: Record<string, number> = {};
  (grammarCounts ?? []).forEach((g) => {
    const lvl = g.hsk_level;
    grammarByLevel[lvl] = (grammarByLevel[lvl] ?? 0) + 1;
  });

  // Get character counts per HSK level
  const { data: charCounts } = await supabase
    .from('characters')
    .select('hsk_level');

  const charByLevel: Record<string, number> = {};
  (charCounts ?? []).forEach((c) => {
    const lvl = c.hsk_level;
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
        lessons ( id )
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
    supabase.from('vocabulary_items').select('*', { count: 'exact', head: true }).eq('hsk_level', hskLevel),
    supabase.from('grammar_points').select('*', { count: 'exact', head: true }).eq('hsk_level', hskLevel),
    supabase.from('characters').select('*', { count: 'exact', head: true }).eq('hsk_level', hskLevel),
  ]);

  const courseTranslations = (course.course_translations as Array<{ locale: string; title: string; description: string | null }>) ?? [];
  const ct = pickTranslation(courseTranslations, locale);

  const modules = ((course.modules as Array<{
    id: string;
    sort_order: number;
    status: string;
    estimated_duration_minutes: number | null;
    module_translations: Array<{ locale: string; title: string; description: string | null }>;
    lessons: Array<{ id: string }>;
  }>) ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => {
      const mt = pickTranslation(m.module_translations ?? [], locale);
      return {
        id: m.id,
        sort_order: m.sort_order,
        status: m.status as ContentStatus,
        estimated_duration_minutes: m.estimated_duration_minutes,
        title: mt?.title ?? `Module ${m.sort_order}`,
        description: mt?.description ?? null,
        lesson_count: (m.lessons as unknown[])?.length ?? 0,
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
      id, simplified, traditional, pinyin, hsk_level, frequency_rank, word_type, theme, audio_url,
      vocabulary_translations ( locale, meaning, example_sentence, example_pinyin, example_translation )
    `, { count: 'exact' })
    .eq('hsk_level', hskLevel)
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
    .eq('hsk_level', hskLevel);

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
      hsk_level: v.hsk_level,
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
      id, pattern, hsk_level, difficulty, sort_order,
      grammar_point_translations ( locale, title, explanation_html )
    `)
    .eq('hsk_level', hskLevel)
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
      hsk_level: g.hsk_level,
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
      id, character, pinyin, radical, stroke_count, hsk_level, frequency_rank,
      character_translations ( locale, meaning, mnemonic )
    `)
    .eq('hsk_level', hskLevel)
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
      hsk_level: c.hsk_level,
      frequency_rank: c.frequency_rank,
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
  hsk_level: string;
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
      id, character, pinyin, stroke_count, hsk_level, audio_url,
      character_translations ( locale, meaning )
    `)
    .eq('hsk_level', hskLevel)
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
      hsk_level: c.hsk_level,
      audio_url: (c as Record<string, unknown>).audio_url as string | null ?? null,
      meaning: t?.meaning ?? '',
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
