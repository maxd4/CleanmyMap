export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const THEMES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEMES)[number];

export const DISPLAY_MODES = ["exhaustif", "sobre", "simplifie"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const STORAGE_KEYS = {
  locale: "cleanmymap.locale",
  theme: "cleanmymap.theme",
  displayMode: "cleanmymap.display_mode",
} as const;

export const DEFAULT_LOCALE: Locale = "fr";
export const DEFAULT_THEME: ThemeMode = "light";
export const DEFAULT_DISPLAY_MODE: DisplayMode = "exhaustif";

export function parseDisplayMode(raw: string | null | undefined): DisplayMode {
  return DISPLAY_MODES.includes(raw as DisplayMode)
    ? (raw as DisplayMode)
    : DEFAULT_DISPLAY_MODE;
}
