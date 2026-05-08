import { STORAGE_KEYS, type Locale } from "@/lib/ui/preferences";

export type LocaleRefreshGate = {
  current: boolean;
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
  const shouldRefresh = gate.current;
  gate.current = true;

  actions.writeLocale(locale);
  actions.setCookie(STORAGE_KEYS.locale, locale);
  actions.setDocumentLang(locale);

  if (shouldRefresh) {
    actions.refresh();
  }
}
