"use client";

import { memo } from "react";
import { LayoutPanelLeft, Languages, Moon, Sparkles } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";

type PersonalizationSnapshot = {
  localeLabel: string;
  themeLabel: string;
  displayModeLabel: string;
  displayModeHint: string;
};

export function buildPersonalizationSnapshot(
  locale: string,
  theme: string,
  displayMode: string,
): PersonalizationSnapshot {
  const fr = locale === "fr";
  const normalizedTheme = theme === "dark" ? "dark" : "mixed";
  const normalizedDisplayMode =
    displayMode === "minimaliste"
      ? "minimaliste"
      : displayMode === "sobre"
        ? "sobre"
        : "exhaustif";

  return {
    localeLabel: fr ? "Français" : "English",
    themeLabel:
      normalizedTheme === "dark" ? (fr ? "Sombre" : "Dark") : fr ? "Mixte" : "Mixed",
    displayModeLabel:
      normalizedDisplayMode === "exhaustif"
        ? fr
          ? "Exhaustif"
          : "Exhaustive"
        : normalizedDisplayMode === "minimaliste"
          ? fr
            ? "Minimaliste"
            : "Minimal"
          : fr
            ? "Sobre"
            : "Calm",
    displayModeHint:
      normalizedDisplayMode === "exhaustif"
        ? fr
          ? "Charte premium complète active"
          : "Full premium experience active"
        : fr
          ? "Modes légers à venir"
          : "Light modes coming soon",
  };
}

export const PersonalizationPanel = memo(function PersonalizationPanel() {
  const { locale, theme, displayMode, setLocale, toggleTheme } = useSitePreferences();
  const fr = locale === "fr";
  const snapshot = buildPersonalizationSnapshot(locale, theme, displayMode);

  return (
    <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -bottom-24 -right-20 h-44 w-44 rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
            {fr ? "Personnalisation" : "Personalization"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {fr
              ? "Réglages d'interface déjà actifs sur le compte: langue, thème et mode d'affichage."
              : "Interface settings already active on the account: language, theme and display mode."}
          </p>
        </div>
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
          {fr ? "Perso" : "Custom"}
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 lg:grid-cols-[1fr_1.05fr]">
        <div className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.03] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
            <Sparkles size={12} />
            {fr ? "État actuel" : "Current state"}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <Languages size={14} className="text-red-300" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Langue" : "Language"}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{snapshot.localeLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <Moon size={14} className="text-red-300" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Thème" : "Theme"}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{snapshot.themeLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <LayoutPanelLeft size={14} className="text-red-300" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Mode d'affichage" : "Display mode"}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{snapshot.displayModeLabel}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  {snapshot.displayModeHint}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-slate-950/50 p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            {fr ? "Contrôles rapides" : "Quick controls"}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
            {fr
              ? "Change la langue ou le thème sans quitter la page. Le mode d'affichage reste affiché comme référence visuelle."
              : "Switch language or theme without leaving the page. Display mode stays visible as a reference."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <CmmButton
              type="button"
              onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
              tone="primary"
              variant="pill"
              className="min-h-11 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]"
            >
              <Languages size={14} />
              {fr ? "Passer en EN" : "Switch to FR"}
            </CmmButton>
            <CmmButton
              type="button"
              onClick={toggleTheme}
              tone="tertiary"
              variant="pill"
              className="min-h-11 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]"
            >
              <Moon size={14} />
              {fr
                ? theme === "dark"
                  ? "Basculer en mixte"
                  : "Basculer en sombre"
                : theme === "dark"
                  ? "Switch to mixed"
                  : "Switch to dark"}
            </CmmButton>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-red-500/10 bg-red-500/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-400">
            {fr
              ? "Cette personnalisation influence le confort de lecture, la perception des couleurs et la densité visuelle du site."
              : "This personalization affects reading comfort, color perception and the visual density of the site."}
          </div>
        </div>
      </div>
    </section>
  );
});
