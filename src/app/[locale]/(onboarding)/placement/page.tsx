import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { PlacementTest } from '@/components/placement/placement-test';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: 'Test de positionnement',
  description: 'Discover your Chinese level and get a personalized learning plan.',
};

export default async function PlacementPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlacementTest />;
}
