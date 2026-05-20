"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { ChevronDown, CheckCircle2, Languages, LayoutPanelLeft, Moon, Sun } from "lucide-react";

type SitePreferencesControlsProps = {
  variant?: "full" | "locale";
};

export function SitePreferencesControls({
  variant = "full",
}: SitePreferencesControlsProps) {
  const { locale, setLocale, theme, toggleTheme } = useSitePreferences();

  if (variant === "locale") {
    const nextLocale = locale === "fr" ? "en" : "fr";
    return (
      <button
        type="button"
        onClick={() => setLocale(nextLocale)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 py-2 cmm-text-caption font-bold uppercase tracking-[0.18em] cmm-text-primary shadow-sm shadow-cyan-950/10 backdrop-blur-xl transition hover:border-cyan-300/40 hover:bg-[color:var(--bg-muted)]"
        aria-label={locale === "fr" ? "Passer en anglais" : "Pass to French"}
      >
        <Languages size={14} className="cmm-text-secondary" />
        <span>{locale === "fr" ? "FR" : "EN"}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-1 cmm-text-caption font-bold uppercase tracking-[0.2em] cmm-text-muted">
        {locale === "fr" ? "Préférences interface" : "Interface preferences"}
      </p>
      <div className="flex items-center gap-1.5 rounded-2xl border border-[color:var(--border-default)] bg-gradient-to-r from-[color:var(--bg-elevated)] to-[color:var(--bg-muted)] p-1.5 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.35)]">
        <div className="relative group min-w-[5.25rem]">
          <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center cmm-text-muted transition-colors group-hover:cmm-text-secondary">
            <Languages size={14} />
          </div>
          <select
            id="locale-switch"
            value={locale}
            onChange={(event) => setLocale(event.target.value === "en" ? "en" : "fr")}
            className="cmm-select-control cursor-pointer w-full rounded-xl px-2.5 py-2 pl-8 pr-9 cmm-text-caption font-bold cmm-text-primary transition-colors"
            aria-label={locale === "fr" ? "Choisir la langue" : "Choose language"}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center cmm-text-muted">
            <ChevronDown size={14} />
          </div>
        </div>

        <div className="h-4 w-px bg-[color:var(--border-default)]/60" />

        <button
          type="button"
          onClick={toggleTheme}
          className="hidden min-h-11 items-center gap-2 rounded-xl px-3 py-2 cmm-text-caption font-bold cmm-text-secondary transition-colors hover:bg-cyan-300/10 hover:text-[color:var(--text-primary)]"
          aria-label={locale === "fr" ? "Changer le thème" : "Toggle theme"}
        >
          {theme === "dark" ? (
            <Moon size={14} className="text-indigo-400" />
          ) : (
            <Sun size={14} className="text-amber-500" />
          )}
          <span className="hidden sm:inline">
            {theme === "dark"
              ? locale === "fr"
                ? "Sombre"
                : "Dark"
              : locale === "fr"
                ? "Mixte"
                : "Mixed"}
          </span>
        </button>

        <div className="hidden h-4 w-px bg-[color:var(--border-default)]/60" />

        <div className="flex min-w-[11rem] items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-2">
          <LayoutPanelLeft size={14} className="cmm-text-muted" />
          <div className="min-w-0">
            <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] cmm-text-muted">
              {locale === "fr" ? "Mode d'affichage" : "Display mode"}
            </p>
            <p className="text-[0.74rem] font-semibold text-emerald-700">
              {locale === "fr" ? "Exhaustif" : "Exhaustive"}
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            <CheckCircle2 size={11} />
            {locale === "fr" ? "Actif" : "Active"}
          </span>
        </div>
      </div>
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700/70">
        {locale === "fr"
          ? "Sobre et Minimaliste sont en préparation"
          : "Calm and Minimalist are in preparation"}
      </p>
    </div>
  );
}
