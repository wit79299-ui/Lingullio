'use client';

import { Bell } from 'lucide-react';

export function TopBar() {
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white border-b border-cream-100">
      <img
        src="/logo-lingullio.png"
        alt="Lingullio"
        className="h-7 w-auto"
      />
      <button
        type="button"
        className="relative flex items-center justify-center w-10 h-10 rounded-full text-navy-700 hover:bg-cream-50 transition-colors touch-target"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {/* Notification dot */}
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-teal-500" />
      </button>
    </header>
  );
}
