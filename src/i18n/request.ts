import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  // Try loading locale-specific messages, fallback to fr (default) if not found
  let messages;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    // Locale file doesn't exist yet — fallback to French
    messages = (await import(`../messages/fr.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
