"use client";

import { ChevronRight, Eye, Globe, Moon, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildPersonalizationSnapshot } from "./personalization-panel";
import { SectionLabel } from "./gamification-shell";
import type { DisplayMode } from "@/lib/ui/preferences";

export function ProfileSettingsCard({
  locale,
  displayMode,
  personalization,
  setDisplayMode,
  toggleTheme,
}: {
  locale: string;
  displayMode: string;
  personalization: ReturnType<typeof buildPersonalizationSnapshot>;
  setDisplayMode: (value: DisplayMode) => void;
  toggleTheme: () => void;
}) {
  const fr = locale === "fr";
  const rows = [
    {
      icon: Globe,
      label: fr ? "Langue" : "Language",
      value: personalization.localeLabel,
    },
    {
      icon: Moon,
      label: fr ? "Thème" : "Theme",
      value: personalization.themeLabel,
    },
    {
      icon: Settings2,
      label: fr ? "Mode d'affichage" : "Display mode",
      value: personalization.displayModeLabel,
      hint: personalization.displayModeHint,
    },
  ];

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={Settings2}
        title={fr ? "Réglages du profil" : "Profile settings"}
        subtitle={fr ? "Personnalisez votre expérience CleanMyMap." : "Personalize your CleanMyMap experience."}
      />

      <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-[#f1dfd8] bg-white">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex items-start justify-between gap-4 px-4 py-4",
              index < rows.length - 1 ? "border-b border-[#f4e5e0]" : "",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0ee] text-[#c63b35]">
                <row.icon size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a65a52]">
                  {row.label}
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#241411]">
                  {row.value}
                </p>
                {row.hint ? (
                  <p className="mt-1 text-[12px] leading-6 text-[#8a716b]">
                    {row.hint}
                  </p>
                ) : null}
              </div>
            </div>
            <ChevronRight size={16} className="mt-2 shrink-0 text-[#c8a9a1]" />
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDisplayMode(displayMode === "sobre" ? "exhaustif" : "sobre")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-[1.2rem] border px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] transition",
            displayMode === "exhaustif"
              ? "border-[#cf3b34] bg-[#fff7f5] text-[#bb362f]"
              : "border-[#ead8d2] bg-white text-[#7a625d] hover:border-[#cf3b34] hover:text-[#bb362f]",
          )}
        >
          <Eye size={14} />
          {displayMode === "sobre"
            ? fr
              ? "Revenir en mode exhaustif"
              : "Return to exhaustive mode"
            : fr
              ? "Passer en mode sobre"
              : "Switch to calm mode"}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-[#ead8d2] bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7a625d] transition hover:border-[#cf3b34] hover:text-[#bb362f]"
        >
          <Moon size={14} />
          {fr ? "Basculer en mode sombre" : "Switch to dark mode"}
        </button>
      </div>

      <div className="mt-4 rounded-[1.45rem] border border-[#f0d9d2] bg-[#fff8f6] px-4 py-3 text-[12px] leading-6 text-[#8a716b]">
        {fr
          ? displayMode === "sobre"
            ? "Mode sobre actif avec la police système canonique"
            : "Charte premium complète active"
          : displayMode === "sobre"
            ? "Calm mode active with the canonical system font"
            : "Active, fully premium card"}
      </div>
    </section>
  );
}
