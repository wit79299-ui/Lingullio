import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchCourseBySlug, fetchLearnerVocabulary } from '@/lib/learner/queries';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { VocabularyExplorer } from './vocabulary-explorer';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export default async function VocabularyPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  const course = await fetchCourseBySlug(slug, locale);
  if (!course) notFound();

  const hskLevel = slug.replace('hsk-', '');
  const page = parseInt(sp.page ?? '1', 10);
  const search = sp.search ?? '';
  const theme = sp.theme ?? '';
  const wordType = sp.wordType ?? '';

  const { words, total, themes, wordTypes } = await fetchLearnerVocabulary(hskLevel, locale, {
    search: search || undefined,
    theme: theme || undefined,
    wordType: wordType || undefined,
    page,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-navy-400">
        <Link href="/courses" className="hover:text-navy-700 transition-colors">
          {t('title')}
        </Link>
        <span>/</span>
        <Link href={`/courses/${slug}`} className="hover:text-navy-700 transition-colors">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-navy-700 font-medium">{t('vocabularyTab')}</span>
      </div>

      {/* Back link */}
      <Link
        href={`/courses/${slug}`}
        className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {course.title}
      </Link>

      {/* Client Component for interactivity */}
      <VocabularyExplorer
        words={words}
        total={total}
        themes={themes}
        wordTypes={wordTypes}
        currentPage={page}
        currentSearch={search}
        currentTheme={theme}
        currentWordType={wordType}
        slug={slug}
        courseTitle={course.title}
        hskLevel={hskLevel}
      />
    </div>
  );
}
