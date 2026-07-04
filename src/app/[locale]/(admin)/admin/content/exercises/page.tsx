import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchExercises } from '@/lib/admin/queries';
import { ExercisesTable } from './exercises-table';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ level?: string; type?: string; status?: string; page?: string }>;
};

export default async function ExercisesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  const page = parseInt(sp.page ?? '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  let exercises: Awaited<ReturnType<typeof fetchExercises>> = { items: [], total: 0 };
  let fetchError = '';

  try {
    exercises = await fetchExercises({
      level: sp.level || undefined,
      exerciseType: sp.type as any || undefined,
      status: sp.status as any || undefined,
      limit,
      offset,
    });
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('exercises')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {exercises.total} {t('exercises').toLowerCase()}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <ExercisesTable
          exercises={exercises.items}
          total={exercises.total}
          currentPage={page}
          pageSize={limit}
          locale={locale}
          filters={{ level: sp.level, type: sp.type, status: sp.status }}
        />
      )}
    </div>
  );
}
