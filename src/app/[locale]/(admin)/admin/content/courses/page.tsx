import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchCourses } from '@/lib/admin/queries';
import { CoursesTable } from './courses-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CoursesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let courses: Awaited<ReturnType<typeof fetchCourses>> = [];
  let fetchError = '';

  try {
    courses = await fetchCourses();
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('courses')}</h1>
          <p className="text-sm text-navy-400 mt-1">{t('manageContent')}</p>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <CoursesTable courses={courses} locale={locale} />
      )}
    </div>
  );
}
