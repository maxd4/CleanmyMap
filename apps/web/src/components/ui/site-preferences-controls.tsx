"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { Languages, Moon, Sun, LayoutPanelLeft } from "lucide-react";

export function SitePreferencesControls() {
  const { locale, setLocale, theme, toggleTheme, displayMode, setDisplayMode } =
    useSitePreferences();

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-100/85 p-1 dark:border-slate-700/60 dark:bg-slate-800/85">
      {/* Language Selector */}
      <div className="relative group">
        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-slate-400 transition-colors group-hover:text-emerald-500">
          <Languages size={14} />
        </div>
        <select
          id="locale-switch"
          value={locale}
          onChange={(event) =>
            setLocale(event.target.value === "en" ? "en" : "fr")
          }
          className="cursor-pointer appearance-none rounded-lg bg-transparent px-2 py-1.5 pl-7 text-[11px] font-bold text-slate-600 transition-colors hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-700/80 focus:outline-none"
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
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-700/80"
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
        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-slate-400 transition-colors group-hover:text-emerald-500">
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
          className="cursor-pointer appearance-none rounded-lg bg-transparent px-2 py-1.5 pl-7 text-[11px] font-bold text-slate-600 transition-colors hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-700/80 focus:outline-none"
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
