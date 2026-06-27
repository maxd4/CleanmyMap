import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityEventRow, EventRsvpRow, SpotRow } from "./progression-types";
import { insertProgressionEvent, syncUserActionProgression } from "./progression-data";
import { toIsoDate } from "./progression-utils";
import {
  extractCommunityOpsFromDescription,
  refreshProgressionProfile,
} from "./progression-tracking";
import { runActionQuery } from "@/lib/actions/query";

type ClerkIdRow = {
  created_by_clerk_id?: string | null;
  participant_clerk_id?: string | null;
  organizer_clerk_id?: string | null;
};

async function backfillUserActions(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await syncUserActionProgression(supabase, userId);
}

async function backfillUserSpots(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const result = await supabase
    .from("trash_spotter_spots")
    .select("id, created_at, created_by_clerk_id, status, label, notes")
    .eq("created_by_clerk_id", userId)
    .limit(6000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const spots = (result.data ?? []) as SpotRow[];
  for (const spot of spots) {
    await insertProgressionEvent(supabase, {
      userId,
      eventType: "spot_create_pending",
      sourceTable: "trash_spotter_spots",
      sourceId: spot.id,
      statusPhase: "pending",
      weight: 2,
      xpBase: 20,
      xpAwarded: 8,
      occurredOn: toIsoDate(spot.created_at),
      metadata: {},
    });

    if (spot.status === "validated" || spot.status === "cleaned") {
      await insertProgressionEvent(supabase, {
        userId,
        eventType: "spot_validation_bonus",
        sourceTable: "trash_spotter_spots",
        sourceId: spot.id,
        statusPhase: "validated",
        weight: 3,
        xpBase: 30,
        xpAwarded: 30,
        occurredOn: toIsoDate(spot.created_at),
        metadata: { status: spot.status },
      });
    }
  }
}

async function backfillUserRsvps(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const result = await supabase
    .from("event_rsvps")
    .select("event_id, participant_clerk_id, status, updated_at")
    .eq("participant_clerk_id", userId)
    .eq("status", "yes")
    .limit(6000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as EventRsvpRow[];
  for (const row of rows) {
    await insertProgressionEvent(supabase, {
      userId,
      eventType: "collective_rsvp_yes_pending",
      sourceTable: "event_rsvps",
      sourceId: `${row.event_id}:${row.participant_clerk_id}`,
      statusPhase: "pending",
      weight: 2,
      xpBase: 20,
      xpAwarded: 8,
      occurredOn: toIsoDate(row.updated_at),
      metadata: { eventId: row.event_id },
    });
  }
}

async function backfillUserCommunityOps(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const result = await supabase
    .from("community_events")
    .select("id, created_at, organizer_clerk_id, description")
    .eq("organizer_clerk_id", userId)
    .limit(3000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as CommunityEventRow[];
  for (const row of rows) {
    const ops = extractCommunityOpsFromDescription(row.description);

    if (ops.hasPostMortem || ops.attendanceCount > 0) {
      await insertProgressionEvent(supabase, {
        userId,
        eventType: "community_ops_update",
        sourceTable: "community_events",
        sourceId: row.id,
        statusPhase: "validated",
        weight: 2,
        xpBase: 20,
        xpAwarded: 20,
        occurredOn: toIsoDate(row.created_at),
        metadata: {
          hasPostMortem: ops.hasPostMortem,
          attendanceCount: ops.attendanceCount,
        },
      });
    }

    if (ops.attendanceCount > 0) {
      await insertProgressionEvent(supabase, {
        userId,
        eventType: "collective_attendance_confirmed",
        sourceTable: "community_events",
        sourceId: `${row.id}:attendance`,
        statusPhase: "validated",
        weight: 3,
        xpBase: 30,
        xpAwarded: 30,
        occurredOn: toIsoDate(row.created_at),
        metadata: { attendanceCount: ops.attendanceCount },
      });
    }
  }
}

function throwIfQueryError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

function addUserId(userIds: Set<string>, userId: string | null | undefined): void {
  if (typeof userId === "string" && userId.trim().length > 0) {
    userIds.add(userId);
  }
}

function collectUserIds<T extends ClerkIdRow>(
  rows: T[],
  selectUserId: (row: T) => string | null | undefined,
  userIds: Set<string>,
): void {
  for (const row of rows) {
    addUserId(userIds, selectUserId(row));
  }
}

export async function backfillUserProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await backfillUserActions(supabase, userId);
  await backfillUserSpots(supabase, userId);
  await backfillUserRsvps(supabase, userId);
  await backfillUserCommunityOps(supabase, userId);
  await refreshProgressionProfile(supabase, userId);
}

export async function backfillAllProgression(
  supabase: SupabaseClient,
): Promise<void> {
  const [actionsUsers, spotsUsers, rsvpUsers, eventUsers] = await Promise.all([
    runActionQuery<{ created_by_clerk_id: string }>(supabase, (query) =>
      query.select("created_by_clerk_id").limit(10000),
    ),
    supabase.from("trash_spotter_spots").select("created_by_clerk_id").limit(10000),
    supabase.from("event_rsvps").select("participant_clerk_id").limit(10000),
    supabase.from("community_events").select("organizer_clerk_id").limit(10000),
  ]);

  throwIfQueryError(spotsUsers.error);
  throwIfQueryError(rsvpUsers.error);
  throwIfQueryError(eventUsers.error);

  const userIds = new Set<string>();
  collectUserIds(actionsUsers, (row) => row.created_by_clerk_id, userIds);
  collectUserIds((spotsUsers.data ?? []) as Array<{ created_by_clerk_id?: string | null }>, (row) => row.created_by_clerk_id, userIds);
  collectUserIds((rsvpUsers.data ?? []) as Array<{ participant_clerk_id?: string | null }>, (row) => row.participant_clerk_id, userIds);
  collectUserIds((eventUsers.data ?? []) as Array<{ organizer_clerk_id?: string | null }>, (row) => row.organizer_clerk_id, userIds);

  for (const userId of userIds) {
    await backfillUserProgression(supabase, userId);
  }
}
