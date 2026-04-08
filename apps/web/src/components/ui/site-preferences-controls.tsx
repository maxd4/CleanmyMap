"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function SitePreferencesControls() {
  const { locale, setLocale, theme, toggleTheme } = useSitePreferences();

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="locale-switch">
        Language
      </label>
      <select
        id="locale-switch"
        value={locale}
        onChange={(event) => setLocale(event.target.value === "en" ? "en" : "fr")}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
        aria-label={locale === "fr" ? "Choisir la langue" : "Choose language"}
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>

      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
        aria-label={locale === "fr" ? "Changer le thème" : "Toggle theme"}
      >
        {theme === "dark" ? (locale === "fr" ? "Sombre" : "Dark") : locale === "fr" ? "Clair" : "Light"}
      </button>
    </div>
  );
}
