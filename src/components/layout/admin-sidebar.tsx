'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  BookOpen,
  BookOpenText,
  Languages,
  PenTool,
  BarChart3,
  Settings,
  ClipboardList,
} from 'lucide-react';

const adminNavItems = [
  { key: 'dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'courses', href: '/admin/content/courses', icon: BookOpen },
  { key: 'vocabulary', href: '/admin/content/vocabulary', icon: BookOpenText },
  { key: 'grammar', href: '/admin/content/grammar', icon: Languages },
  { key: 'characters', href: '/admin/content/characters', icon: PenTool },
  { key: 'learners', href: '/admin/learners', icon: Users },
  { key: 'licenses', href: '/admin/licenses', icon: KeyRound },
  { key: 'analytics', href: '/admin/analytics', icon: BarChart3 },
  { key: 'logs', href: '/admin/logs', icon: ClipboardList },
  { key: 'settings', href: '/admin/settings', icon: Settings },
] as const;

export function AdminSidebar() {
  const t = useTranslations('admin');
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-navy-900 text-white z-40">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-white/10">
        <img
          src="/logo-lingullio.png"
          alt="Lingullio Admin"
          className="h-8 w-auto brightness-0 invert"
        />
        <span className="ml-3 text-xs font-medium text-white/50 uppercase tracking-wider">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Admin navigation">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
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
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
