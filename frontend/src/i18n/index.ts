import de, { type TranslationKey } from "./de";

const translations = { de } as const;

type SupportedLocale = keyof typeof translations;

let currentLocale: SupportedLocale = "de";

export function setLocale(locale: SupportedLocale): void {
  currentLocale = locale;
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

/**
 * Translate a key, optionally interpolating positional {0}, {1}, ... placeholders.
 */
export function t(key: TranslationKey, ...args: (string | number)[]): string {
  const value = translations[currentLocale][key];
  if (args.length === 0) return value;
  return value.replace(/\{(\d+)\}/g, (_, index) => {
    const i = parseInt(index as string, 10);
    return args[i] !== undefined ? String(args[i]) : `{${index}}`;
  });
}

export type { TranslationKey };
