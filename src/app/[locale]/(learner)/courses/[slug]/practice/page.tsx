import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchCourseBySlug, fetchPracticeCharacters } from '@/lib/learner/queries';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { CharacterPractice } from '@/components/practice/character-practice';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function PracticePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice' });
  const tCourses = await getTranslations({ locale, namespace: 'courses' });

  const course = await fetchCourseBySlug(slug, locale);
  if (!course) notFound();

  const hskLevel = slug.replace('hsk-', '');
  const characters = await fetchPracticeCharacters(hskLevel, locale);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-navy-400">
        <Link href="/courses" className="hover:text-navy-700 transition-colors">
          {tCourses('title')}
        </Link>
        <span>/</span>
        <Link href={`/courses/${slug}`} className="hover:text-navy-700 transition-colors">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-navy-700 font-medium">{t('title')}</span>
      </nav>

      {/* Back link */}
      <Link
        href={`/courses/${slug}`}
        className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {course.title}
      </Link>

      {/* Practice component */}
      {characters.length > 0 ? (
        <CharacterPractice
          characters={characters}
          hskLevel={hskLevel}
          courseTitle={course.title}
        />
      ) : (
        <div className="text-center py-20">
          <p className="text-navy-400 text-lg">{t('noCharacters')}</p>
        </div>
      )}
    </div>
  );
}
