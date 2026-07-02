import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchUsers } from '@/lib/admin/queries';
import { LearnersTable } from './learners-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LearnersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let users: Awaited<ReturnType<typeof fetchUsers>> = [];
  let fetchError = '';

  try {
    users = await fetchUsers();
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('learners')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {users.length} {t('learners').toLowerCase()}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <LearnersTable users={users} locale={locale} />
      )}
    </div>
  );
}
