import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultCommunityEventOps, parseCommunityEventDescription } from "@/lib/community/event-ops";
import { computeCurrentLevel, computePotentialLevel } from "./progression-formulas";
import {
  fetchActionById,
  fetchSpotById,
  insertProgressionEvent,
  loadUserProgressionStats,
} from "./progression-data";
import type { ProgressionStatusPhase } from "./progression-types";
import {
  computeActionPendingAward,
  computeActionValidationAward,
  evaluateActionQualityScore,
  inferActionWeight,
  toInt,
  toIsoDate,
} from "./progression-utils";

export async function refreshProgressionProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const [eventsResult, stats] = await Promise.all([
    supabase
      .from("progression_events")
      .select("status_phase, xp_awarded")
      .eq("user_id", userId)
      .limit(12000),
    loadUserProgressionStats(supabase, userId),
  ]);

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const rows =
    (eventsResult.data as Array<{ status_phase: ProgressionStatusPhase; xp_awarded: number }>) ??
    [];

  let xpTotal = 0;
  let xpPending = 0;
  let xpValidated = 0;

  for (const row of rows) {
    const xp = toInt(row.xp_awarded, 0);
    xpTotal += xp;
    if (row.status_phase === "pending") {
      xpPending += xp;
    }
    if (row.status_phase === "validated") {
      xpValidated += xp;
    }
  }

  const potentialLevel = computePotentialLevel(xpTotal);
  const currentLevel = computeCurrentLevel(xpTotal, stats);

  const upsert = await supabase.from("progression_profiles").upsert(
    {
      user_id: userId,
      xp_total: xpTotal,
      xp_pending: xpPending,
      xp_validated: xpValidated,
      current_level: currentLevel,
      potential_level: potentialLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsert.error) {
    throw new Error(upsert.error.message);
  }
}

export async function trackActionCreated(
  supabase: SupabaseClient,
  params: { userId: string; actionId: string },
): Promise<void> {
  const action = await fetchActionById(supabase, params.actionId);
  if (!action) {
    return;
  }

  const weight = inferActionWeight(action);
  const award = computeActionPendingAward(weight);

  const inserted = await insertProgressionEvent(supabase, {
    userId: params.userId,
    eventType: "action_declare_pending",
    sourceTable: "actions",
    sourceId: action.id,
    statusPhase: "pending",
    weight,
    xpBase: award.xpBase,
    xpAwarded: award.xpAwarded,
    occurredOn: toIsoDate(action.action_date || action.created_at),
    metadata: {
      locationLabel: action.location_label,
      durationMinutes: action.duration_minutes,
      wasteKg: action.waste_kg,
    },
  });

  if (inserted) {
    await refreshProgressionProfile(supabase, params.userId);
  }
}

export async function trackActionValidationBonus(
  supabase: SupabaseClient,
  params: { actionId: string },
): Promise<void> {
  const action = await fetchActionById(supabase, params.actionId);
  if (!action || action.status !== "approved") {
    return;
  }

  const quality = evaluateActionQualityScore(action);
  const weight = inferActionWeight(action);
  const award = computeActionValidationAward(weight, quality.grade);

  const inserted = await insertProgressionEvent(supabase, {
    userId: action.created_by_clerk_id,
    eventType: "action_declare_validation",
    sourceTable: "actions",
    sourceId: action.id,
    statusPhase: "validated",
    weight,
    xpBase: award.xpBase,
    xpAwarded: award.xpAwarded,
    occurredOn: new Date().toISOString().slice(0, 10),
    metadata: {
      qualityGrade: quality.grade,
      qualityScore: quality.score,
    },
  });

  if (inserted) {
    await refreshProgressionProfile(supabase, action.created_by_clerk_id);
  }
}

export async function trackSpotCreated(
  supabase: SupabaseClient,
  params: { userId: string; spotId: string },
): Promise<void> {
  const spot = await fetchSpotById(supabase, params.spotId);
  if (!spot) {
    return;
  }

  const xpBase = 20;
  const inserted = await insertProgressionEvent(supabase, {
    userId: params.userId,
    eventType: "spot_create_pending",
    sourceTable: "spots",
    sourceId: spot.id,
    statusPhase: "pending",
    weight: 2,
    xpBase,
    xpAwarded: Math.round(xpBase * 0.4),
    occurredOn: toIsoDate(spot.created_at),
    metadata: { label: spot.label },
  });

  if (inserted) {
    await refreshProgressionProfile(supabase, params.userId);
  }
}

export async function trackSpotValidationBonus(
  supabase: SupabaseClient,
  params: { spotId: string },
): Promise<void> {
  const spot = await fetchSpotById(supabase, params.spotId);
  if (!spot || (spot.status !== "validated" && spot.status !== "cleaned")) {
    return;
  }

  const inserted = await insertProgressionEvent(supabase, {
    userId: spot.created_by_clerk_id,
    eventType: "spot_validation_bonus",
    sourceTable: "spots",
    sourceId: spot.id,
    statusPhase: "validated",
    weight: 3,
    xpBase: 30,
    xpAwarded: 30,
    occurredOn: new Date().toISOString().slice(0, 10),
    metadata: { status: spot.status },
  });

  if (inserted) {
    await refreshProgressionProfile(supabase, spot.created_by_clerk_id);
  }
}

export async function trackCommunityRsvpYes(
  supabase: SupabaseClient,
  params: { userId: string; eventId: string; occurredOn?: string },
): Promise<void> {
  const xpBase = 20;
  const inserted = await insertProgressionEvent(supabase, {
    userId: params.userId,
    eventType: "collective_rsvp_yes_pending",
    sourceTable: "event_rsvps",
    sourceId: `${params.eventId}:${params.userId}`,
    statusPhase: "pending",
    weight: 2,
    xpBase,
    xpAwarded: Math.round(xpBase * 0.4),
    occurredOn: toIsoDate(params.occurredOn),
    metadata: { eventId: params.eventId },
  });

  if (inserted) {
    await refreshProgressionProfile(supabase, params.userId);
  }
}

export async function trackCommunityOpsUpdate(
  supabase: SupabaseClient,
  params: {
    userId: string;
    eventId: string;
    attendanceCount: number | null;
    hasPostMortem: boolean;
    occurredOn?: string;
  },
): Promise<void> {
  const operations: Array<Promise<boolean>> = [];
  const occurredOn = toIsoDate(params.occurredOn);

  if (params.hasPostMortem || (params.attendanceCount ?? 0) > 0) {
    operations.push(
      insertProgressionEvent(supabase, {
        userId: params.userId,
        eventType: "community_ops_update",
        sourceTable: "community_events",
        sourceId: params.eventId,
        statusPhase: "validated",
        weight: 2,
        xpBase: 20,
        xpAwarded: 20,
        occurredOn,
        metadata: {
          attendanceCount: params.attendanceCount,
          hasPostMortem: params.hasPostMortem,
        },
      }),
    );
  }

  if ((params.attendanceCount ?? 0) > 0) {
    operations.push(
      insertProgressionEvent(supabase, {
        userId: params.userId,
        eventType: "collective_attendance_confirmed",
        sourceTable: "community_events",
        sourceId: `${params.eventId}:attendance`,
        statusPhase: "validated",
        weight: 3,
        xpBase: 30,
        xpAwarded: 30,
        occurredOn,
        metadata: { attendanceCount: params.attendanceCount },
      }),
    );
  }

  if (operations.length === 0) {
    return;
  }

  const results = await Promise.all(operations);
  if (results.some(Boolean)) {
    await refreshProgressionProfile(supabase, params.userId);
  }
}

export async function trackRouteRecommendationUse(
  supabase: SupabaseClient,
  params: { userId: string; occurredOn?: string },
): Promise<void> {
  const occurredOn = toIsoDate(params.occurredOn);
  const inserted = await insertProgressionEvent(supabase, {
    userId: params.userId,
    eventType: "route_recommend_use",
    sourceTable: "route_recommend",
    sourceId: `${params.userId}:${occurredOn}`,
    statusPhase: "validated",
    weight: 1,
    xpBase: 10,
    xpAwarded: 10,
    occurredOn,
    metadata: {},
  });

  if (inserted) {
    await refreshProgressionProfile(supabase, params.userId);
  }
}

export function extractCommunityOpsFromDescription(description: string | null): {
  hasPostMortem: boolean;
  attendanceCount: number;
} {
  const parsed = parseCommunityEventDescription(description);
  const ops = parsed.ops ?? defaultCommunityEventOps();
  return {
    hasPostMortem: (ops.postMortem ?? "").trim().length >= 20,
    attendanceCount: ops.attendanceCount ?? 0,
  };
}
