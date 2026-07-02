import { setRequestLocale } from 'next-intl/server';
import { ImportPanel } from './import-panel';

type Props = { params: Promise<{ locale: string }> };

export default async function ImportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy-900">Import de contenu</h1>
        <p className="text-navy-400 mt-1">
          Importez les donnees HSK depuis les fichiers JSON generes.
        </p>
      </header>
      <ImportPanel />
    </div>
  );
}
