import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchGrammar } from '@/lib/admin/queries';
import { GrammarTable } from './grammar-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function GrammarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let items: Awaited<ReturnType<typeof fetchGrammar>> = [];
  let fetchError = '';

  try {
    items = await fetchGrammar();
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('grammar')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {items.length} {t('grammar').toLowerCase()}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <GrammarTable items={items} locale={locale} />
      )}
    </div>
  );
}
