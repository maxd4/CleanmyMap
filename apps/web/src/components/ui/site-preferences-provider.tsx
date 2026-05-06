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
  STORAGE_KEYS,
  type DisplayMode,
  type Locale,
  type ThemeMode,
} from "@/lib/ui/preferences";
import {
  removeLocalStorageEntry,
} from "@/lib/storage/local-storage";
import {
  DEFAULT_SITE_PREFERENCES as STORAGE_DEFAULTS,
  siteDisplayModeStorage,
  siteLocaleStorage,
  siteThemeStorage,
} from "@/lib/storage/ui-state-storage";

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

const SitePreferencesContext = createContext<SitePreferencesContextValue | null>(null);

function setCookie(name: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  document.cookie = `${name}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (typeof window === "undefined") {
    return;
  }

  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function applyDisplayModeAttribute(displayMode: DisplayMode): void {
  if (typeof window === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-display-mode", displayMode);
}

export function SitePreferencesProvider({
  children,
  initialDisplayMode,
  initialDisplayModeExplicit = false,
}: SitePreferencesProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return STORAGE_DEFAULTS.locale;
    }
    return siteLocaleStorage.read() ?? STORAGE_DEFAULTS.locale;
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return STORAGE_DEFAULTS.theme;
    }
    return siteThemeStorage.read() ?? STORAGE_DEFAULTS.theme;
  });

  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") {
      return initialDisplayMode ?? DEFAULT_DISPLAY_MODE;
    }
    if (initialDisplayModeExplicit) {
      return initialDisplayMode ?? DEFAULT_DISPLAY_MODE;
    }
    return siteDisplayModeStorage.read() ?? DEFAULT_DISPLAY_MODE;
  });

  const [isDisplayModeExplicitlySet, setIsDisplayModeExplicitlySet] =
    useState<boolean>(() => {
      if (typeof window === "undefined") {
        return initialDisplayModeExplicit ?? false;
      }
      if (initialDisplayModeExplicit) {
        return true;
      }
      return siteDisplayModeStorage.read() !== null;
    });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    siteLocaleStorage.write(locale);
    setCookie(STORAGE_KEYS.locale, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    siteThemeStorage.write(theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    applyDisplayModeAttribute(displayMode);

    if (isDisplayModeExplicitlySet) {
      siteDisplayModeStorage.write(displayMode);
      setCookie(STORAGE_KEYS.displayMode, displayMode);
      return;
    }

    siteDisplayModeStorage.remove();
    clearCookie(STORAGE_KEYS.displayMode);
  }, [displayMode, isDisplayModeExplicitlySet]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    removeLocalStorageEntry(STORAGE_KEYS.displayModePendingSync);
  }, []);

  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value);
  }, []);

  const setTheme = useCallback((value: ThemeMode) => {
    setThemeState(value);
  }, []);

  const setDisplayMode = useCallback((value: DisplayMode) => {
    setDisplayModeState(value);
    setIsDisplayModeExplicitlySet(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "mixed" : "dark"));
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
    throw new Error("useSitePreferences must be used inside SitePreferencesProvider");
  }
  return context;
}
