import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchLessons } from '@/lib/admin/queries';
import { ModuleDetail } from './module-detail';
import { createServiceRoleClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string; courseId: string; moduleId: string }>;
};

export default async function ModuleDetailPage({ params }: Props) {
  const { locale, courseId, moduleId } = await params;
  setRequestLocale(locale);

  let moduleData: {
    id: string;
    course_id: string;
    sort_order: number;
    status: string;
    estimated_duration_minutes: number | null;
    translations: Array<{ locale: string; title: string; description: string | null }>;
  } | null = null;

  let lessons: Awaited<ReturnType<typeof fetchLessons>> = [];
  let fetchError = '';
  let courseSlug = '';

  try {
    const supabase = createServiceRoleClient();

    // Fetch module info
    const { data: mod, error: modErr } = await supabase
      .from('modules')
      .select('*, module_translations ( locale, title, description )')
      .eq('id', moduleId)
      .single();

    if (modErr || !mod) return notFound();

    moduleData = {
      id: mod.id,
      course_id: mod.course_id,
      sort_order: mod.sort_order,
      status: mod.status,
      estimated_duration_minutes: mod.estimated_duration_minutes,
      translations: mod.module_translations ?? [],
    };

    // Fetch course slug for breadcrumb
    const { data: course } = await supabase
      .from('courses')
      .select('slug')
      .eq('id', courseId)
      .single();
    courseSlug = course?.slug ?? '';

    lessons = await fetchLessons(moduleId);
  } catch (err) {
    fetchError = String(err);
  }

  if (!moduleData && !fetchError) return notFound();

  return (
    <div className="space-y-6">
      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <ModuleDetail
          module={moduleData!}
          lessons={lessons}
          courseId={courseId}
          courseSlug={courseSlug}
          locale={locale}
        />
      )}
    </div>
  );
}
