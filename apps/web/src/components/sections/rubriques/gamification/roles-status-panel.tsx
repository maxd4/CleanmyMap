"use client";

import { memo } from "react";
import { BadgeCheck, Crown, Eye, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContributorRecognitionCard } from "@/lib/gamification/progression-types";

type RoleStatusKey =
  | "observateur"
  | "contributeur"
  | "referent"
  | "mentor"
  | "coordinateur";

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
  locale: string;
};

function getCurrentRoleStatusKey(
  currentContributor: ContributorRecognitionCard | null | undefined,
): RoleStatusKey {
  if (!currentContributor || currentContributor.verifiedContributions <= 0) {
    return "observateur";
  }

  const isCoordinator =
    currentContributor.contributionType === "coordination" &&
    currentContributor.verifiedContributions >= 12 &&
    currentContributor.activeMonths >= 6;

  if (isCoordinator) {
    return "coordinateur";
  }

  if (currentContributor.mentorEligible) {
    return "mentor";
  }

  if (
    currentContributor.verifiedContributions >= 3 &&
    currentContributor.activeMonths >= 2
  ) {
    return "referent";
  }

  return "contributeur";
}

export function buildRoleStatusCards(
  currentContributor: ContributorRecognitionCard | null | undefined,
): RoleStatusCard[] {
  const currentKey = getCurrentRoleStatusKey(currentContributor);
  const hasContribution = Boolean(
    currentContributor && currentContributor.verifiedContributions > 0,
  );
  const contributorGate = hasContribution;
  const referentGate =
    Boolean(currentContributor) &&
    currentContributor.verifiedContributions >= 3 &&
    currentContributor.activeMonths >= 2;
  const mentorGate = Boolean(currentContributor?.mentorEligible);
  const coordinatorGate =
    Boolean(currentContributor) &&
    currentContributor.contributionType === "coordination" &&
    currentContributor.verifiedContributions >= 12 &&
    currentContributor.activeMonths >= 6;

  return [
    {
      key: "observateur",
      labelFr: "Observateur",
      labelEn: "Observer",
      descriptionFr: "Découvre le terrain et suit la progression.",
      descriptionEn: "Learns the terrain and follows progress.",
      unlocked: true,
    },
    {
      key: "contributeur",
      labelFr: "Contributeur",
      labelEn: "Contributor",
      descriptionFr: "Une contribution validée est déjà reconnue.",
      descriptionEn: "A validated contribution is already recognized.",
      unlocked: contributorGate || currentKey === "contributeur" || currentKey === "referent" || currentKey === "mentor" || currentKey === "coordinateur",
    },
    {
      key: "referent",
      labelFr: "Référent",
      labelEn: "Referent",
      descriptionFr: "La régularité et la fiabilité deviennent visibles.",
      descriptionEn: "Regularity and reliability become visible.",
      unlocked: referentGate || currentKey === "referent" || currentKey === "mentor" || currentKey === "coordinateur",
    },
    {
      key: "mentor",
      labelFr: "Mentor",
      labelEn: "Mentor",
      descriptionFr: "Transmet les bonnes pratiques au réseau.",
      descriptionEn: "Shares good practices with the network.",
      unlocked: mentorGate || currentKey === "mentor" || currentKey === "coordinateur",
    },
    {
      key: "coordinateur",
      labelFr: "Coordinateur",
      labelEn: "Coordinator",
      descriptionFr: "Organise des actions et fédère plusieurs acteurs.",
      descriptionEn: "Organizes actions and brings several actors together.",
      unlocked: coordinatorGate || currentKey === "coordinateur",
    },
  ];
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
  locale,
}: RolesStatusPanelProps) {
  const fr = locale === "fr";
  const cards = buildRoleStatusCards(currentContributor);
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
