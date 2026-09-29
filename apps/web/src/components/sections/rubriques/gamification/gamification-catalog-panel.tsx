import { Flag, Sparkles, Target, TrendingUp } from "lucide-react";
import { SectionLabel } from "./gamification-shell";
import type {
  GamificationSummary,
  GamificationSummaryMilestone,
  GamificationSummaryProgression,
} from "@/lib/gamification/gamification-summary";

function stateLabel(state: GamificationSummaryProgression["state"] | GamificationSummaryMilestone["state"], fr: boolean): string {
  if (state === "completed") return fr ? "Acquis" : "Completed";
  if (state === "in_progress") return fr ? "En cours" : "In progress";
  return fr ? "À commencer" : "Not started";
}

function categoryLabel(category: GamificationSummaryMilestone["category"] | "XP_PROGRESSION", fr: boolean): string {
  if (category === "BADGE_ONLY") return fr ? "Badge" : "Badge only";
  if (category === "XP_MILESTONE") return fr ? "Jalon XP" : "XP milestone";
  return fr ? "Progression XP" : "XP progression";
}

function statusClass(state: GamificationSummaryProgression["state"] | GamificationSummaryMilestone["state"]): string {
  if (state === "completed") return "border-[#b7d9c4] bg-[#effaf2] text-[#287348]";
  if (state === "in_progress") return "border-[#f1c18c] bg-[#fff7ed] text-[#9a5a16]";
  return "border-[#e4d7d2] bg-white text-[#806b65]";
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
  state: GamificationSummaryProgression["state"] | GamificationSummaryMilestone["state"];
  category: GamificationSummaryMilestone["category"] | "XP_PROGRESSION";
  categoryClassName: string;
  isNewSinceLastRulesMigration: boolean;
  fr: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-[#2c1a17]">{label}</h3>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-black uppercase tracking-[0.16em] ${categoryClassName}`}>
            {categoryLabel(category, fr)}
          </span>
          {isNewSinceLastRulesMigration ? (
            <span className="rounded-full bg-[#2c1a17] px-2 py-0.5 text-xs font-black uppercase tracking-[0.16em] text-white">
              {fr ? "Nouveau" : "New"}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-[#806b65]">{description}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(state)}`}>
        {stateLabel(state, fr)}
      </span>
    </div>
  );
}

function ProgressionItem({ item, fr }: { item: GamificationSummaryProgression; fr: boolean }) {
  return (
    <article className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4 shadow-[0_8px_24px_rgba(126,31,20,0.04)]">
      <CatalogItemHeader
        label={item.label}
        description={item.description}
        state={item.state}
        category="XP_PROGRESSION"
        categoryClassName="border-[#f1c1b7] bg-[#fff5f2] text-[#b4362e]"
        isNewSinceLastRulesMigration={item.isNewSinceLastRulesMigration}
        fr={fr}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">
            {fr ? "Valeur" : "Value"}
          </p>
            <p className="mt-1 text-xl font-black text-[#c51f1f]">{item.currentValue}</p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#765f59]">
            <span>{item.currentBadge?.label ?? (fr ? "Observateur" : "Observer")}{item.currentBadge ? " ✓" : ""}</span>
            <span>{item.nextBadge?.label ?? (fr ? "Palier suivant" : "Next tier")}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f5e7e2]" aria-label={`${item.progressPercent}%`}>
            <div className="h-full rounded-full bg-[#cf3b34]" style={{ width: `${item.progressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#a48d86]">
            {fr ? "Contribution XP : " : "XP contribution: "}{item.xpContribution}
            {item.metricLabel ? ` · ${item.metricLabel}` : ""}
          </p>
        </div>
        <p className="text-right text-xs font-semibold text-[#a48d86]">
          {item.grantsXp ? (fr ? "XP selon paliers" : "XP by tier") : (fr ? "Sans XP" : "No XP")}
        </p>
      </div>
    </article>
  );
}

function MilestoneItem({ item, fr }: { item: GamificationSummaryMilestone; fr: boolean }) {
  return (
    <article className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4 shadow-[0_8px_24px_rgba(126,31,20,0.04)]">
      <CatalogItemHeader
        label={item.label}
        description={item.description}
        state={item.state}
        category={item.category}
        categoryClassName="border-[#ead8d2] bg-[#fffaf8] text-[#806b65]"
        isNewSinceLastRulesMigration={item.isNewSinceLastRulesMigration}
        fr={fr}
      />
      {item.progressCurrent !== undefined && item.progressTarget !== undefined ? (
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold text-[#765f59]">
            <span>{fr ? "Invitations enregistrées" : "Registered invites"}</span>
            <span>{item.progressCurrent}/{item.progressTarget}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f5e7e2]">
            <div className="h-full rounded-full bg-[#cf3b34]" style={{ width: `${item.progressPercent ?? 0}%` }} />
          </div>
        </div>
      ) : null}
      <p className="mt-4 text-xs font-semibold text-[#a48d86]">
        {item.achievedAt
          ? `${fr ? "Obtenu le" : "Achieved on"} ${item.achievedAt.slice(0, 10)}`
          : item.grantsXp
            ? (fr ? "Récompense XP one-shot" : "One-shot XP reward")
            : (fr ? "Reconnaissance one-shot" : "One-shot recognition")}
        {` · XP : ${item.xpContribution}`}
      </p>
    </article>
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
  if (loading) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-52 rounded-full bg-[#f5e7e2]" />
          <div className="h-7 w-80 rounded-full bg-[#f5e7e2]" />
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="h-32 rounded-[1.35rem] bg-[#fff8f6]" />
            <div className="h-32 rounded-[1.35rem] bg-[#fff8f6]" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !summary) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <SectionLabel icon={Target} title={fr ? "Objectifs de progression" : "Progression goals"} subtitle={fr ? "Le catalogue personnel est temporairement indisponible." : "The personal catalog is temporarily unavailable."} />
      </section>
    );
  }

  const progressions = summary.progressions;
  const milestones = summary.milestones;
  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={Sparkles}
          title={fr ? "Inventaire des objectifs" : "Goal inventory"}
          subtitle={fr ? "Toutes les mécaniques CURRENT applicables, y compris celles qui restent à commencer." : "Every applicable CURRENT mechanic, including goals not started yet."}
        />
        <span className="hidden shrink-0 items-center gap-1 rounded-full border border-[#f1c1b7] bg-[#fff5f2] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#b4362e] sm:inline-flex">
          <TrendingUp size={13} /> {progressions.length + milestones.length}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#a48d86]">
          <TrendingUp size={14} /> {fr ? "Progressions infinies" : "Infinite progressions"}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {progressions.map((item) => <ProgressionItem key={item.id} item={item} fr={fr} />)}
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#a48d86]">
          <Flag size={14} /> {fr ? "Jalons one-shot" : "One-shot milestones"}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {milestones.map((item) => <MilestoneItem key={item.id} item={item} fr={fr} />)}
        </div>
      </div>
    </section>
  );
}
