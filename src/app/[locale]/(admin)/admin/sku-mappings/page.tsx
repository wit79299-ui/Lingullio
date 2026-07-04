import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchSkuMappings } from '@/lib/admin/queries';
import { SkuMappingsTable } from './sku-mappings-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SkuMappingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let mappings: Awaited<ReturnType<typeof fetchSkuMappings>> = [];
  let fetchError = '';

  try {
    mappings = await fetchSkuMappings();
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('skuMappings')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {t('manageSkuMappings')}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <SkuMappingsTable mappings={mappings} locale={locale} />
      )}
    </div>
  );
}
