"use client";

import { Award, BookOpen, Check, Compass, Flag, Layers, LockKeyhole, MapPin, MessageSquare, ShieldCheck, Star, Target, Trophy, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { GamificationSummary, GamificationSummaryMilestone, GamificationSummaryProgression } from "@/lib/gamification/progression/gamification-summary";
import { GamificationPanelLoading } from "./gamification-shell";

export type CatalogView = "acquired" | "active" | "discover" | "badges";
type Progression = GamificationSummaryProgression;
type Milestone = GamificationSummaryMilestone;
type Tier = NonNullable<Progression["currentTier"]>;

export function getAcquiredTiers(item: Progression): Tier[] {
  const seen = new Set<string>();
  return [...(item.previousTiers ?? []), ...(item.currentTier?.achieved ? [item.currentTier] : [])]
    .filter((tier) => tier.achieved && !seen.has(tier.id) && Boolean(seen.add(tier.id)));
}

export function selectCatalogItems(summary: GamificationSummary, view: CatalogView) {
  if (view === "acquired") return {
    progressions: summary.progressions.filter((item) => getAcquiredTiers(item).length > 0 || Boolean(item.currentBadge)),
    milestones: summary.milestones.filter((item) => item.state === "completed"),
  };
  if (view === "badges") return { progressions: summary.progressions, milestones: summary.milestones };
  const state = view === "active" ? "in_progress" : "not_started";
  return {
    progressions: summary.progressions.filter((item) => item.state === state),
    milestones: summary.milestones.filter((item) => item.state === state),
  };
}

function Meter({ value, label }: { value: number; label: string }) {
  return <div className="space-y-1">
    <div className="flex justify-end text-xs font-bold tabular-nums text-rose-800">{value}%</div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2.5 overflow-hidden rounded-full bg-rose-100">
      <div className="h-full rounded-full bg-gradient-to-r from-rose-600 to-amber-500 motion-safe:transition-[width]" style={{ width: `${value}%` }} />
    </div>
  </div>;
}

function Medal({ label, unlocked, compact = false }: { label: string; unlocked: boolean; compact?: boolean }) {
  const Icon = unlocked ? Award : LockKeyhole;
  return <div className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border p-3 text-center ${unlocked ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
    <div className={`grid shrink-0 place-items-center rounded-2xl border-2 ${compact ? "h-10 w-10" : "h-16 w-16"} ${unlocked ? "border-amber-400 bg-gradient-to-br from-amber-100 to-amber-300 text-amber-950" : "border-slate-300 bg-white text-slate-500"}`}><Icon size={compact ? 20 : 30} aria-hidden="true" /></div>
    <p className="break-words text-xs font-bold cmm-text-primary">{label}</p>
    <span className="sr-only">{unlocked ? "Acquired / Acquis" : "Locked / Non acquis"}</span>
  </div>;
}

function RewardLabel({ item, fr }: { item: Milestone; fr: boolean }) {
  if (item.awardCategory === "BADGE_ONLY" || !item.grantsXp) return <span>{fr ? "Reconnaissance · sans XP" : "Recognition · no XP"}</span>;
  if (item.xpAmountOrPolicy.kind === "fixed_one_shot" && item.xpAmountOrPolicy.amount > 0) return <span>+{item.xpAmountOrPolicy.amount} XP</span>;
  return <span>{fr ? "Jalon avec XP" : "XP milestone"}</span>;
}

function Details({ item, fr }: { item: Progression | Milestone; fr: boolean }) {
  return <CmmDisclosure summary={fr ? "Conditions et détails" : "Requirements and details"} size="sm" tone="slate">
    <p className="cmm-text-small cmm-text-secondary">{item.description}</p>
    {"currentValue" in item && item.id === "product_feedback" ? <div className="mt-2 space-y-2">
      <p className="cmm-text-small cmm-text-secondary">{fr ? "Seuls les retours utiles acceptés par le compte max comptent. Les doublons et l’envoi seul ne donnent pas d’XP." : "Only useful feedback accepted by the max account counts. Duplicates and submission alone grant no XP."}</p>
      <CmmButton href="/sections/feedback#bug" size="sm" tone="secondary">{fr ? "Envoyer un feedback" : "Send feedback"}</CmmButton>
    </div> : null}
  </CmmDisclosure>;
}

const PROGRESSION_ICONS = {
  participation: Users, organisation: Flag, exploration: Compass, clean_zones: MapPin,
  regularity: Star, versatility: Layers, learning: BookOpen, moderation: ShieldCheck,
  cartography: MapPin, product_feedback: MessageSquare,
} satisfies Record<Progression["id"], typeof Target>;

function ProgressionCard({ item, fr, acquired }: { item: Progression; fr: boolean; acquired: boolean }) {
  const tiers = getAcquiredTiers(item);
  const Icon = PROGRESSION_ICONS[item.id] ?? Target;
  const next = item.nextTier?.label ?? item.nextBadge?.label;
  return <article id={acquired ? `acquired-progression-${item.id}` : `progression-${item.id}`} tabIndex={-1} className="scroll-mt-24 rounded-2xl border border-rose-100 bg-white p-4 space-y-3 min-w-0">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-800">{acquired ? <Trophy size={22} aria-hidden="true" /> : <Icon size={22} aria-hidden="true" />}</div>
      <div className="min-w-0 flex-1"><h3 className="font-bold cmm-text-primary">{item.label}</h3><p className="cmm-text-small cmm-text-secondary">{item.currentValue} {item.metricLabel}</p></div>
      {item.isNewSinceLastRulesMigration ? <span className="text-xs font-bold text-emerald-800">{fr ? "Nouveau" : "New"}</span> : null}
    </div>
    {acquired ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{tiers.length ? tiers.map((tier) => <Medal key={tier.id} label={tier.label} unlocked compact />) : item.currentBadge ? <Medal label={item.currentBadge.label} unlocked compact /> : null}</div> :
      <><p className="text-sm font-semibold cmm-text-primary">{fr ? "Prochain palier" : "Next tier"} : {next ?? (fr ? "Non renseigné" : "Unavailable")}{item.nextTier ? ` · ${item.nextTier.threshold}` : ""}</p><Meter value={item.progressPercent} label={item.label} /></>}
    <p className="text-xs font-semibold cmm-text-secondary">{item.grantsXp ? `${item.xpContribution} XP ${fr ? "obtenue" : "earned"}` : fr ? "Sans XP" : "No XP"}</p>
    <Details item={item} fr={fr} />
  </article>;
}

function MilestoneCard({ item, fr }: { item: Milestone; fr: boolean }) {
  const acquired = item.state === "completed";
  const Icon = acquired ? Check : item.state === "in_progress" ? Star : LockKeyhole;
  return <article id={`milestone-${item.id}`} tabIndex={-1} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 min-w-0 space-y-3">
    <div className="flex items-start gap-3"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${acquired ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}><Icon size={23} aria-hidden="true" /></div>
      <div className="min-w-0 flex-1"><h3 className="font-bold cmm-text-primary">{item.label}</h3><p className="text-xs font-semibold cmm-text-secondary">{acquired ? (fr ? "Acquis" : "Acquired") : item.state === "in_progress" ? (fr ? "En cours" : "In progress") : (fr ? "À débloquer" : "To unlock")}</p></div></div>
    {item.isNewSinceLastRulesMigration ? <p className="text-xs font-bold text-emerald-800">{fr ? "Nouveau" : "New"}</p> : null}
    {item.state === "in_progress" && typeof item.progressCurrent === "number" && typeof item.progressTarget === "number" ? <p className="text-sm tabular-nums font-bold">{item.progressCurrent}/{item.progressTarget}</p> : null}
    {item.state === "in_progress" && typeof item.progressPercent === "number" ? <Meter value={item.progressPercent} label={item.label} /> : null}
    <p className="text-xs font-bold text-rose-800"><RewardLabel item={item} fr={fr} /></p>
    {acquired && item.achievedAt ? <p className="text-xs cmm-text-secondary">{item.achievedAt.slice(0, 10)}</p> : null}
    <Details item={item} fr={fr} />
  </article>;
}

function BadgeAlbum({ progressions, fr }: { progressions: Progression[]; fr: boolean }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {progressions.map((item) => {
      const tiers = getAcquiredTiers(item);
      const next = item.nextTier?.label ?? item.nextBadge?.label;
      return <CmmCard key={item.id} tone="slate" size="sm" className="space-y-3 min-w-0">
        <h3 className="font-bold cmm-text-primary">{item.label}</h3>
        <div className="grid grid-cols-2 gap-2">{tiers.map((tier) => <Medal key={tier.id} label={tier.label} unlocked compact />)}
          {!tiers.length && item.currentBadge ? <Medal label={item.currentBadge.label} unlocked compact /> : null}
          {next ? <Medal label={next} unlocked={false} compact /> : null}
        </div>
        <p className="text-xs cmm-text-secondary">{fr ? "Paliers acquis et prochain palier uniquement" : "Acquired tiers and next tier only"}</p>
      </CmmCard>;
    })}
  </div>;
}

export function GamificationCatalogPanel({ summary, loading, error, locale, view }: {
  summary: GamificationSummary | undefined; loading: boolean; error: unknown; locale: string; view: CatalogView;
}) {
  const fr = locale === "fr";
  if (loading) return <GamificationPanelLoading ariaLabel={fr ? "Chargement de la gamification" : "Loading gamification"} headingWidth="w-48" cardHeight="h-24" />;
  if (error || !summary) return <p role="status" className="rounded-xl border border-slate-200 p-4 cmm-text-secondary">{fr ? "Progressions indisponibles." : "Progress unavailable."}</p>;
  const { progressions, milestones } = selectCatalogItems(summary, view);
  const title = view === "acquired" ? (fr ? "Vos acquis" : "Your achievements") : view === "active" ? (fr ? "En cours" : "In progress") : view === "discover" ? (fr ? "À débloquer" : "To unlock") : (fr ? "Album de récompenses" : "Reward album");
  return <section aria-label={title} className="space-y-5">
    <h2 className="text-xl font-bold cmm-text-primary">{title}</h2>
    {!progressions.length && !milestones.length ? <CmmCard tone="slate"><p className="cmm-text-body cmm-text-primary">{fr ? "Aucune réalisation dans cette catégorie pour le moment." : "No achievements in this category yet."}</p></CmmCard> : null}
    <div id="gamification-progressions" tabIndex={-1} className="space-y-3 scroll-mt-24">
      {view === "discover" ? <div id="gamification-progressions-new" tabIndex={-1} /> : null}
      {progressions.length ? <><h3 className="font-bold cmm-text-primary">{fr ? "Progressions & paliers" : "Progressions & tiers"}</h3>
        {view === "badges" ? <BadgeAlbum progressions={progressions} fr={fr} /> :
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{progressions.map((item) => <ProgressionCard item={item} key={item.id} fr={fr} acquired={view === "acquired"} />)}</div>}</> : null}
    </div>
    <div id="gamification-milestones" tabIndex={-1} className="space-y-4 scroll-mt-24">
      {view === "discover" ? <div id="gamification-milestones-new" tabIndex={-1} /> : null}
      {(["XP_MILESTONE", "BADGE_ONLY"] as const).map((category) => {
        const items = milestones.filter((item) => item.awardCategory === category);
        if (!items.length) return null;
        return <section key={category} className="space-y-3"><h3 className="font-bold cmm-text-primary">{category === "XP_MILESTONE" ? (fr ? "Jalons avec XP" : "XP milestones") : (fr ? "Jalons de reconnaissance" : "Recognition milestones")}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <MilestoneCard key={item.id} item={item} fr={fr} />)}</div></section>;
      })}
    </div>
  </section>;
}
