"use client";

import { useCallback, useMemo } from "react";
import { BadgeCheck, PartyPopper, Play } from "lucide-react";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import { buildLightCelebrationPreview } from "./light-celebrations-panel";
import { EmptyStateCard, SectionLabel } from "./gamification-shell";

export function CollectionsPanel({
  loading,
  error,
  locale,
}: {
  loading: boolean;
  error: unknown;
  locale: string;
}) {
  const fr = locale === "fr";

  if (loading) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-44 rounded-full bg-[#f5e7e2]" />
          <div className="h-6 w-64 rounded-full bg-[#f5e7e2]" />
          <div className="h-56 rounded-[1.75rem] bg-[#fff8f6]" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <SectionLabel
          icon={BadgeCheck}
          title={fr ? "Badges et collections" : "Badges and collections"}
          subtitle={fr ? "Des distinctions lisibles et sobres, sans surcharge visuelle." : "Readable, restrained distinctions without visual overload."}
        />
        <div className="mt-6 rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
          <EmptyStateCard
            title={
              fr
                ? "La vitrine de collections n'est pas encore disponible"
                : "The collection showcase is not available yet"
            }
            description={
              fr
                ? "Les badges et collections apparaîtront dès que le contenu sera activé."
                : "Badges and collections will appear once the content is activated."
            }
            icon={BadgeCheck}
            ctaLabel={fr ? "Aperçu" : "Preview"}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={BadgeCheck}
        title={fr ? "Badges et collections" : "Badges and collections"}
        subtitle={fr ? "Des distinctions lisibles et sobres, sans surcharge visuelle." : "Readable, restrained distinctions without visual overload."}
      />

      <div className="mt-6 flex min-h-[22rem] items-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
        <EmptyStateCard
          title={
            fr
              ? "La vitrine de collections n'est pas encore disponible"
              : "The collection showcase is not available yet"
          }
          description={
            fr
              ? "Les badges et collections apparaîtront dès que le contenu sera activé."
              : "Badges and collections will appear once the content is activated."
          }
          icon={BadgeCheck}
          ctaLabel={fr ? "Aperçu" : "Preview"}
        />
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
