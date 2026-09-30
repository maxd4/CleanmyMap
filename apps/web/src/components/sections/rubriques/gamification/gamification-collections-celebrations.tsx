"use client";

import { useCallback, useMemo } from "react";
import { BadgeCheck, PartyPopper, Play } from "lucide-react";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { buildLightCelebrationPreview } from "./light-celebrations-panel";
import { GamificationPanelLoading, SectionLabel } from "./gamification-shell";

export function acquiredGamificationSummary(summary: GamificationSummary | undefined) {
  const tiers = (summary?.progressions ?? []).reduce(
    (count, progression) => count + (progression.previousTiers?.length ?? 0) + (progression.currentTier?.achieved ? 1 : 0),
    0,
  );
  const milestones = (summary?.milestones ?? []).filter((item) => item.state === "completed").length;
  return { tiers, milestones, xp: summary?.xpTotal ?? 0 };
}

export function CollectionsPanel(props: {
  summary: GamificationSummary | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
}) {
  const { summary, loading, error, locale } = props;
  const fr = locale === "fr";
  if (loading) {
    return <GamificationPanelLoading ariaLabel={fr ? "Chargement des collections" : "Loading collections"} headingWidth="w-64" cardHeight="h-28" />;
  }

  if (error || !summary) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <SectionLabel icon={BadgeCheck} title={fr ? "Résumé des acquis" : "Acquired summary"} subtitle={fr ? "Les compteurs restent synchronisés avec l’inventaire CURRENT." : "Counters stay synchronized with the CURRENT inventory."} />
        <p role="alert" className="mt-6 rounded-[1.35rem] border border-[#f1c1b7] bg-[#fff5f2] p-5 text-sm leading-6 text-[#8c3f38]">
          {fr ? "Le résumé des acquis n’est pas disponible pour le moment." : "The acquired summary is not available right now."}
        </p>
      </section>
    );
  }

  const acquired = acquiredGamificationSummary(summary);
  return (
    <section aria-label={fr ? "Résumé des acquis" : "Acquired summary"} className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={BadgeCheck}
        title={fr ? "Résumé des acquis" : "Acquired summary"}
        subtitle={fr ? "Un aperçu compact ; le détail exhaustif est présenté dans Progressions & paliers et Jalons." : "A compact overview; the full detail is shown in Progressions & tiers and Milestones."}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] border border-[#f1dfd8] bg-[#fffaf8] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Paliers obtenus" : "Tiers reached"}</p>
          <p className="mt-2 text-2xl font-black text-[#c51f1f]">{acquired.tiers}</p>
        </div>
        <div className="rounded-[1.35rem] border border-[#f1dfd8] bg-[#fffaf8] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Jalons terminés" : "Milestones completed"}</p>
          <p className="mt-2 text-2xl font-black text-[#c51f1f]">{acquired.milestones}</p>
        </div>
        <div className="rounded-[1.35rem] border border-[#f1dfd8] bg-[#fffaf8] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">XP</p>
          <p className="mt-2 text-2xl font-black text-[#c51f1f]">{acquired.xp}</p>
        </div>
      </div>
    </section>
  );
}

export function CelebrationsPanel({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const preview = useMemo(() => buildLightCelebrationPreview(locale), [locale]);

  const handlePreview = useCallback(() => {
    announceGamificationGain(preview);
  }, [preview]);

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={PartyPopper}
          title={fr ? "Célébrations légères" : "Light celebrations"}
          subtitle={fr ? "Un retour visuel discret apparaît quand un palier est atteint." : "A discreet visual cue appears when a milestone is reached."}
        />
        <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-[#fff1ef] px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#bb362f]">
          {fr ? "Aperçu" : "Preview"}
        </span>
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] border border-[#f1dfd8] bg-white">
            <div className="relative flex h-28 w-44 items-center justify-center">
              <div className="absolute left-2 top-3 h-20 w-20 rounded-[1.15rem] border border-[#f1c1b7] bg-[#ffd9d4] shadow-[0_14px_30px_rgba(197,31,31,0.12)]" />
              <div className="absolute right-2 top-0 h-10 w-10 rounded-[0.95rem] bg-[#cf3b34] shadow-[0_10px_26px_rgba(197,31,31,0.22)]" />
              <div className="absolute bottom-1 left-12 h-12 w-12 rounded-[0.95rem] border border-[#f1c1b7] bg-[#fff0ed]" />
              <div className="absolute z-10 h-12 w-12 rounded-[1rem] bg-white text-[#c51f1f] shadow-[0_12px_30px_rgba(197,31,31,0.12)]" />
            </div>
          </div>
          <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] border border-[#f1dfd8] bg-white">
            <div className="relative flex h-28 w-44 items-center justify-center">
              <div className="absolute left-8 top-7 h-11 w-11 rounded-[0.95rem] bg-[#ff8f86] shadow-[0_12px_26px_rgba(197,31,31,0.18)]" />
              <div className="absolute right-7 top-10 h-14 w-14 rounded-[1.15rem] border border-[#f1c1b7] bg-[#fff0ed]" />
              <div className="absolute bottom-2 left-6 h-12 w-24 rounded-[1rem] bg-[#ffd9d4]" />
              <div className="absolute z-10 h-10 w-10 rounded-[0.9rem] bg-[#cf3b34] shadow-[0_12px_30px_rgba(197,31,31,0.18)]" />
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] leading-7 text-[#7b615c]">
          {fr
            ? "Toast discret, confetti léger et son bref quand un palier tombe."
            : "Discreet toast, light confetti and a short sound when a milestone lands."}
        </p>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-[1.1rem] border border-[#cf3b34] bg-white px-8 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#bb362f] shadow-[0_10px_24px_rgba(197,31,31,0.08)] transition hover:-translate-y-0.5 hover:bg-[#fff7f5]"
          >
            <Play size={14} fill="currentColor" />
            {fr ? "Tester l'aperçu" : "Test preview"}
          </button>
        </div>
      </div>
    </section>
  );
}
