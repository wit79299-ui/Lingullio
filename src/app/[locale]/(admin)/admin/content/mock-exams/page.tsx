import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchMockExams, fetchCourses } from '@/lib/admin/queries';
import { MockExamsTable } from './mock-exams-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MockExamsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let mockExams: Awaited<ReturnType<typeof fetchMockExams>> = [];
  let courses: Awaited<ReturnType<typeof fetchCourses>> = [];
  let fetchError = '';

  try {
    [mockExams, courses] = await Promise.all([
      fetchMockExams(),
      fetchCourses(),
    ]);
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('mockExams')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {mockExams.length} {t('mockExams').toLowerCase()}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <MockExamsTable mockExams={mockExams} courses={courses} locale={locale} />
      )}
    </div>
  );
}
