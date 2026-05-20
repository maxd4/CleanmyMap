import {
  createLocalStorageStore,
  createLocalStorageStringStore,
  isBooleanRecord,
} from "./local-storage";
import {
  DEFAULT_DISPLAY_MODE,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  ENABLED_DISPLAY_MODES,
  LOCALES,
  STORAGE_KEYS,
  THEMES,
  type DisplayMode,
  type Locale,
  type ThemeMode,
} from "@/lib/ui/preferences";

export type ConsentChoice = "accepted" | "rejected" | null;

export type CookieConsentState = {
  choice: ConsentChoice;
  timestamp: number | null;
  analytics: boolean;
};

const COOKIE_CONSENT_KEY = "cleanmymap_cookie_consent";
export const COOKIE_CONSENT_CHANGE_EVENT = "cleanmymap-cookie-consent-change";
const DEFAULT_COOKIE_CONSENT_STATE: CookieConsentState = {
  choice: null,
  timestamp: null,
  analytics: false,
};

const DEFAULT_GUIDE_CHECKLIST = {
  briefing: false,
  declaration: false,
  tracing: false,
  moderation: false,
  export: false,
} as const;

export const siteLocaleStorage = createLocalStorageStringStore<Locale>(
  STORAGE_KEYS.locale,
  LOCALES,
);

export const siteThemeStorage = createLocalStorageStringStore<ThemeMode>(
  STORAGE_KEYS.theme,
  THEMES,
);

export const siteDisplayModeStorage = createLocalStorageStringStore<DisplayMode>(
  STORAGE_KEYS.displayMode,
  ENABLED_DISPLAY_MODES,
);

export const dashboardPeriodStorage = createLocalStorageStore<30 | 90 | 365>(
  "cmm_dashboard_days",
  {
    parse: (raw) => {
      const parsed = Number(raw);
      if (parsed === 30 || parsed === 90 || parsed === 365) {
        return parsed;
      }
      return 90;
    },
    serialize: (value) => String(value),
  },
);

export const guideChecklistStorage = createLocalStorageStore<
  Record<string, boolean>
>("cleanmymap.guide.checklist", {
  parse: (raw) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isBooleanRecord(parsed)) {
        return { ...DEFAULT_GUIDE_CHECKLIST };
      }
      return { ...DEFAULT_GUIDE_CHECKLIST, ...parsed };
    } catch {
      return { ...DEFAULT_GUIDE_CHECKLIST };
    }
  },
  serialize: (value) => JSON.stringify(value),
});

export const cookieConsentStorage = createLocalStorageStore<CookieConsentState>(
  COOKIE_CONSENT_KEY,
  {
    parse: (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          return { ...DEFAULT_COOKIE_CONSENT_STATE };
        }

        const choice = (parsed as { choice?: unknown }).choice;
        const timestamp = (parsed as { timestamp?: unknown }).timestamp;
        const analytics = (parsed as { analytics?: unknown }).analytics;

        return {
          choice:
            choice === "accepted" || choice === "rejected" ? choice : null,
          timestamp: typeof timestamp === "number" ? timestamp : null,
          analytics: typeof analytics === "boolean" ? analytics : false,
        };
      } catch {
        return { ...DEFAULT_COOKIE_CONSENT_STATE };
      }
    },
    serialize: (value) => JSON.stringify(value),
  },
);

export const DEFAULT_SITE_PREFERENCES = {
  locale: DEFAULT_LOCALE,
  theme: DEFAULT_THEME,
  displayMode: DEFAULT_DISPLAY_MODE,
} as const;

export function notifyCookieConsentChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
}
