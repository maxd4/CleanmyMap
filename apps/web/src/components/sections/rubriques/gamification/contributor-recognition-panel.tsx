"use client";

import { memo } from "react";
import { BadgeCheck, MapPin, Sparkles, Users } from "lucide-react";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { getGamificationBadgeIconName } from "@/components/gamification/badge-icon";
import { cn } from "@/lib/utils";
import type { ContributorRecognitionSummary } from "@/lib/gamification/progression-types";

type ContributorRecognitionPanelProps = {
  recognition: ContributorRecognitionSummary | undefined;
  locale: string;
  loading: boolean;
};

export const ContributorRecognitionPanel = memo(function ContributorRecognitionPanel({
  recognition,
  locale,
  loading,
}: ContributorRecognitionPanelProps) {
  const fr = locale === "fr";
  const cards = recognition?.topContributors.slice(0, 3) ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <BadgeCheck className="text-red-400" size={18} />
        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
          {fr ? "Contributeurs utiles" : "Useful contributors"}
        </h3>
      </div>

      {loading ? (
        <div className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-40 rounded-full bg-white/5" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 rounded-[2rem] border border-white/5 bg-white/[0.03]"
                />
              ))}
            </div>
          </div>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 text-sm text-slate-400">
          {fr
            ? "Aucun profil vérifié n'est encore disponible pour cette vue."
            : "No verified contributor profile is available yet for this view."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card, index) => (
            <article
              key={card.userId}
              className={cn(
                "rounded-[2.5rem] border bg-slate-950/40 backdrop-blur-3xl p-6 shadow-2xl",
                index === 0 ? "border-red-500/20" : "border-white/5",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                    #{index + 1}
                  </p>
                  <h4 className="text-xl font-black text-white tracking-tight">
                    {card.actorName}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                    {card.associationName}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Score
                  </p>
                  <p className="text-lg font-black text-white tracking-tighter">
                    {card.score.toFixed(0)}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
                {card.highlight}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {card.badges.map((badge) => (
                  <IdentityBadge
                    key={badge}
                    icon={getGamificationBadgeIconName(badge)}
                    label={badge}
                    tone="gamification"
                  />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin size={12} className="text-red-400" />
                    {fr ? "Zone" : "Zone"}
                  </div>
                  <p className="mt-2 text-xs font-bold text-white normal-case tracking-normal">
                    {card.topZone}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users size={12} className="text-red-400" />
                    {fr ? "Type d'aide" : "Help type"}
                  </div>
                  <p className="mt-2 text-xs font-bold text-white normal-case tracking-normal">
                    {card.contributionType === "terrain"
                      ? fr
                        ? "Terrain"
                        : "Field"
                      : card.contributionType === "diffusion"
                        ? fr
                          ? "Relais"
                          : "Relay"
                        : card.contributionType === "coordination"
                          ? fr
                            ? "Coordination"
                            : "Coordination"
                          : fr
                            ? "Mentorat"
                            : "Mentoring"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Sparkles size={12} className="text-amber-400" />
                    {fr ? "Régularité" : "Regularity"}
                  </div>
                  <p className="mt-2 text-xs font-bold text-white normal-case tracking-normal">
                    {card.regularityLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <BadgeCheck size={12} className="text-red-400" />
                    {fr ? "Vérifiées" : "Verified"}
                  </div>
                  <p className="mt-2 text-xs font-bold text-white normal-case tracking-normal">
                    {card.verifiedContributions}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs font-medium leading-relaxed text-red-100/80">
                {card.thanksMessage}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
});
