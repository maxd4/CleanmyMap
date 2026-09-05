"use client";

import { BadgeCheck, Eye, Flag, Settings2, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./gamification-shell";
import { buildRoleStatusCards } from "./roles-status-panel";
import type { MeResponse } from "./gamification-types";

type RoleCard = ReturnType<typeof buildRoleStatusCards>[number];

function getCurrentRoleCard(cards: RoleCard[]): RoleCard {
  for (let index = cards.length - 1; index >= 0; index -= 1) {
    if (cards[index]?.unlocked) {
      return cards[index];
    }
  }
  return cards[0];
}

function getNextRoleCard(cards: RoleCard[]): RoleCard | null {
  return cards.find((card) => !card.unlocked) ?? null;
}

export function EngagementPanel({
  progression,
  loading,
  error,
  locale,
}: {
  progression: MeResponse["progression"] | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
}) {
  const fr = locale === "fr";

  if (loading) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <div className="animate-pulse space-y-5">
          <div className="h-4 w-48 rounded-full bg-[#f5e7e2]" />
          <div className="h-8 w-72 rounded-full bg-[#f5e7e2]" />
          <div className="rounded-[1.75rem] border border-[#f3e5e0] bg-[#fff8f6] p-5">
            <div className="h-7 w-40 rounded-full bg-[#f5e7e2]" />
            <div className="mt-4 h-16 rounded-2xl bg-[#f5e7e2]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-36 rounded-[1.5rem] bg-[#f6ece8]" />
            <div className="h-36 rounded-[1.5rem] bg-[#f6ece8]" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !progression) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0ee] text-[#cf3830]">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#c51f1f]">
              {fr ? "Parcours d'engagement" : "Engagement journey"}
            </p>
            <p className="text-sm font-semibold text-[#2c1a17]">
              {fr
                ? "Le moteur de progression n'est pas disponible pour le moment."
                : "The progression engine is not available right now."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const roleCards = buildRoleStatusCards(progression.recognition.currentContributor);
  const currentRole = getCurrentRoleCard(roleCards);
  const nextRole = getNextRoleCard(roleCards);
  const currentDescription =
    currentRole.key === "observateur" &&
    (!progression.recognition.currentContributor || progression.recognition.currentContributor.verifiedContributions <= 0)
      ? fr
        ? "Découvrez le terrain et suivez la progression."
        : "Discover the terrain and follow the progression."
      : fr
        ? currentRole.descriptionFr
        : currentRole.descriptionEn;
  const contributionNote =
    progression.recognition.currentContributor?.verifiedContributions &&
    progression.recognition.currentContributor.verifiedContributions > 0
      ? fr
        ? `${progression.recognition.currentContributor.verifiedContributions} actions vérifiées`
        : `${progression.recognition.currentContributor.verifiedContributions} verified actions`
      : fr
        ? "Aucune contribution validée pour le moment."
        : "No validated contribution yet.";
  const progressNote = progression.nextLevel.requirements.missing[0]
    ? progression.nextLevel.requirements.missing[0]
    : fr
      ? "Les règles exactes de progression seront bientôt disponibles."
      : "The exact progression rules will be available soon.";

  const StatusIcon =
    currentRole.key === "observateur"
      ? Eye
      : currentRole.key === "contributeur"
        ? BadgeCheck
        : currentRole.key === "referent"
          ? Users
          : currentRole.key === "mentor"
            ? Sparkles
            : ShieldCheck;

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={TrendingUp}
        title={fr ? "Parcours d'engagement" : "Engagement journey"}
        subtitle={fr ? "Votre progression se débloque au fil de vos contributions validées." : "Your progress unlocks as your validated contributions accumulate."}
      />

      <div className="mt-6 rounded-[1.75rem] border border-[#f1d9d3] bg-[#fff7f5] p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#c51f1f] text-white shadow-[0_16px_40px_rgba(197,31,31,0.22)]">
            <StatusIcon size={24} strokeWidth={2.1} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#cf3a33]">
              {fr ? "Statut actuel" : "Current status"}
            </p>
            <p className="mt-2 text-[clamp(1.5rem,2vw,1.9rem)] font-black tracking-[-0.04em] text-[#281413]">
              {fr ? currentRole.labelFr : currentRole.labelEn}
            </p>
            <p className="mt-2 max-w-xl text-[14px] leading-7 text-[#6e5550]">
              {currentDescription}
            </p>
            <p className="mt-2 text-[12px] font-medium text-[#8c716b]">
              {contributionNote}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#b53a33]">
          {fr ? "Prochains statuts" : "Next statuses"}
        </p>
        <div className="mt-5 grid gap-5 xl:grid-cols-4">
          {roleCards.slice(1).map((card, index) => (
            <article
              key={card.key}
              className="relative"
            >
              <div className="flex items-center gap-3 pb-4">
                <div className="h-px flex-1 border-t border-dashed border-[#eed8d2]" />
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-black ring-8",
                  card.unlocked ? "bg-[#c51f1f] text-white ring-[#fff8f6]" : "border border-[#efcfc8] bg-white text-[#b34a41] ring-[#fff8f6]",
                )}>
                  {index + 1}
                </div>
                <div className="h-px flex-1 border-t border-dashed border-[#eed8d2]" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-[12px] font-black text-[#241614]">
                  {fr ? card.labelFr : card.labelEn}
                </p>
                <p className="text-[12px] leading-6 text-[#7a625d]">
                  {fr ? card.descriptionFr : card.descriptionEn}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.55rem] border border-[#efc7c1] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[#efc6bf] bg-[#fff7f4] text-[#bf342e]">
              <Flag size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#c63b35]">
                {fr ? "Prochain statut" : "Next status"}
              </p>
              <p className="mt-2 text-[14px] font-bold text-[#281614]">
                {nextRole
                  ? fr
                    ? nextRole.labelFr
                    : nextRole.labelEn
                  : fr
                    ? "Parcours complet"
                    : "Completed path"}
              </p>
              <p className="mt-1 text-[13px] leading-6 text-[#7d625d]">
                {fr ? "Réalisez et validez votre première contribution." : "Make and validate your first contribution."}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.55rem] border border-[#efdcd7] bg-[#fffaf9] p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[#edd6d0] bg-white text-[#c63b35]">
              <Settings2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#c63b35]">
                {fr ? "Moteur de progression" : "Progression engine"}
              </p>
              <p className="mt-2 text-[14px] font-bold text-[#281614]">
                {fr ? "En cours d'activation" : "Being activated"}
              </p>
              <p className="mt-1 text-[13px] leading-6 text-[#7d625d]">
                {progressNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
