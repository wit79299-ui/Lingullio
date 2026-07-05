import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopBar } from '@/components/layout/top-bar';
import { GamificationToastStack } from '@/components/gamification/xp-toast';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LearnerLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen overflow-x-hidden w-full max-w-full">
      <Sidebar />
      <TopBar />
      <GamificationToastStack />
      <main className="lg:pl-64 pb-20 lg:pb-0 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8 overflow-x-hidden">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
