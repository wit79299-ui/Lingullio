import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { FileText } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

export default async function MockExamsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-50 mb-6">
        <FileText className="h-8 w-8 text-navy-400" />
      </div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">{t('mockExams')}</h1>
      <p className="text-navy-400 max-w-md">
        Examens blancs chronometres au format officiel HSK 2026. Analyse detaillee de vos resultats et recommandations personnalisees.
      </p>
      <div className="mt-6 px-4 py-2 rounded-full bg-gold-100 text-gold-700 text-sm font-medium">
        Bientot disponible
      </div>
    </div>
  );
}
