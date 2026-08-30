"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  parseDisplayMode,
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
import {
  applyLocalePreferenceChange,
  resolveInitialLocale,
} from "./site-preferences-locale-sync";

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
  initialLocale?: Locale;
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
  initialLocale,
  initialDisplayMode,
  initialDisplayModeExplicit = false,
}: SitePreferencesProviderProps) {
  const shouldRefreshAfterLocaleChange = useRef(false);

  const [locale, setLocaleState] = useState<Locale>(
    // Le rendu serveur reste déterministe; la préférence navigateur est
    // restaurée après montage pour éviter un mismatch d'hydratation.
    resolveInitialLocale(initialLocale, null),
  );
  const [hasResolvedClientPreferences, setHasResolvedClientPreferences] =
    useState(false);

  const [theme, setThemeState] = useState<ThemeMode>(
    STORAGE_DEFAULTS.theme,
  );

  const [displayMode, setDisplayModeState] = useState<DisplayMode>(
    parseDisplayMode(initialDisplayMode),
  );

  const [isDisplayModeExplicitlySet, setIsDisplayModeExplicitlySet] =
    useState<boolean>(initialDisplayModeExplicit ?? false);

  // Après le premier rendu (client uniquement), on synchronise avec le localStorage
  useEffect(() => {
    const storedLocale = siteLocaleStorage.read();
    setLocaleState(() => resolveInitialLocale(initialLocale, storedLocale));

    const storedTheme = siteThemeStorage.read();
    if (storedTheme) setThemeState(storedTheme);

    if (!initialDisplayModeExplicit) {
      const storedDisplayMode = siteDisplayModeStorage.read();
      if (storedDisplayMode) {
        setDisplayModeState(storedDisplayMode);
        setIsDisplayModeExplicitlySet(true);
      }
    }
    removeLocalStorageEntry(STORAGE_KEYS.displayModePendingSync);
    setHasResolvedClientPreferences(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!hasResolvedClientPreferences) {
      return;
    }

    applyLocalePreferenceChange(locale, shouldRefreshAfterLocaleChange, {
      writeLocale: (value) => {
        siteLocaleStorage.write(value);
      },
      setCookie,
      setDocumentLang: (value) => {
        document.documentElement.lang = value;
      },
      refresh: () => {
        window.location.reload();
      },
    });
  }, [hasResolvedClientPreferences, locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!hasResolvedClientPreferences) {
      return;
    }

    siteThemeStorage.write(theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [hasResolvedClientPreferences, theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!hasResolvedClientPreferences) {
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
  }, [displayMode, hasResolvedClientPreferences, isDisplayModeExplicitlySet]);

  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value);
  }, []);

  const setTheme = useCallback((value: ThemeMode) => {
    setThemeState(value);
  }, []);

  const setDisplayMode = useCallback((value: DisplayMode) => {
    setDisplayModeState(parseDisplayMode(value));
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
