'use client';

import { XpBarCompact } from '@/components/gamification/xp-bar';

export function TopBar() {
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white border-b border-cream-100">
      <img
        src="/logo-lingullio.png"
        alt="Lingullio"
        className="h-7 w-auto"
      />
      <div className="flex items-center gap-2">
        <XpBarCompact />
      </div>
    </header>
  );
}
