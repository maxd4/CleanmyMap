import type { GamificationReconciliationReceipt } from "@/lib/gamification/gamification-reconciliation-receipt";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";

export type ReconciliationDetailProgression = {
  label: string;
  kind: "added" | "removed" | "changed";
  targetId: string | null;
  beforeBadge: string | null;
  afterBadge: string | null;
  afterValue: string | null;
  xpImpact: string | null;
};

type ReconciliationDetailBadge = {
  label: string;
  from?: string;
  to?: string;
};

export type ReconciliationDetailMilestone = {
  label: string;
  targetId: string | null;
  reward: string;
};

export type ReconciliationTargetSummary = {
  progressionTargets: string[];
  firstProgressionTarget: string | null;
  milestoneTargets: string[];
  firstMilestoneTarget: string | null;
};

export type ReconciliationDetailCopy = ReconciliationTargetSummary & {
  reasonTitle: string;
  reasonDescription: string;
  previousRulesVersion: string;
  currentRulesVersion: string;
  xpBefore: string;
  xpAfter: string;
  xpDelta: string;
  levelBefore: string;
  levelAfter: string;
  levelDownExplanation: string | null;
  xpExplanation: string;
  progressions: ReconciliationDetailProgression[];
  badges: {
    obtained: string[];
    gradeChanges: ReconciliationDetailBadge[];
    removed: string[];
  };
  milestones: {
    withXp: ReconciliationDetailMilestone[];
    recognition: ReconciliationDetailMilestone[];
    removed: string[];
  };
};

function formatNumber(value: number | null, locale: string): string {
  return value === null ? "—" : new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(value);
}

function safeProgressionLabel(id: string, summary: GamificationSummary, fr: boolean): string {
  return summary.progressions.find((item) => item.id === id)?.label ?? (fr ? "Progression indisponible" : "Progression unavailable");
}

function safeMilestoneLabel(id: string, summary: GamificationSummary, fr: boolean): string {
  return summary.milestones.find((item) => item.id === id)?.label ?? (fr ? "Jalon retiré" : "Milestone removed");
}

function safeBadgeLabel(id: string | undefined, progression: UserProgressionResponse, fr: boolean): string {
  if (!id) return fr ? "Palier précédent" : "Previous tier";
  return progression.badgeCatalog.find((badge) => badge.id === id)?.label ?? (fr ? "Palier précédent" : "Previous tier");
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function buildReconciliationTargetSummary(
  receipt: GamificationReconciliationReceipt,
  progression: UserProgressionResponse,
): ReconciliationTargetSummary {
  const currentProgressionIds = new Set(progression.summary.progressions.map((item) => item.id));
  const currentMilestoneIds = new Set(progression.summary.milestones.map((item) => item.id));
  const progressionIds = uniqueIds([
    ...receipt.progressions.added.map((item) => item.id),
    ...receipt.progressions.changed.map((item) => item.id),
    ...receipt.catalogChanges.newProgressionIds,
    ...progression.summary.progressions.filter((item) => item.isNewSinceLastRulesMigration).map((item) => item.id),
  ]).filter((id) => currentProgressionIds.has(id as never));
  const milestoneIds = uniqueIds([
    ...receipt.milestones.unlocked.map((item) => item.id),
    ...receipt.catalogChanges.newMilestoneIds,
    ...progression.summary.milestones.filter((item) => item.isNewSinceLastRulesMigration).map((item) => item.id),
  ]).filter((id) => currentMilestoneIds.has(id as never));

  return {
    progressionTargets: progressionIds.map((id) => `progression-${id}`),
    firstProgressionTarget: progressionIds[0] ? `progression-${progressionIds[0]}` : null,
    milestoneTargets: milestoneIds.map((id) => `milestone-${id}`),
    firstMilestoneTarget: milestoneIds[0] ? `milestone-${milestoneIds[0]}` : null,
  };
}

function rulesVersionLabel(value: string | null | "mixed", fr: boolean, previous: boolean): string {
  if (value === "mixed") return fr ? "Plusieurs versions précédentes" : "Several previous versions";
  if (value === null) return previous ? (fr ? "Aucune version précédente" : "No previous version") : (fr ? "Règles CURRENT" : "CURRENT rules");
  const simpleVersion = value.match(/^v?(\d+(?:\.\d+)*)$/)?.[1];
  if (simpleVersion) return `${fr ? "Version" : "Version"} ${simpleVersion}`;
  return previous ? (fr ? "Version précédente" : "Previous rules version") : (fr ? "Version actuelle" : "Current rules version");
}

function reasonCopy(receipt: GamificationReconciliationReceipt, fr: boolean): { title: string; description: string } {
  const descriptions = {
    rules_update: fr ? "Les règles de progression ont été mises à jour." : "The progression rules were updated.",
    data_correction: fr ? "Certaines données de votre compte ont été corrigées." : "Some account data was corrected.",
    account_rebuild: fr ? "La progression de votre compte a été reconstruite." : "Your account progression was rebuilt.",
    migration: fr ? "La gamification a été migrée vers les règles CURRENT." : "Gamification was migrated to the CURRENT rules.",
    other: fr ? "La progression de votre compte a été recalculée." : "Your account progression was recalculated.",
  };
  return {
    title: fr ? "Pourquoi ce recalcul ?" : "Why was this recalculated?",
    description: descriptions[receipt.reasonCategory],
  };
}

function badgeLabelFromReceipt(id: string | undefined, progression: UserProgressionResponse, fr: boolean): string {
  return safeBadgeLabel(id, progression, fr);
}

function buildProgressions(
  receipt: GamificationReconciliationReceipt,
  progression: UserProgressionResponse,
  locale: string,
  fr: boolean,
): ReconciliationDetailProgression[] {
  const currentById = new Map(progression.summary.progressions.map((item) => [item.id, item]));
  const result: ReconciliationDetailProgression[] = [];

  for (const item of receipt.progressions.added) {
    const current = currentById.get(item.id as never);
    result.push({
      label: safeProgressionLabel(item.id, progression.summary, fr),
      kind: "added",
      targetId: current ? `progression-${item.id}` : null,
      beforeBadge: null,
      afterBadge: current?.currentBadge?.label ?? null,
      afterValue: current ? formatNumber(current.currentValue, locale) : null,
      xpImpact: null,
    });
  }
  for (const item of receipt.catalogChanges.newProgressionIds) {
    if (receipt.progressions.added.some((added) => added.id === item)) continue;
    const current = currentById.get(item as never);
    result.push({
      label: safeProgressionLabel(item, progression.summary, fr),
      kind: "added",
      targetId: current ? `progression-${item}` : null,
      beforeBadge: null,
      afterBadge: current?.currentBadge?.label ?? null,
      afterValue: current ? formatNumber(current.currentValue, locale) : null,
      xpImpact: null,
    });
  }
  for (const change of receipt.progressions.changed) {
    const current = currentById.get(change.id as never);
    result.push({
      label: safeProgressionLabel(change.id, progression.summary, fr),
      kind: "changed",
      targetId: current ? `progression-${change.id}` : null,
      beforeBadge: badgeLabelFromReceipt(change.before.badgeIds.at(-1), progression, fr),
      afterBadge: badgeLabelFromReceipt(change.after.badgeIds.at(-1), progression, fr),
      afterValue: current ? formatNumber(current.currentValue, locale) : null,
      xpImpact: null,
    });
  }
  for (const item of receipt.progressions.removed) {
    result.push({
      label: safeProgressionLabel(item.id, progression.summary, fr),
      kind: "removed",
      targetId: null,
      beforeBadge: null,
      afterBadge: null,
      afterValue: null,
      xpImpact: null,
    });
  }
  return result;
}

function milestoneReward(
  id: string,
  progression: UserProgressionResponse,
  fr: boolean,
): string {
  const milestone = progression.summary.milestones.find((item) => item.id === id);
  if (milestone?.grantsXp) {
    if (milestone.xpAmountOrPolicy.kind === "fixed_one_shot" && milestone.xpAmountOrPolicy.amount > 0) {
      return `+${milestone.xpAmountOrPolicy.amount} XP`;
    }
    return fr ? "Récompense XP" : "XP reward";
  }
  return fr ? "Jalon de reconnaissance — sans XP" : "Recognition milestone — no XP";
}

function buildMilestones(
  receipt: GamificationReconciliationReceipt,
  progression: UserProgressionResponse,
  fr: boolean,
): ReconciliationDetailCopy["milestones"] {
  const newIds = uniqueIds([
    ...receipt.milestones.unlocked.map((item) => item.id),
    ...receipt.catalogChanges.newMilestoneIds,
  ]);
  const withXp: ReconciliationDetailMilestone[] = [];
  const recognition: ReconciliationDetailMilestone[] = [];
  for (const id of newIds) {
    const milestone = progression.summary.milestones.find((item) => item.id === id);
    const entry = {
      label: safeMilestoneLabel(id, progression.summary, fr),
      targetId: milestone ? `milestone-${id}` : null,
      reward: milestoneReward(id, progression, fr),
    };
    if (milestone?.grantsXp) withXp.push(entry);
    else recognition.push(entry);
  }
  return {
    withXp,
    recognition,
    removed: receipt.milestones.removed.map((item) => safeMilestoneLabel(item.id, progression.summary, fr)),
  };
}

export function buildReconciliationDetailCopy(
  receipt: GamificationReconciliationReceipt,
  progression: UserProgressionResponse,
  locale: string,
): ReconciliationDetailCopy {
  const fr = locale === "fr";
  const reason = reasonCopy(receipt, fr);
  const targets = buildReconciliationTargetSummary(receipt, progression);
  const levelDownExplanation = receipt.level.direction === "down"
    ? (fr
      ? "Le total d’XP ou les critères requis pour ce niveau ont changé après recalcul."
      : "The total XP or the criteria required for this level changed after recalculation.")
    : null;
  const badgeCatalog = progression.badgeCatalog;
  const labelBadge = (id: string) => badgeCatalog.find((badge) => badge.id === id)?.label ?? (fr ? "Badge retiré" : "Removed badge");
  const gradeChanges = [...receipt.badges.upgraded, ...receipt.badges.downgraded].map((change) => ({
    label: labelBadge(change.to.id),
    from: safeBadgeLabel(change.from.id, progression, fr),
    to: safeBadgeLabel(change.to.id, progression, fr),
  }));

  return {
    ...targets,
    reasonTitle: reason.title,
    reasonDescription: reason.description,
    previousRulesVersion: rulesVersionLabel(receipt.previousRulesVersion, fr, true),
    currentRulesVersion: rulesVersionLabel(receipt.currentRulesVersion, fr, false),
    xpBefore: `${formatNumber(receipt.xp.before, locale)} XP`,
    xpAfter: `${formatNumber(receipt.xp.after, locale)} XP`,
    xpDelta: `${receipt.xp.delta > 0 ? "+" : receipt.xp.delta < 0 ? "−" : ""}${formatNumber(Math.abs(receipt.xp.delta), locale)} XP`,
    levelBefore: formatNumber(receipt.level.before, locale),
    levelAfter: formatNumber(receipt.level.after, locale),
    levelDownExplanation,
    xpExplanation: fr
      ? "L’XP est recalculée depuis vos contributions et les règles actuellement applicables."
      : "XP is recalculated from your contributions and the rules currently applicable.",
    progressions: buildProgressions(receipt, progression, locale, fr),
    badges: {
      obtained: receipt.badges.unlocked.map((item) => labelBadge(item.id)),
      gradeChanges,
      removed: receipt.badges.removed.map((item) => labelBadge(item.id)),
    },
    milestones: buildMilestones(receipt, progression, fr),
  };
}
