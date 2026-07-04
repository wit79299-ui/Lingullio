import { setRequestLocale } from 'next-intl/server';
import { ResourcesView } from './resources-view';

type Props = { params: Promise<{ locale: string }> };

export default async function ResourcesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResourcesView />;
}
