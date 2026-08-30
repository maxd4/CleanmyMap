import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  DEFAULT_DISPLAY_MODE,
  ENABLED_DISPLAY_MODES,
  LOCALES,
  STORAGE_KEYS,
  THEMES,
} from "@/lib/ui/preferences";

const DISPLAY_MODE_INITIALIZER_SCRIPT = `(() => {
  const localeFallback = ${JSON.stringify(DEFAULT_LOCALE)};
  const localeAllowed = ${JSON.stringify(LOCALES)};
  const themeFallback = ${JSON.stringify(DEFAULT_THEME)};
  const themeAllowed = ${JSON.stringify(THEMES)};
  const displayModeFallback = ${JSON.stringify(DEFAULT_DISPLAY_MODE)};
  const displayModeAllowed = ${JSON.stringify(ENABLED_DISPLAY_MODES)};

  try {
    const storedLocale = window.localStorage.getItem(${JSON.stringify(STORAGE_KEYS.locale)});
    const locale = localeAllowed.includes(storedLocale) ? storedLocale : localeFallback;
    const storedTheme = window.localStorage.getItem(${JSON.stringify(STORAGE_KEYS.theme)});
    const theme = themeAllowed.includes(storedTheme) ? storedTheme : themeFallback;
    const storedDisplayMode = window.localStorage.getItem(${JSON.stringify(STORAGE_KEYS.displayMode)});
    const displayMode = displayModeAllowed.includes(storedDisplayMode)
      ? storedDisplayMode
      : displayModeFallback;
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.displayMode = displayMode;
  } catch {
    document.documentElement.lang = localeFallback;
    document.documentElement.dataset.theme = themeFallback;
    document.documentElement.dataset.displayMode = displayModeFallback;
  }
})();`;

export function DisplayModeInitializer() {
  return (
    <script
      id="cleanmymap-display-mode-initializer"
      dangerouslySetInnerHTML={{ __html: DISPLAY_MODE_INITIALIZER_SCRIPT }}
    />
  );
}

export { DISPLAY_MODE_INITIALIZER_SCRIPT };
