import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveSpogomiClosureSummary, type SpogomiClosureSummary, type SpogomiEnvironmentalEligibility, type SpogomiTeamClosureDecision, type SpogomiTeamClosureStatus } from "./closure";
import { readAllSpogomiPages } from "./pagination";

type ClosureDecisionRow = {
  id: string;
  team_id: string;
  division_id: string;
  status: SpogomiTeamClosureStatus;
  sport_eligible: boolean;
  environmental_eligibility: SpogomiEnvironmentalEligibility;
  decision_version: number;
  reason: string;
};

function toDecision(row: ClosureDecisionRow): SpogomiTeamClosureDecision {
  return {
    teamId: String(row.team_id),
    divisionId: String(row.division_id),
    status: row.status,
    sportEligible: Boolean(row.sport_eligible),
    environmentalEligibility: row.environmental_eligibility,
    decisionVersion: Number(row.decision_version),
    reason: String(row.reason),
  };
}

export async function loadSpogomiClosureSummary(params: { supabase: SupabaseClient; eventId: string }): Promise<SpogomiClosureSummary | null> {
  const eventResult = await params.supabase.from("spogomi_events").select("id, state, public_results_visibility, action_id").eq("id", params.eventId).maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) return null;
  const [divisions, teams, submissions, decisions, rankings, consolidation, action, pendingRequests] = await Promise.all([
    readAllSpogomiPages("closure divisions", (from, to) => params.supabase.from("spogomi_divisions").select("id, division_type, regulation_status").eq("event_id", params.eventId).order("division_type").range(from, to)),
    readAllSpogomiPages("closure teams", (from, to) => params.supabase.from("spogomi_teams").select("id, division_id, certified_submission_id").eq("event_id", params.eventId).order("division_id").order("team_number").range(from, to)),
    readAllSpogomiPages("closure submissions", (from, to) => params.supabase.from("spogomi_result_submissions").select("id, status").eq("event_id", params.eventId).range(from, to)),
    readAllSpogomiPages("closure decisions", (from, to) => params.supabase.from("spogomi_team_closure_decisions").select("id, team_id, division_id, status, sport_eligible, environmental_eligibility, decision_version, reason").eq("event_id", params.eventId).eq("is_current", true).range(from, to)),
    readAllSpogomiPages("closure official rankings", (from, to) => params.supabase.from("spogomi_official_rankings").select("division_id, status").eq("event_id", params.eventId).eq("status", "certified").range(from, to)),
    params.supabase.from("spogomi_action_consolidations").select("status").eq("event_id", params.eventId).eq("is_current", true).eq("status", "published").maybeSingle(),
    params.supabase.from("actions").select("status, published_at").eq("id", eventResult.data.action_id).maybeSingle(),
    readAllSpogomiPages("closure pending individual requests", (from, to) => params.supabase.from("spogomi_team_join_requests").select("id").eq("event_id", params.eventId).eq("status", "pending").range(from, to)),
  ]);
  for (const result of [consolidation, action]) if (result.error) throw result.error;
  const submissionStatus = new Map((submissions as Array<Record<string, unknown>>).map((row) => [String(row.id), String(row.status)]));
  const decisionByTeam = new Map((decisions as unknown as ClosureDecisionRow[]).map((row) => [String(row.team_id), toDecision(row)]));
  const rankingCountByDivision = new Map<string, number>();
  for (const row of rankings as Array<Record<string, unknown>>) {
    const divisionId = String(row.division_id);
    rankingCountByDivision.set(divisionId, (rankingCountByDivision.get(divisionId) ?? 0) + 1);
  }
  return deriveSpogomiClosureSummary({
    eventState: String(eventResult.data.state),
    publicResultsVisibility: (eventResult.data.public_results_visibility ?? "hidden") as "hidden" | "provisional" | "certified",
    actionStatus: action.data?.status ? String(action.data.status) : null,
    actionPublishedAt: action.data?.published_at ? String(action.data.published_at) : null,
    environmentalConsolidated: Boolean(consolidation.data),
    pendingIndividualRequests: pendingRequests.length,
    divisions: (divisions as Array<Record<string, unknown>>).map((division) => ({
      id: String(division.id),
      type: division.division_type as "casual" | "world_cup",
      regulationComplete: division.regulation_status === "complete",
      officialRankingCount: rankingCountByDivision.get(String(division.id)) ?? 0,
      teams: (teams as Array<Record<string, unknown>>).filter((team) => String(team.division_id) === String(division.id)).map((team) => ({
        teamId: String(team.id),
        divisionId: String(division.id),
        certifiedSubmission: submissionStatus.get(String(team.certified_submission_id)) === "certified",
        decision: decisionByTeam.get(String(team.id)) ?? null,
      })),
    })),
  });
}

export async function setSpogomiTeamClosureDecision(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string;
  teamId: string;
  status: SpogomiTeamClosureStatus;
  sportEligible: boolean;
  environmentalEligibility: SpogomiEnvironmentalEligibility;
  reason: string;
  decisionVersion: number;
  actorClerkId: string;
}): Promise<unknown> {
  const result = await params.supabase.rpc("spogomi_set_team_closure_decision", {
    p_event_id: params.eventId,
    p_division_id: params.divisionId,
    p_team_id: params.teamId,
    p_status: params.status,
    p_sport_eligible: params.sportEligible,
    p_environmental_eligibility: params.environmentalEligibility,
    p_reason: params.reason.trim(),
    p_decision_version: params.decisionVersion,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) {
    if (result.error.code === "40001" || result.error.code === "23505") throw new Error("Conflict: la décision de clôture a changé entre-temps.");
    throw result.error;
  }
  return result.data;
}
