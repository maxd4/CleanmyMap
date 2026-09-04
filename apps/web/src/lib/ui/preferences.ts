export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const THEMES = ["mixed", "dark"] as const;
export type ThemeMode = (typeof THEMES)[number];

/**
 * Modes d'affichage:
 * - exhaustif: Charte premium complète (gradient, glassmorphism, animations)
 * - minimaliste: Essentiel stylé (fond uni, ombres soft, pas de blur)
 * - sobre: Accessibilité cognitive (aucun effet, statique, contrastes élevés)
 */
export const DISPLAY_MODES = ["exhaustif", "minimaliste", "sobre"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];
export const ENABLED_DISPLAY_MODES = ["exhaustif", "minimaliste", "sobre"] as const;

export const DISPLAY_MODE_DESCRIPTIONS: Record<
  DisplayMode,
  { fr: string; en: string }
> = {
  exhaustif: {
    fr: "Expérience CleanMyMap complète.",
    en: "Complete CleanMyMap experience.",
  },
  minimaliste: {
    fr: "Allez droit au but sans contenu superflu",
    en: "Go straight to the point without unnecessary content.",
  },
  sobre: {
    fr: "Adaptez le rendu visuel pour réduire la fatigue visuelle et cognitive sans modification du contenu.",
    en: "Adapt the visual presentation to reduce visual and cognitive fatigue without changing the content.",
  },
};

export const STORAGE_KEYS = {
  locale: "cleanmymap.locale",
  theme: "cleanmymap.theme",
  displayMode: "cleanmymap.display_mode",
  displayModePendingSync: "cleanmymap.display_mode_pending_sync",
} as const;

export const DEFAULT_LOCALE: Locale = "fr";
export const DEFAULT_THEME: ThemeMode = "mixed";
export const DEFAULT_DISPLAY_MODE: DisplayMode = "exhaustif";

export function parseDisplayMode(raw: string | null | undefined): DisplayMode {
  return ENABLED_DISPLAY_MODES.includes(
    raw as (typeof ENABLED_DISPLAY_MODES)[number],
  )
    ? (raw as DisplayMode)
    : DEFAULT_DISPLAY_MODE;
}
