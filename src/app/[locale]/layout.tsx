import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { AuthProvider } from '@/components/providers/auth-provider';
import { getCurrentUser } from '@/lib/auth/actions';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: {
      default: t('title'),
      template: `%s | ${t('title')}`,
    },
    description: t('description'),
  };
}

// Locale layout: does NOT render <html>/<body> (those are in root layout).
// Only provides locale-specific context and providers.
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  let initialUser = null;
  try {
    initialUser = await getCurrentUser();
  } catch {
    // Auth not configured yet or no session
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider initialUser={initialUser}>
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
