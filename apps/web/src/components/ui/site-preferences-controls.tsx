"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  DISPLAY_MODE_DESCRIPTIONS,
  ENABLED_DISPLAY_MODES,
  type DisplayMode,
} from "@/lib/ui/preferences";
import { ChevronDown, CheckCircle2, Info, Languages } from "lucide-react";
import { CmmSelect } from "@/components/ui/cmm-field";
import Link from "next/link";

type SitePreferencesControlsProps = {
  variant?: "full" | "locale";
};

export function SitePreferencesControls({
  variant = "full",
}: SitePreferencesControlsProps) {
  const { locale, setLocale, displayMode, setDisplayMode } =
    useSitePreferences();

  const displayModeLabels: Record<DisplayMode, { fr: string; en: string }> = {
    exhaustif: { fr: "Exhaustif", en: "Exhaustive" },
    minimaliste: { fr: "Minimaliste", en: "Minimal" },
    sobre: { fr: "Sobre", en: "Calm" },
  };

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
    <div className="space-y-5 text-white">
      <div className="space-y-2">
        <label htmlFor="locale-switch" className="block text-base font-semibold text-white">
          {locale === "fr" ? "Langue" : "Language"}
        </label>
        <div className="relative">
          <Languages
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
            aria-hidden="true"
          />
          <CmmSelect
            id="locale-switch"
            value={locale}
            onChange={(event) => setLocale(event.target.value === "en" ? "en" : "fr")}
            className="cmm-select-control min-h-12 w-full cursor-pointer rounded-xl border-white/15 bg-slate-900/70 py-2.5 pl-10 pr-10 text-sm font-semibold text-white"
            aria-label={locale === "fr" ? "Choisir la langue" : "Choose language"}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </CmmSelect>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
            aria-hidden="true"
          />
        </div>
      </div>

      <fieldset className="space-y-3 border-t border-white/12 pt-4">
        <legend className="text-base font-semibold text-white">
          {locale === "fr" ? "Mode d'affichage" : "Display mode"}
        </legend>
        <div className="space-y-2">
          {ENABLED_DISPLAY_MODES.map((mode) => {
            const isActive = displayMode === mode;
            const description = DISPLAY_MODE_DESCRIPTIONS[mode][locale];

            return (
              <label
                key={mode}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  isActive
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-white/16 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]"
                }`}
              >
                <input
                  type="radio"
                  name="display-mode"
                  value={mode}
                  checked={isActive}
                  onChange={() => setDisplayMode(mode)}
                  className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">
                    {displayModeLabels[mode][locale]}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-300">
                    {description}
                  </span>
                </span>
                {isActive ? (
                  <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Link
        href="/methodologie#modes-affichage"
        aria-label="Comprendre les modes d'affichage"
        className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {locale === "fr"
            ? "En savoir plus sur les modes d'affichage"
            : "Learn more about display modes"}
        </span>
      </Link>
    </div>
  );
}
