export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const THEMES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEMES)[number];

export const STORAGE_KEYS = {
  locale: "cleanmymap.locale",
  theme: "cleanmymap.theme",
} as const;

export const DEFAULT_LOCALE: Locale = "fr";
export const DEFAULT_THEME: ThemeMode = "light";
