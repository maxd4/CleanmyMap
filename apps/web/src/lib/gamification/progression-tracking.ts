import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultCommunityEventOps, parseCommunityEventDescription } from "@/lib/community/event-ops";
import { computeCurrentLevel, computePotentialLevel } from "./progression-formulas";
import {
  fetchActionById,
  fetchSpotById,
  insertProgressionEvent,
  loadUserProgressionStats,
  syncUserActionProgression,
} from "./progression-data";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/organizers";
import type { ProgressionStatusPhase } from "./progression-types";
import {
  toFloat,
  toIsoDate,
} from "./progression-utils";
import { awardPoints } from "./points/system";
import { broadcastGamificationAnnouncement } from "@/lib/gamification/announcements";
import { logFailure } from "@/lib/logging/failure-log";

export { syncUserActionProgression } from "./progression-data";

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
    const xp = toFloat(row.xp_awarded, 0);
    xpTotal += xp;
    if (row.status_phase === "pending") {
      xpPending += xp;
    }
    if (row.status_phase === "validated") {
      xpValidated += xp;
    }
  }

  const potentialLevel = computePotentialLevel(xpValidated);
  const currentLevel = computeCurrentLevel(xpValidated, stats);
  let previousLevel = 1;

  // --- Level Up Detection ---
  try {
    const { data: existingProfile } = await supabase
      .from("progression_profiles")
      .select("current_level")
      .eq("user_id", userId)
      .maybeSingle();

    previousLevel = (existingProfile as any)?.current_level ?? 1;

    const didLevelUp = currentLevel > previousLevel;

    if (didLevelUp) {
      await supabase.from("app_notifications").insert({
        user_id: userId,
        type: "system",
        title: "Niveau Supérieur ! 🏆",
        content: `Félicitations ! Vous avez atteint le niveau ${currentLevel}. Votre impact sur CleanMyMap grandit !`,
        payload: { oldLevel: previousLevel, newLevel: currentLevel },
      });
    }
  } catch (notifError) {
    logFailure("Gamification/LevelUp", "Notification write skipped", notifError, {
      userId,
    });
  }
  // --- End Level Up Detection ---

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

  if (currentLevel > previousLevel) {
    await broadcastGamificationAnnouncement(supabase, {
      type: "level_up",
      userId,
      previousLevel,
      newLevel: currentLevel,
      title: "Niveau Supérieur ! 🏆",
      message: `Félicitations ! Vous avez atteint le niveau ${currentLevel}. Votre impact sur CleanMyMap grandit !`,
      icon: "🏆",
      source: "progression-tracking",
      dedupeKey: `level_up:${userId}:${currentLevel}`,
    });
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

  const organizerIds = await loadActionOrganizerIdsForAction(
    supabase,
    action.id,
    params.userId,
  );
  await Promise.all(
    organizerIds.map(async (organizerId) => {
      await syncUserActionProgression(supabase, organizerId);
      await refreshProgressionProfile(supabase, organizerId);
    }),
  );
}

export async function trackActionValidationBonus(
  supabase: SupabaseClient,
  params: { actionId: string },
): Promise<void> {
  const action = await fetchActionById(supabase, params.actionId);
  if (!action || action.status !== "approved") {
    return;
  }

  const organizerIds = await loadActionOrganizerIdsForAction(
    supabase,
    action.id,
    action.created_by_clerk_id,
  );
  await Promise.all(
    organizerIds.map(async (organizerId) => {
      await syncUserActionProgression(supabase, organizerId);
      await refreshProgressionProfile(supabase, organizerId);
    }),
  );
}

export async function trackActionRejection(
  supabase: SupabaseClient,
  params: { actionId: string },
): Promise<void> {
  const action = await fetchActionById(supabase, params.actionId);
  if (!action || action.status !== "rejected") {
    return;
  }

  const organizerIds = await loadActionOrganizerIdsForAction(
    supabase,
    action.id,
    action.created_by_clerk_id,
  );

  await Promise.all(
    organizerIds.map(async (organizerId) => {
      await syncUserActionProgression(supabase, organizerId);
      await refreshProgressionProfile(supabase, organizerId);
    }),
  );
}

export async function trackSpotCreated(
  supabase: SupabaseClient,
  params: { userId: string; spotId: string },
): Promise<void> {
  const spot = await fetchSpotById(supabase, params.spotId);
  if (!spot) {
    return;
  }

  const xpBase = 0;
  const inserted = await insertProgressionEvent(supabase, {
    userId: params.userId,
    eventType: "spot_create_pending",
    sourceTable: "trash_spotter_spots",
    sourceId: spot.id,
    statusPhase: "pending",
    weight: 2,
    xpBase,
    xpAwarded: 0,
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

  // Award points for spot validation
  await awardPoints(supabase, {
    userId: spot.created_by_clerk_id,
    xpEarned: 30,
    sourceEvent: "spot_validated",
    sourceId: spot.id,
    reason: `Lieu propre validé: ${spot.label}`,
  });

  const inserted = await insertProgressionEvent(supabase, {
    userId: spot.created_by_clerk_id,
    eventType: "spot_validation_bonus",
    sourceTable: "trash_spotter_spots",
    sourceId: spot.id,
    statusPhase: "validated",
    weight: 3,
    xpBase: 0.5,
    xpAwarded: 0.5,
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
  const xpBase = 0;
  const inserted = await insertProgressionEvent(supabase, {
    userId: params.userId,
    eventType: "collective_rsvp_yes_pending",
    sourceTable: "event_rsvps",
    sourceId: `${params.eventId}:${params.userId}`,
    statusPhase: "pending",
    weight: 2,
    xpBase,
    xpAwarded: 0,
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
        xpBase: 2,
        xpAwarded: 2,
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
        xpBase: 2,
        xpAwarded: 2,
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
    xpBase: 1,
    xpAwarded: 1,
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

export async function trackNewPlaceVisited(
  supabase: SupabaseClient,
  params: { userId: string; locationLabel: string; occurredOn?: string }
): Promise<void> {
  const normalizedLabel = params.locationLabel.trim().toLowerCase();
  if (!normalizedLabel) return;
  
  // 1. Insert in user_visited_places
  const { error } = await supabase
    .from("user_visited_places")
    .insert({ user_id: params.userId, place_label: normalizedLabel });
    
  if (error && error.code !== "23505" && error.code !== "23503") { // Ignore unique constraint & fkey if badge totals doesn't exist yet
    logFailure("Gamification/Progression", "Visited place insert failed", error, {
      userId: params.userId,
      placeLabel: normalizedLabel,
    });
    return;
  }
  
  // If successfully inserted (no error), it's a new place
  if (!error) {
    const occurredOn = toIsoDate(params.occurredOn);
    
    // Check total new places count
    const { count } = await supabase
      .from("user_visited_places")
      .select("*", { count: "exact", head: true })
      .eq("user_id", params.userId);

    const placesCount = count ?? 1;

    // +5 points for every new place
    await awardPoints(supabase, {
      userId: params.userId,
      xpEarned: 5,
      sourceEvent: "new_place_discovered",
      sourceId: `${params.userId}:${normalizedLabel}`,
      reason: `Nouveau lieu découvert: ${params.locationLabel}`,
    });

    // +1 XP for every new place
    await insertProgressionEvent(supabase, {
      userId: params.userId,
      eventType: "new_place_discovered",
      sourceTable: "user_visited_places",
      sourceId: `${params.userId}:${normalizedLabel}`,
      statusPhase: "validated",
      weight: 1,
      xpBase: 1,
      xpAwarded: 1,
      occurredOn,
      metadata: { locationLabel: params.locationLabel, currentTotal: placesCount },
    });

    // Bonus for milestone (every 5 places)
    if (placesCount > 0 && placesCount % 5 === 0) {
      await awardPoints(supabase, {
        userId: params.userId,
        xpEarned: 20,
        sourceEvent: "new_place_milestone",
        sourceId: `${params.userId}:milestone:${placesCount}`,
        reason: `Jalon: ${placesCount} lieux découverts!`,
      });

      await insertProgressionEvent(supabase, {
        userId: params.userId,
        eventType: "new_place_milestone",
        sourceTable: "user_visited_places",
        sourceId: `${params.userId}:milestone:${placesCount}`,
        statusPhase: "validated",
        weight: 1,
        xpBase: 1,
        xpAwarded: 1,
        occurredOn,
        metadata: { milestone: placesCount },
      });
    }

    await refreshProgressionProfile(supabase, params.userId);
  }
}
