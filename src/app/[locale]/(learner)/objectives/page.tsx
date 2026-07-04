import { setRequestLocale } from 'next-intl/server';
import { ObjectivesView } from './objectives-view';

type Props = { params: Promise<{ locale: string }> };

export default async function ObjectivesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ObjectivesView />;
}
