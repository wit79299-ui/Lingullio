export const locales = [
  'fr', 'en', 'es', 'vi', 'id', 'th', 'ja', 'ko',
  'zh-Hans', 'zh-Hant', 'hi', 'ar', 'ru', 'tr',
  'pl', 'ro', 'uk', 'pt', 'de', 'it',
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const localeNames: Record<Locale, string> = {
  fr: 'Francais',
  en: 'English',
  es: 'Espanol',
  vi: 'Tieng Viet',
  id: 'Bahasa Indonesia',
  th: 'Thai',
  ja: 'Nihongo',
  ko: 'Hangugeo',
  'zh-Hans': 'Zhongwen (Jianti)',
  'zh-Hant': 'Zhongwen (Fanti)',
  hi: 'Hindi',
  ar: 'Arabiyya',
  ru: 'Russkiy',
  tr: 'Turkce',
  pl: 'Polski',
  ro: 'Romana',
  uk: 'Ukrayinska',
  pt: 'Portugues',
  de: 'Deutsch',
  it: 'Italiano',
};

export const rtlLocales: Locale[] = ['ar'];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
