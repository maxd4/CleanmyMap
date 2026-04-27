"use client";

import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import type { DisplayMode } from"@/lib/ui/preferences";
import { Languages, Moon, Sun, LayoutPanelLeft } from"lucide-react";

type SitePreferencesControlsProps = {
 variant?:"full" |"locale";
};

export function SitePreferencesControls({
 variant ="full",
}: SitePreferencesControlsProps) {
 const { locale, setLocale, theme, toggleTheme, displayMode, setDisplayMode } =
 useSitePreferences();

 if (variant ==="locale") {
 const nextLocale = locale ==="fr" ?"en" :"fr";
 return (
 <button
 type="button"
 onClick={() => setLocale(nextLocale)}
 className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/90 px-4 py-2 cmm-text-caption font-bold uppercase tracking-[0.18em] cmm-text-secondary shadow-sm shadow-cyan-950/10 transition hover:border-cyan-300 hover:bg-cyan-50/80 dark:border-cyan-400/30 dark:bg-slate-900/85 dark:hover:bg-slate-800"
 aria-label={locale ==="fr" ?"Passer en anglais" :"Pass to French"}
 >
 <Languages size={14} className="text-cyan-600" />
 <span>{locale ==="fr" ?"FR" :"EN"}</span>
 </button>
 );
 }

 return (
 <div className="space-y-2">
 <p className="px-1 cmm-text-caption font-bold uppercase tracking-[0.2em] cmm-text-muted">
 {locale ==="fr" ?"Préférences interface" :"Interface preferences"}
 </p>
 <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-white to-slate-50 p-1.5 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.35)] dark:border-slate-700/60 dark:from-slate-900 dark:to-slate-800/90">
 {/* Language Selector */}
 <div className="relative group">
 <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center cmm-text-muted transition-colors group-hover:text-emerald-500">
 <Languages size={14} />
 </div>
 <select
 id="locale-switch"
 value={locale}
 onChange={(event) =>
 setLocale(event.target.value ==="en" ?"en" :"fr")
 }
 className="cursor-pointer appearance-none rounded-xl bg-transparent px-2 py-1.5 pl-7 cmm-text-caption font-bold cmm-text-secondary transition-colors hover:bg-white dark:hover:bg-slate-700/80 focus:outline-none"
 aria-label={locale ==="fr" ?"Choisir la langue" :"Choose language"}
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
 className="flex items-center gap-2 rounded-xl px-2 py-1.5 cmm-text-caption font-bold cmm-text-secondary transition-colors hover:bg-white dark:hover:bg-slate-700/80"
 aria-label={locale ==="fr" ?"Changer le thème" :"Toggle theme"}
 >
 {theme ==="dark" ? (
 <Moon size={14} className="text-indigo-400" />
 ) : (
 <Sun size={14} className="text-amber-500" />
 )}
 <span className="hidden sm:inline">
 {theme ==="dark" 
 ? (locale ==="fr" ?"Sombre" :"Dark") 
 : (locale ==="fr" ?"Clair" :"Light")}
 </span>
 </button>

 <div className="h-4 w-px bg-slate-300/30 dark:bg-slate-600/30" />

 {/* Display Mode Selector */}
 <div className="relative group">
 <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center cmm-text-muted transition-colors group-hover:text-emerald-500">
 <LayoutPanelLeft size={14} />
 </div>
 <select
 id="display-mode-switch"
 value={displayMode}
 onChange={(event) => {
 const nextMode = event.target.value as DisplayMode;
 setDisplayMode(nextMode);
 }}
 className="cursor-pointer appearance-none rounded-xl bg-transparent px-2 py-1.5 pl-7 cmm-text-caption font-bold cmm-text-secondary transition-colors hover:bg-white dark:hover:bg-slate-700/80 focus:outline-none"
 aria-label={
 locale ==="fr"
 ?"Choisir le mode d'affichage"
 :"Choose display mode"
 }
 title={
 locale ==="fr"
 ?"Exhaustif: premium complet • Minimaliste: essentiel stylé • Sobre: accessibilité cognitive"
 :"Exhaustive: full premium • Minimalist: essential styled • Calm: cognitive accessibility"
 }
 >
 <option value="exhaustif">
 {locale ==="fr" ?"◆ Exhaustif" :"◆ Exhaustive"}
 </option>
 <option value="minimaliste">
 {locale ==="fr" ?"◇ Minimaliste" :"◇ Minimalist"}
 </option>
 <option value="sobre">
 {locale ==="fr" ?"□ Sobre" :"□ Calm"}
 </option>
 </select>
 </div>
 </div>
 </div>
 );
}
