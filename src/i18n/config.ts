export const locales = ['en', 'fr'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

export const rtlLocales: Locale[] = [];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
