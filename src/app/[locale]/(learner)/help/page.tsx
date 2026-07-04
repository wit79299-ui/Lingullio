import { setRequestLocale } from 'next-intl/server';
import { HelpView } from './help-view';

type Props = { params: Promise<{ locale: string }> };

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HelpView />;
}
