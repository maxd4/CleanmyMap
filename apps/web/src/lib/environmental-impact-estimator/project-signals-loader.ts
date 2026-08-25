import type { SupabaseClient } from "@supabase/supabase-js";
import { listCodexUsageWeeklySnapshots } from "./codex-usage-store";
import { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
import {
  normalizeCanonicalSpotRows,
  orderProjectSignalRows,
  type ActionRow,
  type AppNotificationRow,
  type CommunityEventRow,
  type EventRsvpRow,
  type FunnelRow,
  type ProfileCreatedAtRow,
  type ProgressionRow,
  type ProjectSignalRows,
  type ReportRow,
  type ServiceEmailRow,
  type SpotRow,
  type TrainingRow,
} from "./project-signals.calculations";
import type { EnvironmentalImpactCodexUsageWeeklySnapshotRecord } from "./types";
import type { ProjectSignalRowsInput } from "./project-signals-scope";

export type ProjectSignalLoadParams = {
  userId: string | null;
};

export type LoadedProjectSignalData = {
  rows: ProjectSignalRows;
  oldestProfileCreatedAt: string | null;
  accountCreatedAt: string | null;
  codexSnapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[];
};

async function loadOldestProfileCreatedAt(
  supabase: SupabaseClient,
): Promise<string | null> {
  const result = await supabase
    .from("profiles")
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = (result.data ?? [])[0] as ProfileCreatedAtRow | undefined;
  return row?.created_at ?? null;
}

async function loadProfileCreatedAtById(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const result = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .limit(1);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = (result.data ?? [])[0] as ProfileCreatedAtRow | undefined;
  return row?.created_at ?? null;
}

export async function loadProjectSignalData(
  supabase: SupabaseClient,
  params: ProjectSignalLoadParams,
): Promise<LoadedProjectSignalData> {
  const [
    oldestProfileCreatedAt,
    accountCreatedAt,
    actions,
    canonicalSpots,
    funnelEvents,
    progressionEvents,
    reports,
    trainingExamples,
    serviceEmails,
    communityEvents,
    eventRsvps,
    appNotifications,
  ] = await Promise.all([
    loadOldestProfileCreatedAt(supabase),
    params.userId ? loadProfileCreatedAtById(supabase, params.userId) : Promise.resolve(null),
    orderProjectSignalRows<ActionRow>(
      supabase
        .from("actions")
        .select("id, created_at, created_by_clerk_id, latitude, longitude, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["id", false],
      ],
    ),
    orderProjectSignalRows<SpotRow>(
      supabase
        .from("trash_spotter_spots")
        .select("id, created_at, created_by_clerk_id, latitude, longitude, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [["created_at", false], ["id", false]],
    ),
    orderProjectSignalRows<FunnelRow>(
      supabase
        .from("funnel_events")
        .select("at, user_id, session_id, step, mode, meta")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["at", false],
        ["session_id", false],
        ["step", false],
        ["mode", false],
        ["user_id", false],
      ],
    ),
    orderProjectSignalRows<ProgressionRow>(
      supabase
        .from("progression_events")
        .select("created_at, user_id, event_type, status_phase")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["user_id", false],
        ["event_type", false],
        ["status_phase", false],
      ],
    ),
    orderProjectSignalRows<ReportRow>(
      supabase
        .from("reports")
        .select("created_at, owner_clerk_id, file_kind")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["owner_clerk_id", false],
        ["file_kind", false],
      ],
    ),
    orderProjectSignalRows<TrainingRow>(
      supabase
        .from("training_examples")
        .select("action_id, created_at, photos, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["action_id", false],
        ["status", false],
      ],
    ),
    orderProjectSignalRows<ServiceEmailRow>(
      supabase
        .from("service_email_events")
        .select("created_at, actor_user_id, recipient_count, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["actor_user_id", false],
        ["recipient_count", false],
        ["status", false],
      ],
    ),
    orderProjectSignalRows<CommunityEventRow>(
      supabase
        .from("community_events")
        .select("id, created_at, organizer_clerk_id, title, event_date, location_label, description")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["id", false],
        ["organizer_clerk_id", false],
        ["event_date", false],
        ["title", false],
      ],
    ),
    orderProjectSignalRows<EventRsvpRow>(
      supabase
        .from("event_rsvps")
        .select("event_id, participant_clerk_id, status, updated_at")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["updated_at", false],
        ["event_id", false],
        ["participant_clerk_id", false],
        ["status", false],
      ],
    ),
    orderProjectSignalRows<AppNotificationRow>(
      supabase
        .from("app_notifications")
        .select("id, user_id, type, title, content, read_at, created_at")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["id", false],
        ["user_id", false],
        ["type", false],
      ],
    ),
  ]);
  const codexSnapshots = await listCodexUsageWeeklySnapshots(12);
  const error = [actions.error, canonicalSpots.error, funnelEvents.error,
    progressionEvents.error, reports.error, trainingExamples.error, serviceEmails.error,
    communityEvents.error, eventRsvps.error, appNotifications.error].find(Boolean);
  if (error) {
    throw new Error(error?.message ?? "Impossible de charger les signaux environnementaux du projet.");
  }

  const rows: ProjectSignalRowsInput = {
    profiles: [],
    actions: (actions.data ?? []) as ActionRow[],
    spots: normalizeCanonicalSpotRows((canonicalSpots.data ?? []) as SpotRow[]),
    funnelEvents: (funnelEvents.data ?? []) as FunnelRow[],
    progressionEvents: (progressionEvents.data ?? []) as ProgressionRow[],
    reports: (reports.data ?? []) as ReportRow[],
    trainingExamples: (trainingExamples.data ?? []) as TrainingRow[],
    serviceEmails: (serviceEmails.data ?? []) as ServiceEmailRow[],
    communityEvents: (communityEvents.data ?? []) as CommunityEventRow[],
    eventRsvps: (eventRsvps.data ?? []) as EventRsvpRow[],
    appNotifications: (appNotifications.data ?? []) as AppNotificationRow[],
  };

  return {
    rows,
    oldestProfileCreatedAt,
    accountCreatedAt,
    codexSnapshots,
  };
}
