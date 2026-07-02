import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Library } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

export default async function ResourcesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-50 mb-6">
        <Library className="h-8 w-8 text-navy-400" />
      </div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">{t('resources')}</h1>
      <p className="text-navy-400 max-w-md">
        Bibliotheque de ressources complementaires : fiches de grammaire, tableaux de caracteres, listes de vocabulaire thematiques et guides de preparation.
      </p>
      <div className="mt-6 px-4 py-2 rounded-full bg-gold-100 text-gold-700 text-sm font-medium">
        Bientot disponible
      </div>
    </div>
  );
}
