import type { SupabaseClient } from "@supabase/supabase-js";
import { insertProgressionEvent } from "./progression-data";
import { loadCurrentGamificationFacts } from "./gamification-facts-loader";
import { GamificationRulesV1, GAMIFICATION_RULES_V1 } from "./gamification-rules";
import {
  computeExpectedGamificationState,
  type ExpectedGamificationEvent,
  type GamificationFacts,
} from "./gamification-reconstruction";
import type { ProgressionEventType } from "./progression-types";

type PersistedEvent = {
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

export type GamificationReconciliationResult = {
  inserted: number;
  updated: number;
  removed: number;
  preservedLegacy: number;
  expectedEvents: number;
  expectedBadges: string[];
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
]);

function asMetadata(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function eventIdentity(userId: string, event: Pick<PersistedEvent, "event_type" | "source_table" | "source_id" | "status_phase" | "metadata">): string {
  const metadata = asMetadata(event.metadata);
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
  event: PersistedEvent,
  rules: GamificationRulesV1,
): boolean {
  const metadata = asMetadata(event.metadata);
  if (metadata.gamificationEngine === "CURRENT_RECONCILABLE") return true;
  const rule = rules.mechanics.find((candidate) => candidate.eventType === event.event_type);
  return Boolean(rule && rule.category !== "NON_GAMIFIED" && CURRENT_SOURCE_TABLES.has(event.source_table));
}

async function loadPersistedEvents(supabase: SupabaseClient, userId: string): Promise<PersistedEvent[]> {
  const result = await supabase
    .from("progression_events")
    .select("id, event_type, source_table, source_id, status_phase, weight, xp_base, xp_awarded, occurred_on, metadata")
    .eq("user_id", userId)
    .limit(10000);
  if (result.error) throw new Error(result.error.message);
  return [...(result.data ?? [])] as PersistedEvent[];
}

function differs(left: PersistedEvent, right: ExpectedGamificationEvent): boolean {
  return left.event_type !== right.eventType ||
    left.source_table !== right.sourceTable ||
    left.source_id !== right.sourceId ||
    left.status_phase !== right.statusPhase ||
    Number(left.xp_base) !== right.xpBase ||
    Number(left.xp_awarded) !== right.xpAwarded ||
    left.occurred_on !== right.occurredOn ||
    JSON.stringify(asMetadata(left.metadata)) !== JSON.stringify(right.metadata);
}

/** Rebuild CURRENT derived events from canonical facts; LEGACY rows are untouched. */
export async function reconcileUserGamification(
  supabase: SupabaseClient,
  userId: string,
  options: { facts?: GamificationFacts; rules?: GamificationRulesV1; refreshProfile?: boolean } = {},
): Promise<GamificationReconciliationResult> {
  const rules = options.rules ?? GAMIFICATION_RULES_V1;
  const facts = options.facts ?? await loadCurrentGamificationFacts(supabase, userId);
  const expected = computeExpectedGamificationState(userId, facts, rules);
  const persisted = await loadPersistedEvents(supabase, userId);
  const current = persisted.filter((event) => isCurrentOwnedEvent(event, rules));
  const byIdentity = new Map<string, PersistedEvent>();
  let removed = 0;

  for (const event of current) {
    const identity = eventIdentity(userId, event);
    const previous = byIdentity.get(identity);
    if (previous) {
      const result = await supabase.from("progression_events").delete().eq("id", event.id);
      if (result.error) throw new Error(result.error.message);
      removed += 1;
    } else {
      byIdentity.set(identity, event);
    }
  }

  let inserted = 0;
  let updated = 0;
  for (const event of expected.events) {
    const existing = byIdentity.get(event.logicalId);
    if (!existing) {
      const didInsert = await insertProgressionEvent(supabase, {
        userId,
        eventType: event.eventType as ProgressionEventType,
        sourceTable: event.sourceTable,
        sourceId: event.sourceId,
        statusPhase: event.statusPhase,
        weight: event.weight,
        xpBase: event.xpBase,
        xpAwarded: event.xpAwarded,
        occurredOn: event.occurredOn,
        metadata: event.metadata,
      });
      inserted += Number(didInsert);
      continue;
    }
    if (!differs(existing, event)) continue;
    const result = await supabase.from("progression_events").update({
      event_type: event.eventType,
      source_table: event.sourceTable,
      source_id: event.sourceId,
      status_phase: event.statusPhase,
      weight: event.weight,
      xp_base: event.xpBase,
      xp_awarded: event.xpAwarded,
      occurred_on: event.occurredOn,
      metadata: event.metadata,
    }).eq("id", existing.id);
    if (result.error) throw new Error(result.error.message);
    updated += 1;
  }

  const expectedIds = new Set(expected.events.map((event) => event.logicalId));
  for (const event of byIdentity.values()) {
    if (expectedIds.has(eventIdentity(userId, event))) continue;
    const result = await supabase.from("progression_events").delete().eq("id", event.id);
    if (result.error) throw new Error(result.error.message);
    removed += 1;
  }

  if (options.refreshProfile !== false) {
    const { refreshProgressionProfile } = await import("./progression-tracking");
    await refreshProgressionProfile(supabase, userId, { reconcileLegacyImpact: false });
  }

  return {
    inserted,
    updated,
    removed,
    preservedLegacy: persisted.length - current.length,
    expectedEvents: expected.events.length,
    expectedBadges: expected.expectedBadges,
  };
}
