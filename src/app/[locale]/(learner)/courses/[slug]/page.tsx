import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  fetchCourseBySlug,
  fetchLearnerVocabulary,
  fetchLearnerGrammar,
  fetchLearnerCharacters,
} from '@/lib/learner/queries';
import { getCefrLevel, CEFR_DESCRIPTIONS, getLevelTargets } from '@/lib/constants/exam-systems';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Award } from 'lucide-react';
import { CourseTabs } from './course-tabs';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function CourseDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  const course = await fetchCourseBySlug(slug, locale);
  if (!course) notFound();

  const level = slug.replace('hsk-', '');
  const cefrLevel = getCefrLevel(course.exam_type, level);
  const cefrDesc = cefrLevel
    ? (locale === 'en' ? CEFR_DESCRIPTIONS[cefrLevel]?.en : CEFR_DESCRIPTIONS[cefrLevel]?.fr) ?? null
    : null;
  const targets = getLevelTargets(course.exam_type, level);

  // Fetch all tab data in parallel
  const [vocabulary, grammar, characters] = await Promise.all([
    fetchLearnerVocabulary(level, locale, { pageSize: 500 }),
    fetchLearnerGrammar(level, locale),
    fetchLearnerCharacters(level, locale),
  ]);

  // Stats data — passed to client CourseTabs so cards are clickable
  const statsData = [
    { tabId: 'vocabulary' as const, label: t('vocabularyTab'), value: course.vocabulary_count, target: targets?.vocabTarget, color: 'bg-emerald-50 text-emerald-600' },
    { tabId: 'grammar' as const, label: t('grammarTab'), value: course.grammar_count, target: targets?.grammarTarget, color: 'bg-violet-50 text-violet-600' },
    { tabId: 'characters' as const, label: t('charactersTab'), value: course.character_count, target: targets?.charTarget, color: 'bg-sky-50 text-sky-600' },
    { tabId: 'modules' as const, label: t('modulesTab'), value: course.module_count, target: undefined, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('title')}
      </Link>

      {/* Course Header */}
      <header className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700 font-bold text-2xl shrink-0">
          {level}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-900">{course.title}</h1>
          {course.description && (
            <p className="text-navy-400 mt-1">{course.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant={course.vocabulary_count > 0 ? 'published' : 'draft'}>
              {course.vocabulary_count > 0 ? t('available') : t('comingSoon')}
            </Badge>
            <span className="text-xs text-navy-400 font-medium">
              {course.exam_type} {level}
            </span>
            {cefrLevel && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gold-100 text-gold-700 font-medium">
                <Award className="h-3 w-3" />
                CECRL {cefrLevel}
                {cefrDesc && <span className="text-gold-500 hidden sm:inline">— {cefrDesc}</span>}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Stats grid + Tabs — all in client component for interactivity */}
      <CourseTabs
        statsData={statsData}
        slug={slug}
        cefrLevel={cefrLevel}
        cefrDescription={cefrDesc}
        vocabulary={vocabulary}
        grammar={grammar}
        characters={characters}
        modules={course.modules}
        counts={{
          vocabulary: course.vocabulary_count,
          grammar: course.grammar_count,
          characters: course.character_count,
          modules: course.module_count,
        }}
      />
    </div>
  );
}
