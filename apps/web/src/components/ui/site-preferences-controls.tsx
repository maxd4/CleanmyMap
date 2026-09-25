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
import { cn } from "@/lib/utils";

type SitePreferencesControlsProps = {
  variant?: "full" | "compact" | "locale";
  surface?: "dark" | "light";
};

const SURFACE_STYLES = {
  dark: {
    copy: "text-white",
    secondaryCopy: "text-slate-300",
    select: "border-white/15 bg-slate-900/70 text-white",
    divider: "border-t border-white/12",
    activeOption: "border-emerald-400 bg-emerald-400/10",
    inactiveOption: "border-white/16 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]",
    link: "text-emerald-200 hover:text-white",
  },
  light: {
    copy: "text-slate-900",
    secondaryCopy: "text-slate-600",
    select: "border-slate-200 bg-white text-slate-900",
    divider: "border-t border-slate-200",
    activeOption: "border-emerald-500 bg-emerald-50",
    inactiveOption: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
    link: "text-emerald-700 hover:text-emerald-900",
  },
} as const;

const PREFERENCE_COPY = {
  fr: {
    switchTo: "Passer en anglais",
    shortLocale: "FR",
    chooseLocale: "Choisir la langue",
    locale: "Langue",
    displayMode: "Mode d'affichage",
    learnMore: "En savoir plus sur les modes d'affichage",
  },
  en: {
    switchTo: "Pass to French",
    shortLocale: "EN",
    chooseLocale: "Choose language",
    locale: "Language",
    displayMode: "Display mode",
    learnMore: "Learn more about display modes",
  },
} as const;

export function SitePreferencesControls({
  variant = "full",
  surface = "dark",
}: SitePreferencesControlsProps) {
  const { locale, setLocale, displayMode, setDisplayMode } =
    useSitePreferences();
  const copy = PREFERENCE_COPY[locale];

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
        aria-label={copy.switchTo}
      >
        <Languages size={14} className="cmm-text-secondary" />
        <span>{copy.shortLocale}</span>
      </button>
    );
  }

  const isCompact = variant === "compact";
  const styles = SURFACE_STYLES[surface];

  return (
    <div className={cn(styles.copy, isCompact ? "space-y-3" : "space-y-5")}>
      <div className={isCompact ? "space-y-1.5" : "space-y-2"}>
        <label
          htmlFor="locale-switch"
          className={cn("block font-semibold", isCompact ? "text-sm" : "text-base")}
        >
          {copy.locale}
        </label>
        <div className="relative">
          <Languages
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-300",
              isCompact ? "left-2.5 h-3.5 w-3.5" : "left-3 h-4 w-4",
            )}
            aria-hidden="true"
          />
          <CmmSelect
            id="locale-switch"
            value={locale}
            onChange={(event) => setLocale(event.target.value === "en" ? "en" : "fr")}
            className={cn(
              "cmm-select-control w-full cursor-pointer rounded-xl text-sm font-semibold",
              styles.select,
              isCompact ? "min-h-10 py-2 pl-9 pr-9" : "min-h-12 py-2.5 pl-10 pr-10",
            )}
            aria-label={copy.chooseLocale}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </CmmSelect>
          <ChevronDown
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-300",
              isCompact ? "right-2.5 h-3.5 w-3.5" : "h-4 w-4",
              !isCompact && "right-3",
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      <fieldset className={cn(styles.divider, isCompact ? "space-y-2 pt-3" : "space-y-3 pt-4")}>
        <legend className={cn("font-semibold", styles.copy, isCompact ? "text-sm" : "text-base")}>
          {copy.displayMode}
        </legend>
        <div className={isCompact ? "space-y-1.5" : "space-y-2"}>
          {ENABLED_DISPLAY_MODES.map((mode) => {
            const isActive = displayMode === mode;
            const description = DISPLAY_MODE_DESCRIPTIONS[mode][locale];

            return (
              <label
                key={mode}
                className={cn(
                  "flex cursor-pointer items-start rounded-xl border transition-colors",
                  isCompact ? "gap-2 px-2.5 py-2" : "gap-3 px-3.5 py-3",
                  isActive ? styles.activeOption : styles.inactiveOption,
                )}
              >
                <input
                  type="radio"
                  name="display-mode"
                  value={mode}
                  checked={isActive}
                  onChange={() => setDisplayMode(mode)}
                  className={cn("h-4 w-4 shrink-0 accent-emerald-400", isCompact ? "mt-0.5" : "mt-1")}
                />
                <span className="min-w-0">
                  <span className={cn("block text-sm font-bold", styles.copy)}>
                    {displayModeLabels[mode][locale]}
                  </span>
                  <span className={cn("mt-0.5 block text-xs", styles.secondaryCopy, isCompact ? "leading-snug" : "leading-relaxed")}>
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
        className={cn(
          "inline-flex items-center text-xs font-semibold underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
          styles.link,
          isCompact ? "gap-1.5" : "gap-2",
        )}
      >
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {copy.learnMore}
        </span>
      </Link>
    </div>
  );
}
