import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchCourseById, fetchModules } from '@/lib/admin/queries';
import { CourseDetail } from './course-detail';

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
};

export default async function CourseDetailPage({ params }: Props) {
  const { locale, courseId } = await params;
  setRequestLocale(locale);

  const [course, modules] = await Promise.all([
    fetchCourseById(courseId),
    fetchModules(courseId),
  ]);

  if (!course) notFound();

  const t = await getTranslations({ locale, namespace: 'admin' });

  return (
    <CourseDetail
      course={course}
      modules={modules}
      locale={locale}
    />
  );
}
