import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GamificationEventChange,
  GamificationReconciliationPlan,
  PersistedGamificationEvent,
} from "./gamification-reconciliation-plan";
import { asGamificationMetadata } from "./gamification-reconciliation-plan";
import type { GamificationRulesV1 } from "./gamification-rules";

export type GamificationReconciliationReasonCategory =
  | "rules_update"
  | "data_correction"
  | "account_rebuild"
  | "migration"
  | "other";

type GamificationReceiptId = { id: string };

type GamificationProgressionReceiptState = {
  badgeIds: string[];
  thresholds: number[];
  eventCount: number;
};

type GamificationProgressionReceiptChange = {
  id: string;
  before: GamificationProgressionReceiptState;
  after: GamificationProgressionReceiptState;
};

type GamificationBadgeReceiptChange = {
  id: string;
  progressionId?: string;
};

type GamificationBadgeUpgrade = {
  from: GamificationBadgeReceiptChange;
  to: GamificationBadgeReceiptChange;
};

export type GamificationReconciliationReceipt = {
  reconciliationId: string;
  userId: string;
  occurredAt: string;
  previousRulesVersion: string | null | "mixed";
  currentRulesVersion: string;
  previousRulesRevision: number | null;
  currentRulesRevision: number;
  xp: {
    before: number;
    after: number;
    delta: number;
    gained: number;
    removed: number;
  };
  level: {
    before: number | null;
    after: number | null;
    changed: boolean;
    direction: "up" | "down" | "same";
  };
  progressions: {
    added: GamificationReceiptId[];
    removed: GamificationReceiptId[];
    changed: GamificationProgressionReceiptChange[];
  };
  badges: {
    unlocked: GamificationBadgeReceiptChange[];
    removed: GamificationBadgeReceiptChange[];
    upgraded: GamificationBadgeUpgrade[];
    downgraded: GamificationBadgeUpgrade[];
  };
  milestones: {
    unlocked: GamificationReceiptId[];
    removed: GamificationReceiptId[];
  };
  eventChanges: {
    addedCount: number;
    updatedCount: number;
    removedCount: number;
  };
  catalogChanges: {
    newProgressionIds: string[];
    newMilestoneIds: string[];
    retiredMechanicIds: string[];
  };
  reasonCategory: GamificationReconciliationReasonCategory;
  hasUserVisibleChanges: boolean;
};

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function metadataForChange(change: GamificationEventChange): Record<string, unknown> {
  return change.metadata ?? {};
}

function progressionIdForChange(change: GamificationEventChange): string | null {
  const value = metadataForChange(change).progressionId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function badgeIdForChange(change: GamificationEventChange): string | null {
  const value = metadataForChange(change).badgeId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function thresholdForChange(change: GamificationEventChange): number | null {
  const value = metadataForChange(change).threshold;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function progressionState(
  events: readonly GamificationEventChange[],
): Map<string, GamificationProgressionReceiptState> {
  const states = new Map<string, GamificationProgressionReceiptState>();
  for (const event of events) {
    const id = progressionIdForChange(event);
    if (!id) continue;
    const state = states.get(id) ?? { badgeIds: [], thresholds: [], eventCount: 0 };
    const badgeId = badgeIdForChange(event);
    const threshold = thresholdForChange(event);
    if (badgeId) state.badgeIds.push(badgeId);
    if (threshold !== null) state.thresholds.push(threshold);
    state.eventCount += 1;
    states.set(id, state);
  }
  for (const state of states.values()) {
    state.badgeIds = sortedUnique(state.badgeIds);
    state.thresholds = [...new Set(state.thresholds)].sort((left, right) => left - right);
  }
  return states;
}

function currentEvents(plan: GamificationReconciliationPlan): GamificationEventChange[] {
  return plan.currentPersisted.map((event) => persistedEventChange(plan.userId, event));
}

function persistedEventChange(
  userId: string,
  event: PersistedGamificationEvent,
): GamificationEventChange {
  const metadata = asGamificationMetadata(event.metadata);
  return {
    id: event.id,
    logicalId: typeof metadata.logicalId === "string"
      ? metadata.logicalId
      : `${userId}:${event.event_type}:${event.source_table}:${event.source_id}`,
    sourceTable: event.source_table,
    sourceId: event.source_id,
    eventType: event.event_type,
    xpAwarded: Number(event.xp_awarded) || 0,
    rulesVersion: typeof metadata.rulesVersion === "string" ? metadata.rulesVersion : undefined,
    metadata,
  };
}

function receiptId(plan: GamificationReconciliationPlan): string {
  const changes = [...plan.eventsToAdd, ...plan.eventsToUpdate, ...plan.eventsToRemove]
    .map((event) => `${event.logicalId}:${event.xpAwarded}:${event.sourceTable}:${event.sourceId}`)
    .sort()
    .join(",");
  return [
    "gamification-reconciliation",
    plan.userId,
    plan.rulesVersionBefore ?? "none",
    plan.rulesVersionAfter,
    plan.xpBefore,
    plan.xpExpected,
    plan.rulesRevisionBefore ?? "none",
    plan.rulesRevisionAfter,
    changes,
  ].join("|");
}

function catalogChanges(
  plan: GamificationReconciliationPlan,
  rules: GamificationRulesV1 | undefined,
): GamificationReconciliationReceipt["catalogChanges"] {
  if (!rules || plan.rulesRevisionBefore === plan.rulesRevisionAfter) {
    return { newProgressionIds: [], newMilestoneIds: [], retiredMechanicIds: [] };
  }

  const applicable = new Set(
    plan.expected.applicableMechanicIds.length > 0
      ? plan.expected.applicableMechanicIds
      : plan.expected.events.map((event) => event.mechanicId),
  );
  const introducedNow = rules.mechanics.filter(
    (rule) => rule.introducedInRulesRevision === rules.rulesRevision && applicable.has(rule.mechanicId),
  );
  const newProgressionIds = sortedUnique(
    introducedNow
      .filter((rule) => rule.category === "XP_PROGRESSION" && rule.progressionId)
      .map((rule) => rule.progressionId!),
  );
  const newMilestoneIds = sortedUnique(
    introducedNow
      .filter((rule) => (rule.category === "XP_MILESTONE" || rule.category === "BADGE_ONLY") && rule.milestoneId)
      .map((rule) => rule.milestoneId!),
  );
  const currentMechanicIds = new Set(rules.mechanics.map((rule) => rule.mechanicId));
  const currentNonGamifiedIds = new Set(
    rules.mechanics
      .filter((rule) => rule.category === "NON_GAMIFIED")
      .map((rule) => rule.mechanicId),
  );
  const retiredMechanicIds = sortedUnique(
    plan.eventsToRemove
      .map((change) => metadataForChange(change).mechanicId)
      .filter((value): value is string =>
        typeof value === "string" && (!currentMechanicIds.has(value) || currentNonGamifiedIds.has(value)),
      ),
  );

  return { newProgressionIds, newMilestoneIds, retiredMechanicIds };
}

function badgeRef(id: string, events: readonly GamificationEventChange[]): GamificationBadgeReceiptChange {
  const event = events.find((candidate) => badgeIdForChange(candidate) === id);
  const progressionId = event ? progressionIdForChange(event) : null;
  return progressionId ? { id, progressionId } : { id };
}

function progressionChanges(
  before: Map<string, GamificationProgressionReceiptState>,
  after: Map<string, GamificationProgressionReceiptState>,
): GamificationProgressionReceiptChange[] {
  const changes: GamificationProgressionReceiptChange[] = [];
  for (const id of [...before.keys()].filter((value) => after.has(value)).sort()) {
    const previous = before.get(id)!;
    const next = after.get(id)!;
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changes.push({ id, before: previous, after: next });
    }
  }
  return changes;
}

function badgeGradeChanges(
  changes: readonly GamificationProgressionReceiptChange[],
): { upgraded: GamificationBadgeUpgrade[]; downgraded: GamificationBadgeUpgrade[] } {
  const upgraded: GamificationBadgeUpgrade[] = [];
  const downgraded: GamificationBadgeUpgrade[] = [];
  for (const change of changes) {
    const from = change.before.badgeIds.at(-1);
    const to = change.after.badgeIds.at(-1);
    if (!from || !to || from === to) continue;
    const beforeThreshold = change.before.thresholds.at(-1) ?? 0;
    const afterThreshold = change.after.thresholds.at(-1) ?? 0;
    const value = {
      from: { id: from, progressionId: change.id },
      to: { id: to, progressionId: change.id },
    };
    if (afterThreshold >= beforeThreshold) upgraded.push(value);
    else downgraded.push(value);
  }
  return { upgraded, downgraded };
}

function isVisible(receipt: Omit<GamificationReconciliationReceipt, "hasUserVisibleChanges">): boolean {
  return receipt.xp.delta !== 0 ||
    receipt.level.changed ||
    receipt.progressions.added.length > 0 ||
    receipt.progressions.removed.length > 0 ||
    receipt.progressions.changed.length > 0 ||
    receipt.badges.unlocked.length > 0 ||
    receipt.badges.removed.length > 0 ||
    receipt.badges.upgraded.length > 0 ||
    receipt.badges.downgraded.length > 0 ||
    receipt.milestones.unlocked.length > 0 ||
    receipt.milestones.removed.length > 0 ||
    receipt.catalogChanges.newProgressionIds.length > 0 ||
    receipt.catalogChanges.newMilestoneIds.length > 0 ||
    receipt.catalogChanges.retiredMechanicIds.length > 0;
}

/** Builds the user-facing consequence of exactly one deterministic plan. */
export function buildGamificationReconciliationReceipt(
  plan: GamificationReconciliationPlan,
  options: {
    occurredAt?: string;
    reasonCategory?: GamificationReconciliationReasonCategory;
    reconciliationId?: string;
    rules?: GamificationRulesV1;
  } = {},
): GamificationReconciliationReceipt {
  const beforeEvents = currentEvents(plan);
  const afterEvents = plan.expected.events.map((event) => ({
    logicalId: event.logicalId,
    sourceTable: event.sourceTable,
    sourceId: event.sourceId,
    eventType: event.eventType,
    xpAwarded: event.xpAwarded,
    rulesVersion: plan.rulesVersionAfter,
    metadata: event.metadata,
  }));
  const beforeProgressions = progressionState(beforeEvents);
  const afterProgressions = progressionState(afterEvents);
  const progressionAdded = [...afterProgressions.keys()].filter((id) => !beforeProgressions.has(id)).sort();
  const progressionRemoved = [...beforeProgressions.keys()].filter((id) => !afterProgressions.has(id)).sort();
  const changed = progressionChanges(beforeProgressions, afterProgressions);
  const gradeChanges = badgeGradeChanges(changed);
  const receiptWithoutVisibility = {
    reconciliationId: options.reconciliationId ?? receiptId(plan),
    userId: plan.userId,
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    previousRulesVersion: plan.rulesVersionBefore,
    currentRulesVersion: plan.rulesVersionAfter,
    previousRulesRevision: plan.rulesRevisionBefore,
    currentRulesRevision: plan.rulesRevisionAfter,
    xp: {
      before: plan.xpBefore,
      after: plan.xpExpected,
      delta: plan.xpDelta,
      gained: Math.max(plan.xpDelta, 0),
      removed: Math.max(-plan.xpDelta, 0),
    },
    level: {
      before: plan.levelBefore,
      after: plan.levelAfter,
      changed: plan.levelBefore !== plan.levelAfter,
      direction: plan.levelAfter === plan.levelBefore
        ? "same" as const
        : plan.levelBefore === null || (plan.levelAfter !== null && plan.levelAfter > plan.levelBefore)
          ? "up" as const
          : "down" as const,
    },
    progressions: {
      added: progressionAdded.map((id) => ({ id })),
      removed: progressionRemoved.map((id) => ({ id })),
      changed,
    },
    badges: {
      unlocked: plan.badgesAdded.map((id) => badgeRef(id, afterEvents)),
      removed: plan.badgesRemoved.map((id) => badgeRef(id, beforeEvents)),
      upgraded: gradeChanges.upgraded,
      downgraded: gradeChanges.downgraded,
    },
    milestones: {
      unlocked: plan.milestonesAdded.map((id) => ({ id })),
      removed: plan.milestonesRemoved.map((id) => ({ id })),
    },
    eventChanges: {
      addedCount: plan.eventsToAdd.length,
      updatedCount: plan.eventsToUpdate.length,
      removedCount: plan.eventsToRemove.length,
    },
    catalogChanges: catalogChanges(plan, options.rules),
    reasonCategory: options.reasonCategory ?? "account_rebuild",
  };
  return { ...receiptWithoutVisibility, hasUserVisibleChanges: isVisible(receiptWithoutVisibility) };
}

export async function persistGamificationReconciliationReceipt(
  supabase: SupabaseClient,
  receipt: GamificationReconciliationReceipt,
): Promise<void> {
  if (!receipt.hasUserVisibleChanges) return;
  const { error } = await supabase.from("app_notifications").insert({
    user_id: receipt.userId,
    type: "gamification_reconciliation",
    title: "Votre progression CleanMyMap a été mise à jour.",
    content: "Voir les changements sur la page Gamification.",
    created_at: receipt.occurredAt,
    seen_at: null,
    acknowledged_at: null,
    payload: {
      kind: "gamification_reconciliation_receipt",
      schemaVersion: 2,
      reconciliationId: receipt.reconciliationId,
      receipt,
    },
  });
  if (error && error.code !== "23505") throw new Error(error.message);
}
