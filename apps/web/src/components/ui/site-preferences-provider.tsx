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
  DEFAULT_DISPLAY_MODE,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  DISPLAY_MODES,
  LOCALES,
  STORAGE_KEYS,
  THEMES,
  type DisplayMode,
  type Locale,
  type ThemeMode,
} from "@/lib/ui/preferences";

type SitePreferencesContextValue = {
  locale: Locale;
  setLocale: (value: Locale) => void;
  theme: ThemeMode;
  setTheme: (value: ThemeMode) => void;
  toggleTheme: () => void;
  displayMode: DisplayMode;
  setDisplayMode: (value: DisplayMode) => void;
  isDisplayModeExplicitlySet: boolean;
};

type SitePreferencesProviderProps = {
  children: ReactNode;
  initialDisplayMode?: DisplayMode;
  initialDisplayModeExplicit?: boolean;
};

const SitePreferencesContext =
  createContext<SitePreferencesContextValue | null>(null);

function parseLocale(raw: string | null): Locale {
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}

function parseTheme(raw: string | null): ThemeMode {
  return THEMES.includes(raw as ThemeMode) ? (raw as ThemeMode) : DEFAULT_THEME;
}

function parseDisplayMode(raw: string | null): DisplayMode {
  return DISPLAY_MODES.includes(raw as DisplayMode)
    ? (raw as DisplayMode)
    : DEFAULT_DISPLAY_MODE;
}

export function SitePreferencesProvider({
  children,
  initialDisplayMode,
  initialDisplayModeExplicit = false,
}: SitePreferencesProviderProps) {
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
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    return parseTheme(storedThemeRaw ?? preferredTheme);
  });
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") {
      return initialDisplayMode ?? DEFAULT_DISPLAY_MODE;
    }
    if (initialDisplayModeExplicit) {
      return initialDisplayMode ?? DEFAULT_DISPLAY_MODE;
    }
    return parseDisplayMode(
      window.localStorage.getItem(STORAGE_KEYS.displayMode),
    );
  });
  const [isDisplayModeExplicitlySet, setIsDisplayModeExplicitlySet] =
    useState<boolean>(() => {
      if (typeof window === "undefined") {
        return initialDisplayModeExplicit ?? false;
      }
      if (initialDisplayModeExplicit) {
        return true;
      }
      return Boolean(window.localStorage.getItem(STORAGE_KEYS.displayMode));
    });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.locale, locale);
    document.cookie = `${STORAGE_KEYS.locale}=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`;
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (isDisplayModeExplicitlySet) {
      window.localStorage.setItem(STORAGE_KEYS.displayMode, displayMode);
      document.cookie = `${STORAGE_KEYS.displayMode}=${displayMode}; Max-Age=31536000; Path=/; SameSite=Lax`;
      document.documentElement.setAttribute("data-display-mode", displayMode);
      return;
    }
    window.localStorage.removeItem(STORAGE_KEYS.displayMode);
    document.cookie = `${STORAGE_KEYS.displayMode}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.documentElement.removeAttribute("data-display-mode");
  }, [displayMode, isDisplayModeExplicitlySet]);

  const setLocale = useCallback((value: Locale) => setLocaleState(value), []);
  const setTheme = useCallback((value: ThemeMode) => setThemeState(value), []);
  const setDisplayMode = useCallback((value: DisplayMode) => {
    setDisplayModeState(value);
    setIsDisplayModeExplicitlySet(true);
    void fetch("/api/account/display-mode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayMode: value }),
    }).catch((error: unknown) => {
      console.error("Failed to persist display mode preference", error);
    });
  }, []);
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
      displayMode,
      setDisplayMode,
      isDisplayModeExplicitlySet,
    }),
    [
      displayMode,
      isDisplayModeExplicitlySet,
      locale,
      setDisplayMode,
      setLocale,
      setTheme,
      theme,
      toggleTheme,
    ],
  );

  return (
    <SitePreferencesContext.Provider value={value}>
      {children}
    </SitePreferencesContext.Provider>
  );
}

export function useSitePreferences(): SitePreferencesContextValue {
  const context = useContext(SitePreferencesContext);
  if (!context) {
    throw new Error(
      "useSitePreferences must be used inside SitePreferencesProvider",
    );
  }
  return context;
}
