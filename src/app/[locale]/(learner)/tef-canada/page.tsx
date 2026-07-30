import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { TEFCanadaApp } from '@/components/tef/tef-canada-app';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: 'TEF Canada Preparation',
  description: 'Complete TEF Canada preparation: diagnostic, exercises, vocabulary bank, traps guide, and official grading scale.',
};

export default async function TEFCanadaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TEFCanadaApp />;
}
