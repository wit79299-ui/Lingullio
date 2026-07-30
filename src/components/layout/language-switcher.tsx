'use client';

import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/** Compact locale display labels */
const SHORT_LABELS: Record<string, string> = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  vi: 'VI',
  id: 'ID',
  th: 'TH',
  ja: 'JA',
  ko: 'KO',
  'zh-Hans': '简',
  'zh-Hant': '繁',
  hi: 'HI',
  ar: 'AR',
  ru: 'RU',
  tr: 'TR',
  pl: 'PL',
  ro: 'RO',
  uk: 'UK',
  pt: 'PT',
  de: 'DE',
  it: 'IT',
};

const FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  vi: '🇻🇳',
  id: '🇮🇩',
  th: '🇹🇭',
  ja: '🇯🇵',
  ko: '🇰🇷',
  'zh-Hans': '🇨🇳',
  'zh-Hant': '🇹🇼',
  hi: '🇮🇳',
  ar: '🇸🇦',
  ru: '🇷🇺',
  tr: '🇹🇷',
  pl: '🇵🇱',
  ro: '🇷🇴',
  uk: '🇺🇦',
  pt: '🇧🇷',
  de: '🇩🇪',
  it: '🇮🇹',
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function switchLocale(newLocale: Locale) {
    setOpen(false);
    if (newLocale === locale) return;
    // Build target URL: pathname from usePathname() is already locale-stripped
    // For default locale (en) with localePrefix:'as-needed', no prefix needed
    // For other locales, prepend /{locale}
    const prefix = newLocale === 'en' ? '' : `/${newLocale}`;
    const targetUrl = `${prefix}${pathname}`;
    // Force full page navigation to ensure all components re-render with new locale
    window.location.href = targetUrl;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-navy-700 hover:bg-cream-50 transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4 text-navy-400" />
        <span className="hidden sm:inline">{FLAGS[locale]} {SHORT_LABELS[locale] ?? locale.toUpperCase()}</span>
        <span className="sm:hidden">{FLAGS[locale]}</span>
        <ChevronDown className={`h-3 w-3 text-navy-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-80 overflow-y-auto rounded-xl bg-white shadow-lg border border-cream-100 py-1">
          {locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
                ${loc === locale
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-navy-700 hover:bg-cream-25'
                }`}
            >
              <span className="text-base w-6 text-center">{FLAGS[loc]}</span>
              <span className="flex-1 text-left">{localeNames[loc]}</span>
              {loc === locale && (
                <span className="h-2 w-2 rounded-full bg-teal-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
