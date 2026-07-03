import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Onboarding layout — fullscreen, no sidebar, no nav.
 * Used for the placement test and other first-time flows.
 */
export default async function OnboardingLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <>{children}</>;
}
