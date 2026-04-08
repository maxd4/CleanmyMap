"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  LOCALES,
  STORAGE_KEYS,
  THEMES,
  type Locale,
  type ThemeMode,
} from "@/lib/ui/preferences";

type SitePreferencesContextValue = {
  locale: Locale;
  setLocale: (value: Locale) => void;
  theme: ThemeMode;
  setTheme: (value: ThemeMode) => void;
  toggleTheme: () => void;
};

const SitePreferencesContext = createContext<SitePreferencesContextValue | null>(null);

function parseLocale(raw: string | null): Locale {
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}

function parseTheme(raw: string | null): ThemeMode {
  return THEMES.includes(raw as ThemeMode) ? (raw as ThemeMode) : DEFAULT_THEME;
}

export function SitePreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LOCALE;
    }
    return parseLocale(window.localStorage.getItem(STORAGE_KEYS.locale));
  });
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }
    const storedThemeRaw = window.localStorage.getItem(STORAGE_KEYS.theme);
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return parseTheme(storedThemeRaw ?? preferredTheme);
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.locale, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setLocale = useCallback((value: Locale) => setLocaleState(value), []);
  const setTheme = useCallback((value: ThemeMode) => setThemeState(value), []);
  const toggleTheme = useCallback(() => {
    setThemeState((previous) => (previous === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<SitePreferencesContextValue>(
    () => ({
      locale,
      setLocale,
      theme,
      setTheme,
      toggleTheme,
    }),
    [locale, setLocale, setTheme, theme, toggleTheme],
  );

  return <SitePreferencesContext.Provider value={value}>{children}</SitePreferencesContext.Provider>;
}

export function useSitePreferences(): SitePreferencesContextValue {
  const context = useContext(SitePreferencesContext);
  if (!context) {
    throw new Error("useSitePreferences must be used inside SitePreferencesProvider");
  }
  return context;
}
