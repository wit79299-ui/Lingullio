import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchLicenses } from '@/lib/admin/queries';
import { LicensesTable } from './licenses-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LicensesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let licenses: Awaited<ReturnType<typeof fetchLicenses>> = [];
  let fetchError = '';

  try {
    licenses = await fetchLicenses();
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('licenses')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {licenses.length} {t('licenses').toLowerCase()}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <LicensesTable licenses={licenses} locale={locale} />
      )}
    </div>
  );
}
