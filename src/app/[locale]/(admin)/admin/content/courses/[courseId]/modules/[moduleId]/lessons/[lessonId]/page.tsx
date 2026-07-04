import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchExercises } from '@/lib/admin/queries';
import { LessonDetail } from './lesson-detail';
import { createServiceRoleClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string; courseId: string; moduleId: string; lessonId: string }>;
};

export default async function LessonDetailPage({ params }: Props) {
  const { locale, courseId, moduleId, lessonId } = await params;
  setRequestLocale(locale);

  let lessonData: {
    id: string;
    module_id: string;
    sort_order: number;
    lesson_type: string;
    status: string;
    estimated_duration_minutes: number | null;
    translations: Array<{ locale: string; title: string; description: string | null }>;
  } | null = null;

  let exercises: Awaited<ReturnType<typeof fetchExercises>> = { items: [], total: 0 };
  let fetchError = '';
  let breadcrumb = { courseSlug: '', moduleTitle: '' };

  try {
    const supabase = createServiceRoleClient();

    // Fetch lesson
    const { data: lesson, error: lessonErr } = await supabase
      .from('lessons')
      .select('*, lesson_translations ( locale, title, description )')
      .eq('id', lessonId)
      .single();

    if (lessonErr || !lesson) return notFound();

    lessonData = {
      id: lesson.id,
      module_id: lesson.module_id,
      sort_order: lesson.sort_order,
      lesson_type: lesson.lesson_type,
      status: lesson.status,
      estimated_duration_minutes: lesson.estimated_duration_minutes,
      translations: lesson.lesson_translations ?? [],
    };

    // Fetch breadcrumb info
    const [{ data: course }, { data: mod }] = await Promise.all([
      supabase.from('courses').select('slug').eq('id', courseId).single(),
      supabase.from('modules').select('*, module_translations ( locale, title )').eq('id', moduleId).single(),
    ]);

    const modTr = (mod?.module_translations ?? []).find((t: { locale: string }) => t.locale === locale)
      ?? (mod?.module_translations ?? [])[0];

    breadcrumb = {
      courseSlug: course?.slug ?? '',
      moduleTitle: modTr?.title ?? `M${mod?.sort_order ?? '?'}`,
    };

    // Fetch exercises for this lesson
    exercises = await fetchExercises({ lessonId, limit: 100 });
  } catch (err) {
    fetchError = String(err);
  }

  if (!lessonData && !fetchError) return notFound();

  return (
    <div className="space-y-6">
      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <LessonDetail
          lesson={lessonData!}
          exercises={exercises.items}
          totalExercises={exercises.total}
          courseId={courseId}
          moduleId={moduleId}
          breadcrumb={breadcrumb}
          locale={locale}
        />
      )}
    </div>
  );
}
