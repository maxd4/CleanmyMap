import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSpogomiCapability, resolveSpogomiEventAccess } from "./authorization";
import { readAllSpogomiPages } from "./pagination";

export type SpogomiObserverProjection = {
  event: {
    id: string;
    name: string;
    eventSlug: string | null;
    mode: string;
    state: string;
    startsAt: string;
    endsAt: string | null;
    publicVisibility: string;
    publicResultsVisibility: string;
  };
  divisions: Array<{ id: string; divisionType: string; divisionKey: string }>;
  teams: Array<{
    id: string;
    divisionId: string | null;
    teamNumber: number;
    publicName: string;
    compositionState: string;
    submissionStatus: string | null;
    submissionVersion: number | null;
    submittedAt: string | null;
    certified: boolean;
  }>;
  participation: {
    registered: number;
    present: number;
  };
};

export async function loadSpogomiObserverProjection(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
}): Promise<SpogomiObserverProjection | false | null> {
  const access = await resolveSpogomiEventAccess(params);
  if (!access) return null;
  if (!hasSpogomiCapability(access, "observe")) return false;

  const [divisionsResult, teams, submissions, registeredResult, presentResult] = await Promise.all([
    params.supabase
      .from("spogomi_divisions")
      .select("id, division_type, division_key")
      .eq("event_id", params.eventId)
      .order("division_type", { ascending: true }),
    readAllSpogomiPages("SPOGOMI observer teams", (from, to) =>
      params.supabase
        .from("spogomi_teams")
        .select("id, division_id, team_number, public_name, composition_state, certified_submission_id", { count: "exact" })
        .eq("event_id", params.eventId)
        .order("team_number", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
      { requireExactCount: true },
    ),
    readAllSpogomiPages("SPOGOMI observer submission statuses", (from, to) =>
      params.supabase
        .from("spogomi_result_submissions")
        .select("team_id, status, version, submitted_at", { count: "exact" })
        .eq("event_id", params.eventId)
        .order("version", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
      { requireExactCount: true },
    ),
    params.supabase
      .from("spogomi_participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", params.eventId)
      .eq("registration_status", "registered"),
    params.supabase
      .from("spogomi_participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", params.eventId)
      .eq("registration_status", "registered")
      .eq("attendance_status", "present"),
  ]);
  for (const result of [divisionsResult, registeredResult, presentResult]) {
    if (result.error) throw result.error;
  }

  const latestSubmissionByTeam = new Map<string, { status: string; version: number; submittedAt: string | null }>();
  for (const submission of submissions as Array<{ team_id: string; status: string; version: number; submitted_at: string | null }>) {
    const teamId = String(submission.team_id);
    if (!latestSubmissionByTeam.has(teamId)) {
      latestSubmissionByTeam.set(teamId, {
        status: String(submission.status),
        version: Number(submission.version),
        submittedAt: submission.submitted_at ? String(submission.submitted_at) : null,
      });
    }
  }

  return {
    event: {
      id: String(access.event.id),
      name: String(access.event.name),
      eventSlug: access.event.event_slug ? String(access.event.event_slug) : null,
      mode: String(access.event.mode),
      state: String(access.event.state),
      startsAt: String(access.event.starts_at),
      endsAt: access.event.ends_at ? String(access.event.ends_at) : null,
      publicVisibility: String(access.event.public_visibility),
      publicResultsVisibility: String(access.event.public_results_visibility),
    },
    divisions: (divisionsResult.data ?? []).map((division) => ({
      id: String(division.id),
      divisionType: String(division.division_type),
      divisionKey: String(division.division_key),
    })),
    teams: (teams as Array<Record<string, unknown>>).map((team) => {
      const submission = latestSubmissionByTeam.get(String(team.id));
      return {
        id: String(team.id),
        divisionId: team.division_id ? String(team.division_id) : null,
        teamNumber: Number(team.team_number),
        publicName: String(team.public_name),
        compositionState: String(team.composition_state),
        submissionStatus: submission?.status ?? null,
        submissionVersion: submission?.version ?? null,
        submittedAt: submission?.submittedAt ?? null,
        certified: Boolean(team.certified_submission_id),
      };
    }),
    participation: {
      registered: registeredResult.count ?? 0,
      present: presentResult.count ?? 0,
    },
  };
}
