import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readAllSpogomiPages } from "./pagination";
import {
  buildSpogomiResultsProjection,
  type SpogomiResultsSource,
  type SpogomiExportProjection,
} from "./results-projection";

function isPublishedAction(row: { status: string | null; published_at: string | null; moderation_visibility: string | null }): boolean {
  return row.status === "approved" && Boolean(row.published_at) && row.moderation_visibility !== "hidden";
}

export async function loadSpogomiResultsProjection(params: {
  supabase: SupabaseClient;
  eventId: string;
  publicOnly?: boolean;
  visibilityOverride?: SpogomiResultsSource["event"]["publicResultsVisibility"];
}): Promise<SpogomiExportProjection | null> {
  const eventResult = await params.supabase
    .from("spogomi_events")
    .select("id, action_id, name, location_label, mode, state, starts_at, ends_at, official_timezone, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config, public_visibility, public_results_visibility, updated_at")
    .eq("id", params.eventId)
    .maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) return null;
  if (params.publicOnly && (eventResult.data.public_visibility !== "published" || eventResult.data.state === "cancelled")) return null;

  const [actionResult, divisions, categories, teams, submissions, items, participants, rankings, consolidation] = await Promise.all([
    params.supabase.from("actions").select("status, published_at, moderation_visibility").eq("id", eventResult.data.action_id).maybeSingle(),
    readAllSpogomiPages("public SPOGOMI divisions", (from, to) => params.supabase.from("spogomi_divisions").select("id, division_type, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("event_id", params.eventId).order("division_type", { ascending: true }).range(from, to)),
    readAllSpogomiPages("public SPOGOMI categories", (from, to) => params.supabase.from("spogomi_category_rules").select("id, event_id, division_id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, display_order, is_complete, updated_at").eq("event_id", params.eventId).order("display_order", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("public SPOGOMI teams", (from, to) => params.supabase.from("spogomi_teams").select("id, division_id, team_number, public_name, composition_state, certified_submission_id, updated_at").eq("event_id", params.eventId).order("team_number", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("public SPOGOMI submissions", (from, to) => params.supabase.from("spogomi_result_submissions").select("id, division_id, team_id, version, status, submitted_at, updated_at, regulation_version").eq("event_id", params.eventId).order("team_id", { ascending: true }).order("version", { ascending: false }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("public SPOGOMI result items", (from, to) => params.supabase.from("spogomi_result_items").select("id, division_id, submission_id, category_rule_id, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, source_reference, updated_at").eq("event_id", params.eventId).order("submission_id", { ascending: true }).order("category_rule_id", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("public SPOGOMI participants", (from, to) => params.supabase.from("spogomi_participants").select("id, division_id, team_id, registration_status, attendance_status, updated_at").eq("event_id", params.eventId).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("public SPOGOMI official rankings", (from, to) => params.supabase.from("spogomi_official_rankings").select("division_id, team_id, kind, rank, status, team_eligible, decision_version, source_reference, source_snapshot").eq("event_id", params.eventId).order("kind", { ascending: true }).order("rank", { ascending: true }).order("team_id", { ascending: true }).range(from, to)),
    params.supabase.from("spogomi_action_consolidations").select("projection, published_at").eq("event_id", params.eventId).eq("is_current", true).eq("status", "published").maybeSingle(),
  ]);
  if (actionResult.error || consolidation.error) throw actionResult.error ?? consolidation.error;
  const event = eventResult.data;
  const source: SpogomiResultsSource = {
    event: {
      id: String(event.id), actionId: String(event.action_id), name: String(event.name), locationLabel: String(event.location_label), mode: event.mode,
      state: String(event.state), startsAt: String(event.starts_at), endsAt: event.ends_at ? String(event.ends_at) : null,
      officialTimezone: event.official_timezone ? String(event.official_timezone) : undefined,
      regulationVersion: String(event.regulation_version), regulationStatus: event.regulation_status,
      regulationSourceReference: event.regulation_source_reference ? String(event.regulation_source_reference) : null,
      regulationConfig: event.regulation_config, teamSizeConfig: event.team_size_config,
      divisions: (divisions as Array<Record<string, unknown>>).map((division) => ({
        id: String(division.id), division_type: division.division_type as "casual" | "world_cup",
        regulation_version: String(division.regulation_version ?? event.regulation_version),
        regulation_status: division.regulation_status as "incomplete" | "complete",
        regulation_source_reference: division.regulation_source_reference ? String(division.regulation_source_reference) : null,
        regulation_config: division.regulation_config,
        team_size_config: division.team_size_config,
      })),
      publicResultsVisibility: params.visibilityOverride ?? event.public_results_visibility ?? "hidden",
      updatedAt: String(event.updated_at),
    },
    categories: categories as unknown as SpogomiResultsSource["categories"],
    teams: (teams as Array<Record<string, unknown>>).map((team) => ({
      id: String(team.id),
      division_id: String(team.division_id),
      team_number: Number(team.team_number),
      public_name: String(team.public_name),
      composition_state: String(team.composition_state),
      certified_submission_id: team.certified_submission_id ? String(team.certified_submission_id) : null,
      updated_at: typeof team.updated_at === "string" ? team.updated_at : undefined,
    })),
    submissions: submissions as unknown as SpogomiResultsSource["submissions"],
    items: items as Array<Record<string, unknown>>,
    participants: participants as unknown as SpogomiResultsSource["participants"],
    officialRankings: rankings as unknown as SpogomiResultsSource["officialRankings"],
    consolidation: consolidation.data ? { projection: consolidation.data.projection as Record<string, unknown>, published_at: String(consolidation.data.published_at) } : null,
    actionIsPublished: Boolean(actionResult.data && isPublishedAction(actionResult.data)),
  };
  return buildSpogomiResultsProjection(source);
}
