import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchVocabulary } from '@/lib/admin/queries';
import { VocabularyTable } from './vocabulary-table';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ level?: string; status?: string; q?: string; page?: string }>;
};

export default async function VocabularyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  const pageSize = 50;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * pageSize;

  let items: Awaited<ReturnType<typeof fetchVocabulary>> = { items: [], total: 0 };
  let fetchError = '';

  try {
    items = await fetchVocabulary({
      hskLevel: sp.level || undefined,
      status: sp.status as 'draft' | 'published' | undefined,
      search: sp.q || undefined,
      limit: pageSize,
      offset,
    });
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('vocabulary')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {items.total} {t('vocabulary').toLowerCase()}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <VocabularyTable
          items={items.items}
          total={items.total}
          page={page}
          pageSize={pageSize}
          locale={locale}
        />
      )}
    </div>
  );
}
