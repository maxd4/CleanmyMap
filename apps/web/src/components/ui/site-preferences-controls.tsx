"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { ENABLED_DISPLAY_MODES, type DisplayMode } from "@/lib/ui/preferences";
import { ChevronDown, CheckCircle2, Languages, LayoutPanelLeft } from "lucide-react";
import { CmmSelect } from "@/components/ui/cmm-field";

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
    <div className="space-y-4 text-white">
      <div className="flex items-center gap-2 border-b border-white/12 pb-3">
        <LayoutPanelLeft className="h-5 w-5 text-emerald-300" aria-hidden="true" />
        <h2 className="text-base font-bold tracking-tight">
          {locale === "fr" ? "Préférences d'interface" : "Interface preferences"}
        </h2>
      </div>

      <div className="space-y-2">
        <label htmlFor="locale-switch" className="block text-sm font-semibold text-white">
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
            className="cmm-select-control cursor-pointer rounded-xl bg-slate-900/80 py-2.5 pl-10 pr-10 text-sm font-semibold text-white"
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-white">
          {locale === "fr" ? "Mode d'affichage" : "Display mode"}
        </legend>
        <div className="space-y-2">
          {ENABLED_DISPLAY_MODES.map((mode) => {
            const isActive = displayMode === mode;
            const description =
              mode === "exhaustif"
                ? locale === "fr"
                  ? "Toutes les informations et détails."
                  : "All information and details."
                : mode === "sobre"
                  ? locale === "fr"
                    ? "Information essentielle uniquement."
                    : "Essential information only."
                  : locale === "fr"
                    ? "Aperçus très simplifiés."
                    : "Highly simplified overviews.";

            return (
              <label
                key={mode}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
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

      <p className="text-xs leading-relaxed text-slate-300">
        {locale === "fr"
          ? "Vous pourrez modifier ce choix à tout moment dans Réglages."
          : "You can change this choice at any time in Settings."}
      </p>

    </div>
  );
}
