import { STORAGE_KEYS, type Locale } from "@/lib/ui/preferences";

export type LocaleRefreshGate = {
  current: boolean;
  lastLocale?: Locale;
};

export type LocalePreferenceSyncActions = {
  writeLocale: (value: Locale) => void;
  setCookie: (name: string, value: string) => void;
  setDocumentLang: (value: Locale) => void;
  refresh: () => void;
};

export function applyLocalePreferenceChange(
  locale: Locale,
  gate: LocaleRefreshGate,
  actions: LocalePreferenceSyncActions,
): void {
  // React Strict Mode re-runs mount effects in development. Remembering the
  // locale that was actually applied makes that second identical invocation
  // idempotent while still refreshing after a real locale change.
  const shouldRefresh = gate.current && gate.lastLocale !== locale;
  gate.current = true;
  gate.lastLocale = locale;

  actions.writeLocale(locale);
  actions.setCookie(STORAGE_KEYS.locale, locale);
  actions.setDocumentLang(locale);

  if (shouldRefresh) {
    actions.refresh();
  }
}
