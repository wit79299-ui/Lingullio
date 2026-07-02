import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchCharacters } from '@/lib/admin/queries';
import { CharactersTable } from './characters-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CharactersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let items: Awaited<ReturnType<typeof fetchCharacters>> = [];
  let fetchError = '';

  try {
    items = await fetchCharacters();
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('characters')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          {items.length} {t('characters').toLowerCase()}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <CharactersTable items={items} locale={locale} />
      )}
    </div>
  );
}
