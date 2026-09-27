"use client";

import { memo } from "react";
import { BadgeCheck, Crown, Eye, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContributorRecognitionCard } from "@/lib/gamification/progression-types";
import {
  ENGAGEMENT_STATUS_DEFINITIONS,
  type EngagementStatusId,
} from "@/lib/gamification/engagement-status";

type RoleStatusKey = EngagementStatusId;

type RoleStatusCard = {
  key: RoleStatusKey;
  labelFr: string;
  labelEn: string;
  descriptionFr: string;
  descriptionEn: string;
  unlocked: boolean;
};

type RolesStatusPanelProps = {
  currentContributor: ContributorRecognitionCard | null | undefined;
  currentStatusId?: EngagementStatusId;
  locale: string;
};

export function buildRoleStatusCards(
  _currentContributor: ContributorRecognitionCard | null | undefined,
  currentStatusId: EngagementStatusId = "observateur",
): RoleStatusCard[] {
  const currentIndex = Math.max(
    0,
    ENGAGEMENT_STATUS_DEFINITIONS.findIndex((status) => status.id === currentStatusId),
  );
  const labelsEn: Record<EngagementStatusId, string> = {
    observateur: "Observer",
    contributeur: "Contributor",
    referent: "Referent",
    mentor: "Mentor",
    coordinateur: "Coordinator",
  };
  const descriptions: Record<EngagementStatusId, [string, string]> = {
    observateur: ["Découvre le terrain et suit la progression.", "Learns the terrain and follows progress."],
    contributeur: ["Une contribution validée est déjà reconnue.", "A validated contribution is already recognized."],
    referent: ["La régularité et la fiabilité deviennent visibles.", "Regularity and reliability become visible."],
    mentor: ["Transmet les bonnes pratiques au réseau.", "Shares good practices with the network."],
    coordinateur: ["Organise des actions et fédère plusieurs acteurs.", "Organizes actions and brings several actors together."],
  };

  return ENGAGEMENT_STATUS_DEFINITIONS.map((status, index) => ({
      key: status.id,
      labelFr: status.label,
      labelEn: labelsEn[status.id],
      descriptionFr: descriptions[status.id][0],
      descriptionEn: descriptions[status.id][1],
      unlocked: index <= currentIndex,
    }));
}

function getCurrentStatusCard(cards: RoleStatusCard[]): RoleStatusCard {
  const activeIndex = cards.findLastIndex((card) => card.unlocked);
  return cards[Math.max(0, activeIndex)];
}

function getNextStatusCard(cards: RoleStatusCard[]): RoleStatusCard | null {
  const nextIndex = cards.findIndex((card) => !card.unlocked);
  return nextIndex >= 0 ? cards[nextIndex] : null;
}

export const RolesStatusPanel = memo(function RolesStatusPanel({
  currentContributor,
  currentStatusId,
  locale,
}: RolesStatusPanelProps) {
  const fr = locale === "fr";
  const cards = buildRoleStatusCards(currentContributor, currentStatusId);
  const currentStatus = getCurrentStatusCard(cards);
  const nextStatus = getNextStatusCard(cards);

  const currentContributorSummary = currentContributor
    ? `${currentContributor.verifiedContributions} ${fr ? "actions vérifiées" : "verified actions"}`
    : fr
      ? "Aucune contribution validée"
      : "No validated contribution yet";

  return (
    <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
            {fr ? "Rôles et statuts" : "Roles and status"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {fr
              ? "Une lecture simple du parcours d'engagement, sans logique de compétition."
              : "A simple reading of engagement progress, without competition."}
          </p>
        </div>
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
          {fr ? currentStatus.labelFr : currentStatus.labelEn}
        </div>
      </div>

      <div className="relative z-10 mt-6 rounded-[2rem] border border-white/5 bg-slate-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-300">
              {currentStatus.key === "observateur" ? (
                <Eye size={18} />
              ) : currentStatus.key === "contributeur" ? (
                <BadgeCheck size={18} />
              ) : currentStatus.key === "referent" ? (
                <Users size={18} />
              ) : currentStatus.key === "mentor" ? (
                <GraduationCap size={18} />
              ) : (
                <Crown size={18} />
              )}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                {fr ? "Statut actuel" : "Current status"}
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {fr ? currentStatus.labelFr : currentStatus.labelEn}
              </p>
            </div>
          </div>
          <div className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
            {currentContributorSummary}
          </div>
        </div>

        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
          {fr ? currentStatus.descriptionFr : currentStatus.descriptionEn}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {cards.map((card) => (
            <span
              key={card.key}
              className={cn(
                "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em]",
                card.unlocked
                  ? "border-red-500/20 bg-red-500/10 text-red-200"
                  : "border-white/10 bg-white/[0.03] text-slate-500",
              )}
            >
              {fr ? card.labelFr : card.labelEn}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.key}
              className={cn(
                "rounded-[1.5rem] border p-4 transition-colors",
                card.unlocked
                  ? "border-red-500/20 bg-red-500/[0.04]"
                  : "border-white/5 bg-white/[0.02]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {fr ? "Statut" : "Status"}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em]",
                    card.unlocked
                      ? "bg-red-500/10 text-red-300"
                      : "bg-white/[0.03] text-slate-500",
                  )}
                >
                  {card.unlocked ? (fr ? "Débloqué" : "Unlocked") : (fr ? "À venir" : "Locked")}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-white">
                {fr ? card.labelFr : card.labelEn}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {fr ? card.descriptionFr : card.descriptionEn}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold text-slate-500">
          <span>
            {fr ? "Parcours visible et sans ambiguïté" : "Visible and unambiguous progression"}
          </span>
          {nextStatus ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
              <ShieldCheck size={12} />
              {fr
                ? `Prochain statut : ${nextStatus.labelFr}`
                : `Next status: ${nextStatus.labelEn}`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
              <ShieldCheck size={12} />
              {fr ? "Niveau de statut maximal atteint" : "Maximum status reached"}
            </span>
          )}
        </div>
      </div>
    </section>
  );
});
