"use client";

import { useEffect } from "react";
import { Flag, Sparkles, Target, TrendingUp } from "lucide-react";
import { GamificationPanelLoading, SectionLabel } from "./gamification-shell";
import { focusGamificationTarget } from "./gamification-focus";
import type {
  GamificationSummary,
  GamificationSummaryMilestone,
  GamificationSummaryProgression,
} from "@/lib/gamification/gamification-summary";

type CatalogState = GamificationSummaryProgression["state"] | GamificationSummaryMilestone["state"];

function stateLabel(state: CatalogState, fr: boolean): string {
  if (state === "completed") return fr ? "✓ Terminé" : "✓ Completed";
  if (state === "in_progress") return fr ? "En cours" : "In progress";
  return fr ? "À découvrir" : "To discover";
}

function stateClass(state: CatalogState): string {
  if (state === "completed") return "border-[#b7d9c4] bg-[#effaf2] text-[#287348]";
  if (state === "in_progress") return "border-[#f1c18c] bg-[#fff7ed] text-[#9a5a16]";
  return "border-[#e4d7d2] bg-white text-[#806b65]";
}

function categoryLabel(
  category: GamificationSummaryProgression["awardCategory"] | GamificationSummaryMilestone["awardCategory"],
  fr: boolean,
): string {
  if (category === "BADGE_ONLY") return fr ? "Reconnaissance" : "Recognition";
  if (category === "XP_MILESTONE") return fr ? "Jalon avec XP" : "Milestone with XP";
  return fr ? "Progression XP" : "XP progression";
}

function NewBadge({ fr }: { fr: boolean }) {
  return (
    <span
      role="status"
      aria-label={fr ? "Nouvelle mécanique" : "New mechanic"}
      className="rounded-full border border-[#b7d9c4] bg-[#effaf2] px-2 py-0.5 text-xs font-black tracking-[0.08em] text-[#287348]"
    >
      {fr ? "Nouveau" : "New"}
    </span>
  );
}

function CatalogItemHeader({
  label,
  description,
  state,
  category,
  categoryClassName,
  isNewSinceLastRulesMigration,
  fr,
}: {
  label: string;
  description: string;
  state: CatalogState;
  category: GamificationSummaryProgression["awardCategory"] | GamificationSummaryMilestone["awardCategory"];
  categoryClassName: string;
  isNewSinceLastRulesMigration: boolean;
  fr: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-[#2c1a17]">{label}</h3>
          {isNewSinceLastRulesMigration ? <NewBadge fr={fr} /> : null}
          <span className={`rounded-full border px-2 py-0.5 text-xs font-black uppercase tracking-[0.16em] ${categoryClassName}`}>
            {categoryLabel(category, fr)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-[#806b65]">{description}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(state)}`}>
        {stateLabel(state, fr)}
      </span>
    </div>
  );
}

function ProgressionTierProgress({ item, fr }: { item: GamificationSummaryProgression; fr: boolean }) {
  const currentTier = item.currentTier;
  const nextTier = item.nextTier;
  const currentTierLabel = currentTier?.achieved
    ? currentTier.label
    : item.currentBadge?.label ?? (fr ? "Observateur" : "Observer");
  const nextTierLabel = nextTier?.label ?? item.nextBadge?.label ?? (fr ? "Palier suivant" : "Next tier");
  const nextThreshold = nextTier?.threshold;
  const progressLabel = `${item.progressPercent}%`;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Valeur actuelle" : "Current value"}</p>
          <p className="mt-1 text-xl font-black text-[#c51f1f]">{item.currentValue}</p>
          <p className="mt-1 max-w-32 text-xs leading-5 text-[#806b65]">{item.metricLabel}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs font-semibold text-[#765f59]">
            <span>{fr ? "Palier actuel : " : "Current tier: "}{currentTierLabel}{currentTier?.achieved ? " ✓" : ""}</span>
            <span>{fr ? "Prochain palier : " : "Next tier: "}{nextTierLabel}{nextThreshold !== undefined ? ` — ${nextThreshold}` : ""}</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[#f5e7e2]"
            role="progressbar"
            aria-label={fr ? `Progression vers ${nextTierLabel}` : `Progress toward ${nextTierLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.progressPercent}
          >
            <div className="h-full rounded-full bg-[#cf3b34]" style={{ width: progressLabel }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-[#a48d86]">{progressLabel}</p>
        </div>
    </div>
  );
}

function ProgressionRewardDetails({ item, fr }: { item: GamificationSummaryProgression; fr: boolean }) {
  const attainedTiers = [
    ...(item.previousTiers ?? []),
    ...(item.currentTier?.achieved ? [item.currentTier] : []),
  ];
  return (
    <div className="mt-4 grid gap-3 border-t border-[#f1dfd8] pt-3 text-xs text-[#806b65] sm:grid-cols-2">
        <div>
          <p className="font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Paliers atteints" : "Tiers reached"}</p>
          <p className="mt-1 leading-5">
            {attainedTiers.length > 0 ? attainedTiers.map((tier) => `${tier.label} ✓`).join(" · ") : (fr ? "Aucun palier obtenu" : "No tier reached yet")}
          </p>
        </div>
        <div>
          <p className="font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Récompense" : "Reward"}</p>
          <p className="mt-1 leading-5">
            {item.awardCategory === "XP_PROGRESSION" && item.grantsXp
              ? `${fr ? "XP générée par cette famille · cumulée : " : "XP generated by this family · total: "}${item.xpContribution}`
              : (fr ? "Reconnaissance, sans XP" : "Recognition, no XP")}
          </p>
        </div>
    </div>
  );
}

function ProgressionItem({ item, fr }: { item: GamificationSummaryProgression; fr: boolean }) {
  return (
    <article id={`progression-${item.id}`} tabIndex={-1} className="scroll-mt-8 rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4 shadow-[0_8px_24px_rgba(126,31,20,0.04)] transition-shadow">
      <CatalogItemHeader
        label={item.label}
        description={item.description}
        state={item.state}
        category="XP_PROGRESSION"
        categoryClassName="border-[#f1c1b7] bg-[#fff5f2] text-[#b4362e]"
        isNewSinceLastRulesMigration={item.isNewSinceLastRulesMigration}
        fr={fr}
      />
      <ProgressionTierProgress item={item} fr={fr} />
      <ProgressionRewardDetails item={item} fr={fr} />
    </article>
  );
}

function milestoneReward(item: GamificationSummaryMilestone, fr: boolean): string {
  if (item.awardCategory === "XP_MILESTONE" && item.grantsXp) {
    if (item.xpAmountOrPolicy.kind === "fixed_one_shot" && item.xpAmountOrPolicy.amount > 0) return `+${item.xpAmountOrPolicy.amount} XP`;
    return fr ? "Récompense XP" : "XP reward";
  }
  return fr ? "Reconnaissance · sans XP" : "Recognition · no XP";
}

function MilestoneItem({ item, fr }: { item: GamificationSummaryMilestone; fr: boolean }) {
  const hasRealProgress = item.state === "in_progress" && item.progressCurrent !== undefined && item.progressTarget !== undefined;
  return (
    <article id={`milestone-${item.id}`} tabIndex={-1} className="scroll-mt-8 rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4 shadow-[0_8px_24px_rgba(126,31,20,0.04)] transition-shadow">
      <CatalogItemHeader
        label={item.label}
        description={item.description}
        state={item.state}
        category={item.awardCategory}
        categoryClassName="border-[#ead8d2] bg-[#fffaf8] text-[#806b65]"
        isNewSinceLastRulesMigration={item.isNewSinceLastRulesMigration}
        fr={fr}
      />
      {hasRealProgress ? (
        <p className="mt-4 rounded-xl bg-[#fff8f6] px-3 py-2 text-xs font-semibold text-[#765f59]">
          {fr ? "Progression : " : "Progress: "}{item.progressCurrent}/{item.progressTarget} {fr ? "étapes réalisées" : "steps completed"}
        </p>
      ) : null}
      <p className="mt-4 text-xs font-semibold text-[#a48d86]">
        {item.achievedAt ? `${fr ? "Obtenu le" : "Achieved on"} ${item.achievedAt.slice(0, 10)} · ${milestoneReward(item, fr)}` : milestoneReward(item, fr)}
      </p>
      {item.awardCategory === "BADGE_ONLY" ? (
        <p className="mt-2 text-xs leading-5 text-[#806b65]">
          {fr ? "Ce jalon apporte une reconnaissance, sans XP supplémentaire." : "This milestone is recognition and does not add XP."}
        </p>
      ) : null}
    </article>
  );
}

export function buildCatalogGroups(summary: GamificationSummary) {
  return {
    progressions: {
      newItems: summary.progressions.filter((item) => item.isNewSinceLastRulesMigration && item.state === "not_started"),
      inProgress: summary.progressions.filter((item) => item.state === "in_progress"),
      toDiscover: summary.progressions.filter((item) => !item.isNewSinceLastRulesMigration && item.state === "not_started"),
    },
    milestones: {
      newItems: summary.milestones.filter((item) => item.isNewSinceLastRulesMigration && item.state === "not_started"),
      inProgress: summary.milestones.filter((item) => item.state === "in_progress"),
      completed: summary.milestones.filter((item) => item.state === "completed"),
      toDiscover: summary.milestones.filter((item) => !item.isNewSinceLastRulesMigration && item.state === "not_started"),
    },
  };
}

function CatalogGroup({
  title,
  items,
  fr,
  kind,
}: {
  title: string;
  items: GamificationSummaryProgression[] | GamificationSummaryMilestone[];
  fr: boolean;
  kind: "progression" | "milestone";
}) {
  if (items.length === 0) return null;
  const milestoneItems = kind === "milestone" ? (items as GamificationSummaryMilestone[]) : [];
  const categorizedMilestones = kind === "milestone"
    ? [
        {
          category: "XP_MILESTONE" as const,
          title: fr ? "Jalons avec XP" : "Milestones with XP",
          items: milestoneItems.filter((item) => item.awardCategory === "XP_MILESTONE"),
        },
        {
          category: "BADGE_ONLY" as const,
          title: fr ? "Jalons de reconnaissance" : "Recognition milestones",
          items: milestoneItems.filter((item) => item.awardCategory === "BADGE_ONLY"),
        },
      ].filter((group) => group.items.length > 0)
    : [];
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#a48d86]">
        {kind === "progression" ? <TrendingUp size={14} aria-hidden="true" /> : <Flag size={14} aria-hidden="true" />}
        {title}
        <span className="rounded-full bg-[#fff1ef] px-2 py-0.5 text-xs text-[#b4362e]">{items.length}</span>
      </h3>
      {kind === "progression" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {(items as GamificationSummaryProgression[]).map((item) => <ProgressionItem key={item.id} item={item} fr={fr} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {categorizedMilestones.map((group) => (
            <div key={group.category} className="rounded-[1.25rem] border border-[#f1dfd8] bg-[#fffdfc] p-3">
              <h4 className="mb-3 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#806b65]">
                <span>{group.title}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[#b4362e]">{group.items.length}</span>
              </h4>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.items.map((item) => <MilestoneItem key={item.id} item={item} fr={fr} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GamificationCatalogPanel({
  summary,
  loading,
  error,
  locale,
}: {
  summary: GamificationSummary | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
}) {
  const fr = locale === "fr";
  useEffect(() => {
    const focusHashTarget = () => {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (!/^(?:progression-|milestone-|gamification-milestones(?:-new)?$|gamification-progressions(?:-new)?$)/.test(targetId)) return;
      window.setTimeout(() => focusGamificationTarget(targetId), 0);
    };

    focusHashTarget();
    window.addEventListener("hashchange", focusHashTarget);
    return () => window.removeEventListener("hashchange", focusHashTarget);
  }, [loading, summary]);
  if (loading) {
    return <GamificationPanelLoading ariaLabel={fr ? "Chargement de la gamification" : "Loading gamification"} headingWidth="w-80" cardHeight="h-32" />;
  }
  if (error || !summary) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <SectionLabel icon={Target} title={fr ? "Progressions & paliers" : "Progressions & tiers"} subtitle={fr ? "L’inventaire CURRENT est temporairement indisponible." : "The CURRENT inventory is temporarily unavailable."} />
      </section>
    );
  }

  const groups = buildCatalogGroups(summary);

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={Sparkles}
          title={fr ? "Progressions & paliers" : "Progressions & tiers"}
          subtitle={fr ? "Toutes les mécaniques CURRENT applicables, y compris celles qui restent à commencer." : "Every applicable CURRENT mechanic, including goals not started yet."}
        />
        <span className="hidden shrink-0 items-center gap-1 rounded-full border border-[#f1c1b7] bg-[#fff5f2] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#b4362e] sm:inline-flex">
          <TrendingUp size={13} aria-hidden="true" /> {summary.progressions.length}
        </span>
      </div>

      <p className="mt-5 rounded-2xl border border-[#ead8d2] bg-[#fffaf8] px-4 py-3 text-sm leading-6 text-[#6e5550]" role="note">
        {fr
          ? "Certaines réalisations donnent de l’XP. D’autres sont des reconnaissances sans XP. Les données d’impact ne sont pas automatiquement converties en XP."
          : "Some achievements grant XP. Others are recognition without XP. Impact data is not automatically converted into XP."}
      </p>

      <div id="gamification-progressions" tabIndex={-1} className="mt-6 space-y-6 scroll-mt-6">
        <div id="gamification-progressions-new" className="scroll-mt-8">
          <CatalogGroup title={fr ? "Nouvelles tâches" : "New tasks"} items={groups.progressions.newItems} fr={fr} kind="progression" />
        </div>
        <CatalogGroup title={fr ? "En cours" : "In progress"} items={groups.progressions.inProgress} fr={fr} kind="progression" />
        <CatalogGroup title={fr ? "À découvrir" : "To discover"} items={groups.progressions.toDiscover} fr={fr} kind="progression" />
      </div>

      <div id="gamification-milestones" tabIndex={-1} className="mt-8 border-t border-[#ead8d2] pt-7 scroll-mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-[#2c1a17]"><Flag size={18} className="text-[#c51f1f]" aria-hidden="true" /> {fr ? "Jalons" : "Milestones"}</h2>
            <p className="mt-1 text-xs leading-5 text-[#806b65]">{fr ? "Tous les jalons CURRENT applicables, obtenus ou non." : "Every applicable CURRENT milestone, whether completed or not."}</p>
          </div>
          <span className="hidden rounded-full bg-[#fff8f6] px-3 py-1 text-xs font-black text-[#b4362e] sm:inline-flex">{summary.milestones.length}</span>
        </div>
        <div className="mt-6 space-y-6">
          <div id="gamification-milestones-new" className="scroll-mt-8">
            <CatalogGroup title={fr ? "Nouvelles tâches" : "New tasks"} items={groups.milestones.newItems} fr={fr} kind="milestone" />
          </div>
          <CatalogGroup title={fr ? "En cours" : "In progress"} items={groups.milestones.inProgress} fr={fr} kind="milestone" />
          <CatalogGroup title={fr ? "Terminés" : "Completed"} items={groups.milestones.completed} fr={fr} kind="milestone" />
          <CatalogGroup title={fr ? "À découvrir" : "To discover"} items={groups.milestones.toDiscover} fr={fr} kind="milestone" />
        </div>
      </div>
    </section>
  );
}
