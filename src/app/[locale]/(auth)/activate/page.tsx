import { setRequestLocale } from 'next-intl/server';
import { ActivateForm } from './activate-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ActivatePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ActivateForm />;
}
