import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchLessonById } from '@/lib/learner/queries';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Dumbbell, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  params: Promise<{ locale: string; slug: string; lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const { locale, slug, lessonId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'lessons' });

  const lesson = await fetchLessonById(lessonId, locale);
  if (!lesson) notFound();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm text-navy-400 flex-wrap">
        <Link
          href={`/courses/${slug}`}
          className="inline-flex items-center gap-1 hover:text-navy-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {slug.toUpperCase().replace('-', ' ')}
        </Link>
        <span className="text-navy-200">/</span>
        <span className="text-navy-500">
          {t('modulePrefix', { number: lesson.module_sort_order })} — {lesson.module_title}
        </span>
      </div>

      {/* Lesson header */}
      <header className="bg-white rounded-2xl border border-cream-100 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700 font-bold text-lg shrink-0">
            {lesson.sort_order}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-navy-900">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-navy-400 mt-1">{lesson.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-navy-400">
              {lesson.estimated_duration_minutes && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cream-50">
                  <Clock className="h-3.5 w-3.5" />
                  {lesson.estimated_duration_minutes} min
                </span>
              )}
              {lesson.exercise_count > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 text-violet-600">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {lesson.exercise_count} {t('exercises')}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-50 text-sky-600">
                <BookOpen className="h-3.5 w-3.5" />
                {t('lessonType_' + lesson.lesson_type) ?? lesson.lesson_type}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Lesson content */}
      {lesson.content_html ? (
        <article className="bg-white rounded-2xl border border-cream-100 p-6 sm:p-8 shadow-sm">
          <div
            className="prose prose-sm sm:prose-base max-w-none text-navy-800
              [&_h2]:text-navy-900 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-cream-100 [&_h2]:pb-2
              [&_h3]:text-navy-900 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3
              [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-4
              [&_strong]:text-navy-900 [&_strong]:font-semibold
              [&_em]:text-teal-700
              [&_ul]:space-y-1.5 [&_ul]:mb-4
              [&_ol]:space-y-1.5 [&_ol]:mb-4
              [&_li]:text-sm [&_li]:leading-relaxed
              [&_code]:bg-cream-50 [&_code]:text-navy-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
              [&_blockquote]:border-l-4 [&_blockquote]:border-teal-300 [&_blockquote]:bg-teal-50/30 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:rounded-r-lg
              [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:my-4
              [&_th]:bg-cream-50 [&_th]:text-navy-700 [&_th]:font-semibold [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:border [&_th]:border-cream-200
              [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-cream-200
              [&_section]:mb-6
              [&_.lesson-intro]:bg-gradient-to-r [&_.lesson-intro]:from-teal-50 [&_.lesson-intro]:to-emerald-50 [&_.lesson-intro]:rounded-xl [&_.lesson-intro]:p-5 [&_.lesson-intro]:mb-6 [&_.lesson-intro]:border [&_.lesson-intro]:border-teal-100
              [&_.key-point]:bg-amber-50 [&_.key-point]:rounded-xl [&_.key-point]:p-4 [&_.key-point]:my-4 [&_.key-point]:border-l-4 [&_.key-point]:border-amber-400
              [&_.example]:bg-cream-25 [&_.example]:rounded-lg [&_.example]:p-4 [&_.example]:my-3
              [&_.zh]:text-xl [&_.zh]:text-navy-900 [&_.zh]:font-medium
              [&_.pinyin]:text-sm [&_.pinyin]:text-teal-600 [&_.pinyin]:font-mono
              [&_.translation]:text-sm [&_.translation]:text-navy-500
              [&_.practice-box]:bg-sky-50 [&_.practice-box]:rounded-xl [&_.practice-box]:p-4 [&_.practice-box]:my-4 [&_.practice-box]:border [&_.practice-box]:border-sky-200
              [&_.warning]:bg-red-50 [&_.warning]:rounded-xl [&_.warning]:p-4 [&_.warning]:my-4 [&_.warning]:border-l-4 [&_.warning]:border-red-400
              [&_.tip]:bg-violet-50 [&_.tip]:rounded-xl [&_.tip]:p-4 [&_.tip]:my-4 [&_.tip]:border-l-4 [&_.tip]:border-violet-400
              [&_.summary]:bg-emerald-50 [&_.summary]:rounded-xl [&_.summary]:p-5 [&_.summary]:my-6 [&_.summary]:border [&_.summary]:border-emerald-200"
            dangerouslySetInnerHTML={{ __html: lesson.content_html }}
          />
        </article>
      ) : (
        <div className="bg-white rounded-2xl border border-cream-100 p-10 text-center text-navy-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-navy-200" />
          <p className="text-lg font-medium">{t('noContent')}</p>
          <p className="text-sm mt-1">{t('contentComingSoon')}</p>
        </div>
      )}

      {/* Start exercises CTA */}
      {lesson.exercise_count > 0 && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0">
              <Zap className="h-7 w-7" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-bold text-navy-900">
                Testez vos connaissances
              </h3>
              <p className="text-sm text-navy-500 mt-1">
                {lesson.exercise_count} exercices interactifs &mdash; QCM, dictee, traduction, associations et plus.
                Score calcule sur le bareme HSK officiel (120/200 pour valider).
              </p>
            </div>
            <Link href={`/courses/${slug}/lessons/${lessonId}/exercises`}>
              <Button variant="teal" size="lg" className="whitespace-nowrap">
                <Zap className="h-5 w-5" />
                Lancer les exercices
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Prev / Next navigation */}
      <nav className="flex items-center justify-between gap-4 pt-2">
        {lesson.prev_lesson_id ? (
          <Link href={`/courses/${slug}/lessons/${lesson.prev_lesson_id}`}>
            <Button variant="ghost" size="md" className="text-navy-500 hover:text-navy-800">
              <ChevronLeft className="h-4 w-4" />
              {t('previousLesson')}
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {lesson.next_lesson_id ? (
          <Link href={`/courses/${slug}/lessons/${lesson.next_lesson_id}`}>
            <Button variant="teal" size="md">
              {t('nextLesson')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Link href={`/courses/${slug}`}>
            <Button variant="teal" size="md">
              {t('backToCourse')}
            </Button>
          </Link>
        )}
      </nav>
    </div>
  );
}
