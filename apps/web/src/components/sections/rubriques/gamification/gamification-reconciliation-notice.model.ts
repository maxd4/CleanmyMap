import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";
import type { GamificationReconciliationReceipt } from "@/lib/gamification/gamification-reconciliation-receipt";
import { buildReconciliationTargetSummary } from "./gamification-reconciliation-detail.model";

export type ReconciliationNoticeCopy = {
  xpBeforeAfter: string;
  xpDelta: string | null;
  level: string;
  changes: string[];
  hasProgressionChanges: boolean;
  hasNewMilestonesOrBadges: boolean;
  firstProgressionTarget: string | null;
  firstMilestoneTarget: string | null;
};

function formatNumber(value: number | null, locale: string): string {
  return value === null ? "—" : new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(value);
}

function labelForProgression(id: string, summary: GamificationSummary, fr: boolean): string {
  return summary.progressions.find((item) => item.id === id)?.label ?? (fr ? "Progression indisponible" : "Progression unavailable");
}

function labelForMilestone(id: string, summary: GamificationSummary, fr: boolean): string {
  return summary.milestones.find((item) => item.id === id)?.label ?? (fr ? "Jalon retiré" : "Milestone removed");
}

function labelForBadge(id: string, progression: UserProgressionResponse, fr: boolean): string {
  return progression.badgeCatalog.find((badge) => badge.id === id)?.label ?? (fr ? "Palier précédent" : "Previous tier");
}

function badgeLabel(id: string | undefined, progression: UserProgressionResponse, fr: boolean): string {
  return id ? labelForBadge(id, progression, fr) : (fr ? "Palier précédent" : "Previous tier");
}

function buildProgressionChanges(
  receipt: GamificationReconciliationReceipt,
  progression: UserProgressionResponse,
  fr: boolean,
): string[] {
  const changes: string[] = [];
  for (const item of receipt.progressions.added) {
    changes.push(`${fr ? "Nouvelle progression" : "New progression"} : ${labelForProgression(item.id, progression.summary, fr)}`);
  }
  for (const item of receipt.progressions.removed) {
    changes.push(`${fr ? "Progression retirée" : "Progression removed"} : ${labelForProgression(item.id, progression.summary, fr)}`);
  }
  for (const change of receipt.progressions.changed) {
    const from = change.before.badgeIds.at(-1);
    const to = change.after.badgeIds.at(-1);
    changes.push(
      `${labelForProgression(change.id, progression.summary, fr)} : ${badgeLabel(from, progression, fr)} → ${badgeLabel(to, progression, fr)}`,
    );
  }
  return changes;
}

function buildBadgeChanges(
  receipt: GamificationReconciliationReceipt,
  fr: boolean,
): string[] {
  const changes: string[] = [];
  if (receipt.badges.unlocked.length > 0) {
    const count = receipt.badges.unlocked.length;
    changes.push(
      fr
        ? `+ ${count} badge${count > 1 ? "s" : ""} obtenu${count > 1 ? "s" : ""}`
        : `+ ${count} badge${count > 1 ? "s" : ""} unlocked`,
    );
  }
  if (receipt.badges.removed.length > 0) {
    const count = receipt.badges.removed.length;
    changes.push(
      fr
        ? `− ${count} ancien${count > 1 ? "s" : ""} badge${count > 1 ? "s" : ""} retiré${count > 1 ? "s" : ""}`
        : `− ${count} old badge${count > 1 ? "s" : ""} removed`,
    );
  }
  const tierChanges = receipt.badges.upgraded.length + receipt.badges.downgraded.length;
  if (tierChanges > 0) {
    changes.push(
      fr
        ? tierChanges === 1 ? "1 badge a changé de palier" : `${tierChanges} badges ont changé de palier`
        : `${tierChanges} badge${tierChanges > 1 ? "s" : ""} changed tier${tierChanges > 1 ? "s" : ""}`,
    );
  }
  return changes;
}

function buildMilestoneChanges(
  receipt: GamificationReconciliationReceipt,
  progression: UserProgressionResponse,
  fr: boolean,
): string[] {
  return [
    ...receipt.milestones.unlocked.map((item) => `${fr ? "Nouveau jalon" : "New milestone"} : ${labelForMilestone(item.id, progression.summary, fr)}`),
    ...receipt.milestones.removed.map((item) => `${fr ? "Jalon retiré" : "Milestone removed"} : ${labelForMilestone(item.id, progression.summary, fr)}`),
  ];
}

export function buildReconciliationNoticeCopy(
  receipt: GamificationReconciliationReceipt,
  progression: UserProgressionResponse,
  locale: string,
): ReconciliationNoticeCopy {
  const fr = locale === "fr";
  const xpBefore = formatNumber(receipt.xp.before, locale);
  const xpAfter = formatNumber(receipt.xp.after, locale);
  const delta = receipt.xp.delta;
  const xpDelta = delta === 0
    ? null
    : `${delta > 0 ? "+" : "−"}${formatNumber(Math.abs(delta), locale)} XP`;
  const levelLabel = fr ? "Niveau" : "Level";
  const level = receipt.level.before === receipt.level.after
    ? (fr ? `Niveau ${formatNumber(receipt.level.after, locale)} conservé` : `Level ${formatNumber(receipt.level.after, locale)} kept`)
    : `${levelLabel} ${formatNumber(receipt.level.before, locale)} → ${levelLabel} ${formatNumber(receipt.level.after, locale)}`;

  const changes = [
    ...buildProgressionChanges(receipt, progression, fr),
    ...buildBadgeChanges(receipt, fr),
    ...buildMilestoneChanges(receipt, progression, fr),
  ];
  const targets = buildReconciliationTargetSummary(receipt, progression);

  return {
    xpBeforeAfter: `${xpBefore} → ${xpAfter} XP`,
    xpDelta,
    level,
    changes,
    hasProgressionChanges: targets.firstProgressionTarget !== null,
    hasNewMilestonesOrBadges: targets.firstMilestoneTarget !== null,
    firstProgressionTarget: targets.firstProgressionTarget,
    firstMilestoneTarget: targets.firstMilestoneTarget,
  };
}
