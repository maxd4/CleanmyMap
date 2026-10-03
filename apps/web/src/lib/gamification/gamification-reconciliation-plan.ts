import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCurrentLevel } from "./progression-formulas";
import { loadUserProgressionStats } from "./progression-data";
import { loadCurrentGamificationFacts } from "./gamification-facts-loader";
import { GAMIFICATION_RULES_V1, type GamificationRulesV1 } from "./gamification-rules";
import {
  computeExpectedGamificationState,
  type ExpectedGamificationEvent,
  type ExpectedGamificationState,
  type GamificationFacts,
} from "./gamification-reconstruction";
import type { ProgressionEventType } from "./progression-types";
import type { UserProgressionStats } from "./progression-types";

export type PersistedGamificationEvent = {
  id: string | number;
  event_type: ProgressionEventType;
  source_table: string;
  source_id: string;
  status_phase: "pending" | "validated" | "rejected";
  weight: number;
  xp_base: number;
  xp_awarded: number;
  occurred_on: string;
  metadata: unknown;
};

export type GamificationReconciliationProfile = {
  xp_total: number | null;
  xp_validated: number | null;
  current_level: number | null;
  potential_level: number | null;
  current_applied_rules_revision?: number | null;
  last_acknowledged_rules_revision?: number | null;
};

export type GamificationEventChange = {
  id?: string | number;
  logicalId: string;
  sourceTable: string;
  sourceId: string;
  eventType: string;
  xpAwarded: number;
  rulesVersion?: string;
  metadata?: Record<string, unknown>;
};

export type GamificationReconciliationPlan = {
  userId: string;
  rulesVersionBefore: string | null | "mixed";
  rulesVersionAfter: string;
  rulesRevisionBefore: number | null;
  rulesRevisionAfter: number;
  xpBefore: number;
  xpExpected: number;
  xpDelta: number;
  levelBefore: number | null;
  levelAfter: number | null;
  eventsToAdd: GamificationEventChange[];
  eventsToUpdate: GamificationEventChange[];
  eventsToRemove: GamificationEventChange[];
  badgesAdded: string[];
  badgesRemoved: string[];
  milestonesAdded: string[];
  milestonesRemoved: string[];
  currentEventCountBefore: number;
  legacyEventCountPreserved: number;
  expected: ExpectedGamificationState;
  currentPersisted: PersistedGamificationEvent[];
};

export type GamificationReconciliationSnapshot = {
  facts: GamificationFacts;
  expected: ExpectedGamificationState;
  persisted: PersistedGamificationEvent[];
  profile: GamificationReconciliationProfile | null;
  stats: UserProgressionStats;
  plan: GamificationReconciliationPlan;
};

const CURRENT_SOURCE_TABLES = new Set([
  "actions",
  "action_milestones",
  "action_participants",
  "user_visited_places",
  "quiz_type_progress",
  "quiz_type_balance_progress",
  "clean_zones",
  "trash_spotter_spots",
  "admin_operations_audit",
  "referral_contributions",
  "action_geometry_contributions",
]);

export function asGamificationMetadata(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function eventIdentity(
  userId: string,
  event: Pick<PersistedGamificationEvent, "event_type" | "source_table" | "source_id" | "status_phase" | "metadata">,
): string {
  const metadata = asGamificationMetadata(event.metadata);
  if (typeof metadata.logicalId === "string" && metadata.logicalId.length > 0) {
    return metadata.logicalId;
  }
  const mechanicId = typeof metadata.mechanicId === "string"
    ? metadata.mechanicId
    : event.event_type;
  const threshold = typeof metadata.threshold === "number" ? metadata.threshold : "";
  return [userId, mechanicId, event.source_table, event.source_id, threshold, event.status_phase].join(":");
}

function isCurrentOwnedEvent(
  event: PersistedGamificationEvent,
  rules: GamificationRulesV1,
): boolean {
  const metadata = asGamificationMetadata(event.metadata);
  if (metadata.gamificationEngine === "CURRENT_RECONCILABLE") return true;
  const rule = rules.mechanics.find((candidate) => candidate.eventType === event.event_type);
  return Boolean(rule && rule.category !== "NON_GAMIFIED" && CURRENT_SOURCE_TABLES.has(event.source_table));
}

function eventsDiffer(left: PersistedGamificationEvent, right: ExpectedGamificationEvent): boolean {
  return left.event_type !== right.eventType ||
    left.source_table !== right.sourceTable ||
    left.source_id !== right.sourceId ||
    left.status_phase !== right.statusPhase ||
    Number(left.xp_base) !== right.xpBase ||
    Number(left.xp_awarded) !== right.xpAwarded ||
    left.occurred_on !== right.occurredOn ||
    JSON.stringify(asGamificationMetadata(left.metadata)) !== JSON.stringify(right.metadata);
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sumEvents(events: readonly PersistedGamificationEvent[], validatedOnly = false): number {
  return events.reduce((sum, event) => {
    if (validatedOnly && event.status_phase !== "validated") return sum;
    return sum + finiteNumber(event.xp_awarded);
  }, 0);
}

function changeFromExpected(event: ExpectedGamificationEvent): GamificationEventChange {
  return {
    logicalId: event.logicalId,
    sourceTable: event.sourceTable,
    sourceId: event.sourceId,
    eventType: event.eventType,
    xpAwarded: event.xpAwarded,
    rulesVersion: typeof event.metadata.rulesVersion === "string"
      ? event.metadata.rulesVersion
      : undefined,
    metadata: event.metadata,
  };
}

function changeFromPersisted(
  userId: string,
  event: PersistedGamificationEvent,
): GamificationEventChange {
  const metadata = asGamificationMetadata(event.metadata);
  return {
    id: event.id,
    logicalId: eventIdentity(userId, event),
    sourceTable: event.source_table,
    sourceId: event.source_id,
    eventType: event.event_type,
    xpAwarded: finiteNumber(event.xp_awarded),
    rulesVersion: typeof metadata.rulesVersion === "string" ? metadata.rulesVersion : undefined,
    metadata,
  };
}

function versionsBefore(
  events: readonly PersistedGamificationEvent[],
): string | null | "mixed" {
  const versions = new Set(
    events
      .map((event) => asGamificationMetadata(event.metadata).rulesVersion)
      .filter((version): version is string => typeof version === "string" && version.length > 0),
  );
  if (versions.size === 0) return null;
  if (versions.size === 1) return [...versions][0] ?? null;
  return "mixed";
}

function expectedMilestoneIds(expected: ExpectedGamificationState): string[] {
  return [...new Set(expected.expectedMilestones.map((event) => event.milestoneId ?? event.mechanicId))].sort();
}

function persistedBadgeIds(
  current: readonly PersistedGamificationEvent[],
  rules: GamificationRulesV1,
): string[] {
  const ids = new Set<string>();
  for (const event of current) {
    const metadata = asGamificationMetadata(event.metadata);
    const badgeId = metadata.badgeId;
    if (typeof badgeId === "string" && badgeId.length > 0) ids.add(badgeId);
    const rule = rules.mechanics.find((candidate) => candidate.eventType === event.event_type);
    if (rule?.badgeId) ids.add(rule.badgeId);
  }
  return [...ids].sort();
}

function persistedMilestoneIds(
  current: readonly PersistedGamificationEvent[],
  rules: GamificationRulesV1,
): string[] {
  const ids = new Set<string>();
  for (const event of current) {
    const metadata = asGamificationMetadata(event.metadata);
    const rule = rules.mechanics.find((candidate) => candidate.eventType === event.event_type);
    const milestoneId = metadata.milestoneId;
    if (typeof milestoneId === "string" && milestoneId.length > 0) {
      ids.add(milestoneId);
      continue;
    }
    if (rule?.category !== "XP_MILESTONE" && rule?.category !== "BADGE_ONLY") continue;
    ids.add(typeof milestoneId === "string" && milestoneId.length > 0
      ? milestoneId
      : rule?.milestoneId ?? rule?.mechanicId ?? event.event_type);
  }
  return [...ids].sort();
}

function difference(left: readonly string[], right: readonly string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value)).sort();
}

function levelsForPlan(
  params: {
    profile?: GamificationReconciliationProfile | null;
    stats?: UserProgressionStats | null;
  },
  validatedBefore: number,
  validatedExpected: number,
): { levelBefore: number; levelAfter: number } {
  const levelBefore = params.profile?.current_level ?? (
    params.stats ? computeCurrentLevel(validatedBefore, params.stats) : 1
  );
  const levelAfter = params.stats
    ? computeCurrentLevel(validatedExpected, params.stats)
    : params.profile?.current_level ?? 1;
  return { levelBefore, levelAfter };
}

/** Builds a deterministic, read-only diff. It never touches Supabase. */
export function buildGamificationReconciliationPlan(params: {
  userId: string;
  rules: GamificationRulesV1;
  expected: ExpectedGamificationState;
  persisted: readonly PersistedGamificationEvent[];
  profile?: GamificationReconciliationProfile | null;
  stats?: UserProgressionStats | null;
}): GamificationReconciliationPlan {
  const currentPersisted = params.persisted.filter((event) => isCurrentOwnedEvent(event, params.rules));
  const byIdentity = new Map<string, PersistedGamificationEvent>();
  const eventsToRemove: GamificationEventChange[] = [];

  for (const event of currentPersisted) {
    const identity = eventIdentity(params.userId, event);
    if (byIdentity.has(identity)) {
      eventsToRemove.push(changeFromPersisted(params.userId, event));
      continue;
    }
    byIdentity.set(identity, event);
  }

  const eventsToAdd: GamificationEventChange[] = [];
  const eventsToUpdate: GamificationEventChange[] = [];
  for (const expectedEvent of params.expected.events) {
    const existing = byIdentity.get(expectedEvent.logicalId);
    if (!existing) {
      eventsToAdd.push(changeFromExpected(expectedEvent));
    } else if (eventsDiffer(existing, expectedEvent)) {
      eventsToUpdate.push({ ...changeFromExpected(expectedEvent), id: existing.id });
    }
  }

  const expectedIds = new Set(params.expected.events.map((event) => event.logicalId));
  for (const event of byIdentity.values()) {
    const identity = eventIdentity(params.userId, event);
    if (!expectedIds.has(identity)) eventsToRemove.push(changeFromPersisted(params.userId, event));
  }

  const legacy = params.persisted.filter((event) => !isCurrentOwnedEvent(event, params.rules));
  const xpBefore = sumEvents(params.persisted);
  const xpExpected = sumEvents(legacy) + params.expected.events.reduce((sum, event) => sum + event.xpAwarded, 0);
  const validatedBefore = sumEvents(params.persisted, true);
  const validatedExpected = sumEvents(legacy, true) + params.expected.events
    .filter((event) => event.statusPhase === "validated")
    .reduce((sum, event) => sum + event.xpAwarded, 0);
  const { levelBefore, levelAfter } = levelsForPlan(
    params,
    validatedBefore,
    validatedExpected,
  );
  const beforeBadges = persistedBadgeIds(currentPersisted, params.rules);
  const afterBadges = [...params.expected.expectedBadges].sort();
  const beforeMilestones = persistedMilestoneIds(currentPersisted, params.rules);
  const afterMilestones = expectedMilestoneIds(params.expected);

  return {
    userId: params.userId,
    rulesVersionBefore: versionsBefore(currentPersisted),
    rulesVersionAfter: params.rules.version,
    rulesRevisionBefore: params.profile?.current_applied_rules_revision ?? null,
    rulesRevisionAfter: params.rules.rulesRevision,
    xpBefore,
    xpExpected,
    xpDelta: xpExpected - xpBefore,
    levelBefore,
    levelAfter,
    eventsToAdd,
    eventsToUpdate,
    eventsToRemove,
    badgesAdded: difference(afterBadges, beforeBadges),
    badgesRemoved: difference(beforeBadges, afterBadges),
    milestonesAdded: difference(afterMilestones, beforeMilestones),
    milestonesRemoved: difference(beforeMilestones, afterMilestones),
    currentEventCountBefore: currentPersisted.length,
    legacyEventCountPreserved: legacy.length,
    expected: params.expected,
    currentPersisted,
  };
}

export async function loadPersistedGamificationEvents(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersistedGamificationEvent[]> {
  const result = await supabase
    .from("progression_events")
    .select("id, event_type, source_table, source_id, status_phase, weight, xp_base, xp_awarded, occurred_on, metadata")
    .eq("user_id", userId)
    .limit(10000);
  if (result.error) throw new Error(result.error.message);
  return [...(result.data ?? [])] as PersistedGamificationEvent[];
}

async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationReconciliationProfile | null> {
  const result = await supabase
    .from("progression_profiles")
    .select("xp_total, xp_validated, current_level, potential_level, current_applied_rules_revision, last_acknowledged_rules_revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as GamificationReconciliationProfile | null;
}

/** Read-only snapshot used by dry-runs and by the administrator runner. */
export async function loadGamificationReconciliationSnapshot(
  supabase: SupabaseClient,
  userId: string,
  rules: GamificationRulesV1 = GAMIFICATION_RULES_V1,
): Promise<GamificationReconciliationSnapshot> {
  const [facts, persisted, profile, stats] = await Promise.all([
    loadCurrentGamificationFacts(supabase, userId),
    loadPersistedGamificationEvents(supabase, userId),
    loadProfile(supabase, userId),
    loadUserProgressionStats(supabase, userId),
  ]);
  const expected = computeExpectedGamificationState(userId, facts, rules);
  const plan = buildGamificationReconciliationPlan({
    userId,
    rules,
    expected,
    persisted,
    profile,
    stats,
  });
  return { facts, expected, persisted, profile, stats, plan };
}
