import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Target } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

export default async function ObjectivesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-50 mb-6">
        <Target className="h-8 w-8 text-navy-400" />
      </div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">{t('objectives')}</h1>
      <p className="text-navy-400 max-w-md">
        Definissez vos objectifs d'examen, score cible et calendrier de preparation. Recevez un plan d'action personnalise.
      </p>
      <div className="mt-6 px-4 py-2 rounded-full bg-gold-100 text-gold-700 text-sm font-medium">
        Bientot disponible
      </div>
    </div>
  );
}
