import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GamificationEventChange,
  GamificationReconciliationPlan,
  PersistedGamificationEvent,
} from "./gamification-reconciliation-plan";
import { asGamificationMetadata } from "./gamification-reconciliation-plan";
import type { GamificationRulesV1 } from "../progression/gamification-rules";

export type GamificationReconciliationReasonCategory =
  | "rules_update"
  | "data_correction"
  | "account_rebuild"
  | "migration"
  | "scientific_impact_update"
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
  scientificImpact?: {
    methodVersion: string;
    sourceFingerprint: string;
    eventsAdded: number;
    eventsUpdated: number;
    eventsRemoved: number;
  };
  reasonCategory: GamificationReconciliationReasonCategory;
  hasUserVisibleChanges: boolean;
};

export type ScientificImpactReceiptIntent = {
  kind: "scientific_impact_reconciliation_pending";
  schemaVersion: 1;
  reconciliationId: string;
  userId: string;
  scientificImpact: {
    methodVersion: string;
    sourceFingerprint: string;
    eventsAdded: number;
    eventsUpdated: number;
    eventsRemoved: number;
  };
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compareCanonicalStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareCanonicalStrings);
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
    .sort(compareCanonicalStrings)
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
  for (const id of [...before.keys()].filter((value) => after.has(value)).sort(compareCanonicalStrings)) {
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

function buildReceiptEventViews(plan: GamificationReconciliationPlan) {
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
  return { beforeEvents, afterEvents };
}

function buildReceiptProgressionViews(
  beforeEvents: GamificationEventChange[],
  afterEvents: GamificationEventChange[],
) {
  const beforeProgressions = progressionState(beforeEvents);
  const afterProgressions = progressionState(afterEvents);
  return {
    progressionAdded: [...afterProgressions.keys()]
      .filter((id) => !beforeProgressions.has(id))
      .sort(compareCanonicalStrings),
    progressionRemoved: [...beforeProgressions.keys()]
      .filter((id) => !afterProgressions.has(id))
      .sort(compareCanonicalStrings),
    changed: progressionChanges(beforeProgressions, afterProgressions),
  };
}

function buildReceiptXpAndLevel(plan: GamificationReconciliationPlan) {
  return {
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
  };
}

function buildReceiptProgressions(
  progressionAdded: string[],
  progressionRemoved: string[],
  changed: GamificationProgressionReceiptChange[],
) {
  return {
    added: progressionAdded.map((id) => ({ id })),
    removed: progressionRemoved.map((id) => ({ id })),
    changed,
  };
}

function buildReceiptBadges(
  plan: GamificationReconciliationPlan,
  beforeEvents: GamificationEventChange[],
  afterEvents: GamificationEventChange[],
  changed: GamificationProgressionReceiptChange[],
) {
  const gradeChanges = badgeGradeChanges(changed);
  return {
    unlocked: plan.badgesAdded.map((id) => badgeRef(id, afterEvents)),
    removed: plan.badgesRemoved.map((id) => badgeRef(id, beforeEvents)),
    upgraded: gradeChanges.upgraded,
    downgraded: gradeChanges.downgraded,
  };
}

function buildReceiptWithVisibility(
  plan: GamificationReconciliationPlan,
  options: {
    occurredAt?: string;
    reasonCategory?: GamificationReconciliationReasonCategory;
    reconciliationId?: string;
    rules?: GamificationRulesV1;
  },
  beforeEvents: GamificationEventChange[],
  afterEvents: GamificationEventChange[],
  progressionAdded: string[],
  progressionRemoved: string[],
  changed: GamificationProgressionReceiptChange[],
) {
  const { xp, level } = buildReceiptXpAndLevel(plan);
  const receiptWithoutVisibility = {
    reconciliationId: options.reconciliationId ?? receiptId(plan),
    userId: plan.userId,
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    previousRulesVersion: plan.rulesVersionBefore,
    currentRulesVersion: plan.rulesVersionAfter,
    previousRulesRevision: plan.rulesRevisionBefore,
    currentRulesRevision: plan.rulesRevisionAfter,
    xp,
    level,
    progressions: buildReceiptProgressions(progressionAdded, progressionRemoved, changed),
    badges: buildReceiptBadges(plan, beforeEvents, afterEvents, changed),
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
  const { beforeEvents, afterEvents } = buildReceiptEventViews(plan);
  const { progressionAdded, progressionRemoved, changed } =
    buildReceiptProgressionViews(beforeEvents, afterEvents);
  return buildReceiptWithVisibility(
    plan,
    options,
    beforeEvents,
    afterEvents,
    progressionAdded,
    progressionRemoved,
    changed,
  );
}

function isScientificImpactReceiptIntent(value: unknown): value is ScientificImpactReceiptIntent {
  if (!isRecord(value) || value.kind !== "scientific_impact_reconciliation_pending" || value.schemaVersion !== 1) {
    return false;
  }
  const impact = value.scientificImpact;
  return typeof value.reconciliationId === "string"
    && typeof value.userId === "string"
    && isRecord(impact)
    && typeof impact.methodVersion === "string"
    && typeof impact.sourceFingerprint === "string"
    && [impact.eventsAdded, impact.eventsUpdated, impact.eventsRemoved]
      .every((count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0);
}

function finalReceiptFromPayload(
  payload: unknown,
  userId: string,
): GamificationReconciliationReceipt | null {
  if (!isRecord(payload) || payload.kind !== "gamification_reconciliation_receipt") return null;
  const receipt = payload.receipt;
  if (!isRecord(receipt) || receipt.userId !== userId || receipt.hasUserVisibleChanges !== true) return null;
  return receipt as unknown as GamificationReconciliationReceipt;
}

type ReconciliationNotificationRecord = {
  id?: unknown;
  payload?: unknown;
};

async function findReconciliationNotification(
  supabase: SupabaseClient,
  userId: string,
  reconciliationId: string,
): Promise<{
  id: string;
  payload: unknown;
  pendingIntent: ScientificImpactReceiptIntent | null;
  receipt: GamificationReconciliationReceipt | null;
} | null> {
  const result = await supabase
    .from("app_notifications")
    .select("id, payload")
    .eq("user_id", userId)
    .eq("type", "gamification_reconciliation")
    .eq("payload->>reconciliationId", reconciliationId)
    .limit(2);
  if (result.error) throw new Error(result.error.message);

  for (const row of (result.data ?? []) as ReconciliationNotificationRecord[]) {
    if (typeof row.id !== "string" || !isRecord(row.payload)) continue;
    const payload = row.payload;
    if (payload.reconciliationId !== reconciliationId) continue;
    const pendingIntent = isScientificImpactReceiptIntent(payload) ? payload : null;
    const receipt = finalReceiptFromPayload(payload, userId);
    if (pendingIntent || receipt) {
      return { id: row.id, payload, pendingIntent, receipt };
    }
  }
  return null;
}

function scientificImpactMatches(
  left: GamificationReconciliationReceipt["scientificImpact"] | ScientificImpactReceiptIntent["scientificImpact"] | undefined,
  right: GamificationReconciliationReceipt["scientificImpact"] | ScientificImpactReceiptIntent["scientificImpact"] | undefined,
): boolean {
  if (!left || !right) return false;
  return left.methodVersion === right.methodVersion &&
    left.sourceFingerprint === right.sourceFingerprint &&
    left.eventsAdded === right.eventsAdded &&
    left.eventsUpdated === right.eventsUpdated &&
    left.eventsRemoved === right.eventsRemoved;
}

export async function loadPendingScientificImpactReceipt(
  supabase: SupabaseClient,
  userId: string,
  reconciliationId: string,
  legacyReconciliationIds: readonly string[] = [],
): Promise<ScientificImpactReceiptIntent | null> {
  const identities = [...new Set([reconciliationId, ...legacyReconciliationIds])];
  for (const identity of identities) {
    const existing = await findReconciliationNotification(supabase, userId, identity);
    if (existing?.pendingIntent) return existing.pendingIntent;
  }
  return null;
}

function finalReceiptPayload(receipt: GamificationReconciliationReceipt) {
  return {
    kind: "gamification_reconciliation_receipt",
    schemaVersion: 2,
    reconciliationId: receipt.reconciliationId,
    receipt,
  };
}

export async function persistGamificationReconciliationReceipt(
  supabase: SupabaseClient,
  receipt: GamificationReconciliationReceipt,
): Promise<void> {
  if (!receipt.hasUserVisibleChanges) return;
  const payload = finalReceiptPayload(receipt);
  const insertResult = await supabase.from("app_notifications").insert({
    user_id: receipt.userId,
    type: "gamification_reconciliation",
    title: "Votre progression CleanMyMap a été mise à jour.",
    content: "Voir les changements sur la page Gamification.",
    created_at: receipt.occurredAt,
    seen_at: null,
    acknowledged_at: null,
    payload,
  });
  if (!insertResult.error) return;
  if (insertResult.error.code !== "23505") throw new Error(insertResult.error.message);

  const existing = await findReconciliationNotification(
    supabase,
    receipt.userId,
    receipt.reconciliationId,
  );
  if (!existing) {
    throw new Error("Le reçu scientifique existant est introuvable après un conflit d'identité.");
  }
  if (existing.receipt) {
    if (
      existing.receipt.reconciliationId !== receipt.reconciliationId ||
      existing.receipt.userId !== receipt.userId ||
      receipt.scientificImpact && !scientificImpactMatches(existing.receipt.scientificImpact, receipt.scientificImpact)
    ) {
      throw new Error("Le reçu scientifique final concurrent ne correspond pas à l'intention demandée.");
    }
    return;
  }
  if (
    !existing.pendingIntent ||
    existing.pendingIntent.reconciliationId !== receipt.reconciliationId ||
    existing.pendingIntent.userId !== receipt.userId ||
    !scientificImpactMatches(existing.pendingIntent.scientificImpact, receipt.scientificImpact)
  ) {
    throw new Error("L'intention scientifique existante ne correspond pas au reçu à finaliser.");
  }
  const updateResult = await supabase
    .from("app_notifications")
    .update({
      title: "Votre progression CleanMyMap a été mise à jour.",
      content: "Voir les changements sur la page Gamification.",
      payload,
    })
    .eq("id", existing.id)
    .eq("user_id", receipt.userId)
    .eq("type", "gamification_reconciliation")
    .eq("payload->>kind", "scientific_impact_reconciliation_pending")
    .eq("payload->>userId", receipt.userId)
    .eq("payload->>reconciliationId", receipt.reconciliationId)
    .select("id");
  if (updateResult.error) throw new Error(updateResult.error.message);
  const updatedCount = updateResult.data?.length ?? 0;
  if (updatedCount === 1) return;
  if (updatedCount !== 0) {
    throw new Error("La finalisation du reçu scientifique a modifié un nombre de lignes inattendu.");
  }

  const winner = await findReconciliationNotification(
    supabase,
    receipt.userId,
    receipt.reconciliationId,
  );
  if (
    winner?.receipt &&
    winner.receipt.reconciliationId === receipt.reconciliationId &&
    winner.receipt.userId === receipt.userId &&
    receipt.scientificImpact &&
    scientificImpactMatches(winner.receipt.scientificImpact, receipt.scientificImpact)
  ) {
    return;
  }
  throw new Error("La finalisation du reçu scientifique a perdu sa transition conditionnelle.");
}
