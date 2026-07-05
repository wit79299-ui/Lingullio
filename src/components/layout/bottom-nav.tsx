'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Home, BookOpen, RefreshCw, User, Trophy } from 'lucide-react';

const mobileNavItems = [
  { key: 'home', href: '/dashboard', icon: Home },
  { key: 'courses', href: '/courses', icon: BookOpen },
  { key: 'mockExams', href: '/mock-exams', icon: Trophy },
  { key: 'revisions', href: '/revisions', icon: RefreshCw },
  { key: 'profile', href: '/settings', icon: User },
] as const;

export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-cream-100 z-40 safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 touch-target',
                'transition-colors duration-150',
                isActive
                  ? 'text-navy-900'
                  : 'text-navy-400 hover:text-navy-700'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium leading-none">
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
