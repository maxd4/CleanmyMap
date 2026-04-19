"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { Languages, Moon, Sun, LayoutPanelLeft } from "lucide-react";

export function SitePreferencesControls() {
  const { locale, setLocale, theme, toggleTheme, displayMode, setDisplayMode } =
    useSitePreferences();

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
      {/* Language Selector */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-slate-400 group-hover:text-emerald-500 transition-colors">
          <Languages size={14} />
        </div>
        <select
          id="locale-switch"
          value={locale}
          onChange={(event) =>
            setLocale(event.target.value === "en" ? "en" : "fr")
          }
          className="appearance-none rounded-lg bg-transparent pl-7 pr-2 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer focus:outline-none"
          aria-label={locale === "fr" ? "Choisir la langue" : "Choose language"}
        >
          <option value="fr">FR</option>
          <option value="en">EN</option>
        </select>
      </div>

      <div className="h-4 w-px bg-slate-300/30 dark:bg-slate-600/30" />

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
        aria-label={locale === "fr" ? "Changer le thème" : "Toggle theme"}
      >
        {theme === "dark" ? (
          <Moon size={14} className="text-indigo-400" />
        ) : (
          <Sun size={14} className="text-amber-500" />
        )}
        <span className="hidden sm:inline">
          {theme === "dark" 
            ? (locale === "fr" ? "Sombre" : "Dark") 
            : (locale === "fr" ? "Clair" : "Light")}
        </span>
      </button>

      <div className="h-4 w-px bg-slate-300/30 dark:bg-slate-600/30" />

      {/* Display Mode Selector */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-slate-400 group-hover:text-emerald-500 transition-colors">
          <LayoutPanelLeft size={14} />
        </div>
        <select
          id="display-mode-switch"
          value={displayMode}
          onChange={(event) => {
            const nextMode = event.target.value;
            setDisplayMode(
              nextMode === "sobre" || nextMode === "simplifie"
                ? nextMode
                : "exhaustif",
            );
          }}
          className="appearance-none rounded-lg bg-transparent pl-7 pr-2 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer focus:outline-none"
          aria-label={
            locale === "fr"
              ? "Choisir le mode d'affichage"
              : "Choose display mode"
          }
        >
          <option value="exhaustif">
            {locale === "fr" ? "Exhaustif" : "Exhaustive"}
          </option>
          <option value="sobre">{locale === "fr" ? "Sobre" : "Calm"}</option>
          <option value="simplifie">
            {locale === "fr" ? "Simplifié" : "Simple"}
          </option>
        </select>
      </div>
    </div>
  );
}
