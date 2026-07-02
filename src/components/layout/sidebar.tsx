'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { signOut } from '@/lib/auth/actions';
import {
  Home,
  BookOpen,
  RefreshCw,
  FileText,
  TrendingUp,
  Target,
  Library,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';

const navItems = [
  { key: 'home', href: '/dashboard', icon: Home },
  { key: 'courses', href: '/courses', icon: BookOpen },
  { key: 'revisions', href: '/revisions', icon: RefreshCw },
  { key: 'mockExams', href: '/mock-exams', icon: FileText },
  { key: 'progress', href: '/progress', icon: TrendingUp },
  { key: 'objectives', href: '/objectives', icon: Target },
  { key: 'resources', href: '/resources', icon: Library },
] as const;

const bottomItems = [
  { key: 'settings', href: '/settings', icon: Settings },
  { key: 'help', href: '/help', icon: HelpCircle },
] as const;

export function Sidebar() {
  const t = useTranslations('nav');
  const ta = useTranslations('auth');
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  async function handleLogout() {
    await signOut();
    window.location.href = '/login';
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-navy-700 text-white z-40">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-white/10">
        <img
          src="/logo-lingullio.png"
          alt="Lingullio"
          className="h-8 w-auto brightness-0 invert"
        />
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-sm font-medium text-white truncate">
            {user.display_name || user.email}
          </p>
          <p className="text-xs text-white/50 truncate">{user.email}</p>
        </div>
      )}

      {/* Main nav */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                'touch-target',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                'touch-target',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-white/70 hover:bg-white/10 hover:text-white touch-target"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{ta('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
