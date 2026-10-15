import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateSpogomiCompetitionResult,
  validateCompetitionItems,
} from "./scoring";
import { isRegulationReadyForCertification } from "./validation";
import type {
  SpogomiCompetitionInput,
  SpogomiCompetitionResult,
  SpogomiResultItemInput,
} from "./types";
import { loadSpogomiEventForOrganizer } from "./preparation-service";
import { loadSpogomiTeamSession } from "./team-access";
import { readAllSpogomiPages } from "./pagination";
import { toSpogomiResultItemInput } from "./result-input";
import { buildSpogomiRegulation } from "./regulation";
import { resolveSpogomiEventAccess } from "./authorization";

export type SpogomiReviewerRole = "organizer" | "referee";

export { buildSpogomiRegulation } from "./regulation";

type EventRegulationRow = import("./regulation").SpogomiEventRegulationRow;
type CategoryRow = import("./regulation").SpogomiCategoryRegulationRow;

export async function resolveSpogomiReviewerRole(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
}): Promise<SpogomiReviewerRole | false> {
  const access = await resolveSpogomiEventAccess(params);
  if (!access) return false;
  if (access.role === "organizer") return "organizer";
  return access.reviewerRoles.includes("referee") ? "referee" : false;
}

export async function assignSpogomiEventAccess(params: {
  supabase: SupabaseClient;
  eventId: string;
  clerkId: string;
  role: "observer" | "referee";
  assignedByClerkId: string;
}): Promise<unknown> {
  await assertReviewerAssignmentEvent(params, false);
  const result = await params.supabase.rpc("spogomi_set_event_access", {
    p_event_id: params.eventId,
    p_subject_clerk_id: params.clerkId.trim(),
    p_access_role: params.role,
    p_operation: "grant",
    p_actor_clerk_id: params.assignedByClerkId,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function revokeSpogomiEventAccess(params: {
  supabase: SupabaseClient;
  eventId: string;
  clerkId: string;
  role: "observer" | "referee";
  assignedByClerkId: string;
}): Promise<void> {
  await assertReviewerAssignmentEvent(params, true);
  const result = await params.supabase.rpc("spogomi_set_event_access", {
    p_event_id: params.eventId,
    p_subject_clerk_id: params.clerkId.trim(),
    p_access_role: params.role,
    p_operation: "revoke",
    p_actor_clerk_id: params.assignedByClerkId,
  });
  if (result.error) throw result.error;
}

export async function assignSpogomiReferee(params: Omit<Parameters<typeof assignSpogomiEventAccess>[0], "role">): Promise<unknown> {
  return assignSpogomiEventAccess({ ...params, role: "referee" });
}

export async function revokeSpogomiReferee(params: Omit<Parameters<typeof revokeSpogomiEventAccess>[0], "role">): Promise<void> {
  return revokeSpogomiEventAccess({ ...params, role: "referee" });
}

export async function assignSpogomiObserver(params: Omit<Parameters<typeof assignSpogomiEventAccess>[0], "role">): Promise<unknown> {
  return assignSpogomiEventAccess({ ...params, role: "observer" });
}

export async function revokeSpogomiObserver(params: Omit<Parameters<typeof revokeSpogomiEventAccess>[0], "role">): Promise<void> {
  return revokeSpogomiEventAccess({ ...params, role: "observer" });
}

async function assertReviewerAssignmentEvent(
  params: { supabase: SupabaseClient; eventId: string; assignedByClerkId: string },
  forbiddenFirst: boolean,
) {
  const event = await loadSpogomiEventForOrganizer(params.supabase, params.eventId, params.assignedByClerkId);
  if (forbiddenFirst && event === false) throw new Error("SPOGOMI reviewer assignment is forbidden.");
  if (event === null) throw new Error("SPOGOMI event not found.");
  if (!forbiddenFirst && event === false) throw new Error("SPOGOMI reviewer assignment is forbidden.");
}

export type SpogomiTeamResultForm = {
  event: Pick<EventRegulationRow, "id" | "name" | "event_slug" | "mode" | "state" | "regulation_version" | "regulation_status" | "regulation_source_reference">;
  team: { id: string; teamNumber: number; publicName: string };
  categories: Array<{ id: string; code: string; label: string; measurementKind: string; unit: string; isComplete: boolean }>;
  latestSubmission: { id: string; version: number; status: string; correctionReason: string | null; items: Array<{
    category_rule_id: string;
    quantity: number | string | null;
    mass_grams: number | string | null;
    object_count: number | string | null;
    measurement_method: string | null;
    provenance: string;
    arbitration_comment: string | null;
  }> } | null;
  presentParticipants: number;
  officialScoreAvailable: boolean;
};

export async function loadSpogomiTeamResultForm(params: {
  supabase: SupabaseClient;
  sessionToken: string | null | undefined;
}): Promise<SpogomiTeamResultForm | null> {
  const session = await loadSpogomiTeamSession(params.supabase, params.sessionToken);
  if (!session) return null;
  const [eventResult, teamResult, categories, submissionResult, attendanceResult] = await Promise.all([
    params.supabase.from("spogomi_events").select("id, name, event_slug, mode, state, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("id", session.eventId).maybeSingle(),
    params.supabase.from("spogomi_teams").select("id, team_number, public_name").eq("id", session.teamId).eq("event_id", session.eventId).maybeSingle(),
    readAllSpogomiPages("team regulation categories", (from, to) => params.supabase.from("spogomi_category_rules").select("id, event_id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, display_order, is_complete").eq("event_id", session.eventId).order("display_order", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    params.supabase.from("spogomi_result_submissions").select("id, version, status, correction_reason").eq("event_id", session.eventId).eq("team_id", session.teamId).order("version", { ascending: false }).limit(1).maybeSingle(),
    params.supabase.from("spogomi_participants").select("id", { count: "exact", head: true }).eq("event_id", session.eventId).eq("team_id", session.teamId).eq("registration_status", "registered").eq("attendance_status", "present"),
  ]);
  for (const result of [eventResult, teamResult, submissionResult, attendanceResult]) if (result.error) throw result.error;
  if (!eventResult.data || !teamResult.data) return null;
  const event = eventResult.data as EventRegulationRow;
  const categoryRows = categories as unknown as CategoryRow[];
  const submission = submissionResult.data as { id: string; version: number; status: string; correction_reason: string | null } | null;
  let items: Array<{
    category_rule_id: string;
    quantity: number | string | null;
    mass_grams: number | string | null;
    object_count: number | string | null;
    measurement_method: string | null;
    provenance: string;
    arbitration_comment: string | null;
  }> = [];
  if (submission) {
    items = await readAllSpogomiPages("team result items", (from, to) => params.supabase.from("spogomi_result_items").select("id, category_rule_id, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, arbitration_comment, source_reference").eq("submission_id", submission.id).order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, to)) as typeof items;
  }
  const regulation = buildSpogomiRegulation(event, categoryRows);
  return {
    event,
    team: { id: String(teamResult.data.id), teamNumber: Number(teamResult.data.team_number), publicName: String(teamResult.data.public_name) },
    categories: categoryRows.map((category) => ({ id: category.id, code: category.code, label: category.label, measurementKind: category.measurement_kind, unit: category.unit, isComplete: Boolean(category.is_complete) && category.regulation_version === event.regulation_version })),
    latestSubmission: submission ? { id: submission.id, version: Number(submission.version), status: submission.status, correctionReason: submission.correction_reason, items } : null,
    presentParticipants: attendanceResult.count ?? 0,
    officialScoreAvailable: isRegulationReadyForCertification(regulation),
  };
}

export type SaveTeamSubmissionInput = {
  submissionId: string | null;
  idempotencyKey: string;
  status: "draft" | "submitted";
  correctionReason: string | null;
  items: Array<{
    categoryRuleId: string;
    measurementKind: SpogomiResultItemInput["measurementKind"];
    unit: string;
    quantity: number | null;
    massGrams: number | null;
    objectCount: number | null;
    measurementMethod: string | null;
    provenance: string;
    arbitrationComment: string | null;
  }>;
};

export async function saveSpogomiTeamSubmission(params: {
  supabase: SupabaseClient;
  sessionToken: string | null | undefined;
  input: SaveTeamSubmissionInput;
}): Promise<unknown> {
  const session = await loadSpogomiTeamSession(params.supabase, params.sessionToken);
  if (!session) throw new Error("Team session is unauthorized.");
  const [eventResult, categories, latestResult] = await Promise.all([
    params.supabase.from("spogomi_events").select("id, name, event_slug, mode, state, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("id", session.eventId).maybeSingle(),
    readAllSpogomiPages("submission regulation categories", (from, to) => params.supabase.from("spogomi_category_rules").select("id, event_id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, display_order, is_complete").eq("event_id", session.eventId).order("display_order", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    params.supabase.from("spogomi_result_submissions").select("id, status, version").eq("event_id", session.eventId).eq("team_id", session.teamId).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [eventResult, latestResult]) if (result.error) throw result.error;
  if (!eventResult.data) throw new Error("SPOGOMI event not found.");
  const categoryRows = categories as unknown as CategoryRow[];
  const regulation = buildSpogomiRegulation(eventResult.data as EventRegulationRow, categoryRows);
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const itemsForEngine = params.input.items.map((item) => {
    const category = categoryById.get(item.categoryRuleId);
    return { ...item, categoryCode: category?.code ?? "" };
  });
  const validation = validateCompetitionItems({ regulation, items: itemsForEngine, presentParticipants: 0 });
  if (!validation.ok) throw new Error(`Validation: ${validation.reason}`);
  const uniqueCategoryIds = new Set(params.input.items.map((item) => item.categoryRuleId));
  if (uniqueCategoryIds.size !== params.input.items.length) throw new Error("Validation: each category can appear only once.");
  if (params.input.status === "submitted") {
    if (params.input.items.length !== categoryRows.length || params.input.items.some((item) => item.quantity === null || !item.measurementMethod?.trim() || !item.provenance.trim())) {
      throw new Error("Validation: every category needs a quantity, a measurement method and a provenance before submission.");
    }
  }
  const latest = latestResult.data as { id: string; status: string; version: number } | null;
  const replacesSubmissionId = params.input.submissionId ? null : latest && latest.status !== "draft" ? latest.id : null;
  if (params.input.status === "submitted" && replacesSubmissionId && !params.input.correctionReason?.trim()) {
    throw new Error("Validation: un motif est obligatoire pour corriger une version déjà soumise.");
  }
  const rpc = await params.supabase.rpc("spogomi_save_team_submission", {
    p_event_id: session.eventId,
    p_team_id: session.teamId,
    p_submission_id: params.input.submissionId,
    p_idempotency_key: params.input.idempotencyKey,
    p_status: params.input.status,
    p_regulation_version: regulation.version,
    p_replaces_submission_id: replacesSubmissionId,
    p_correction_reason: params.input.correctionReason?.trim() || null,
    p_actor_kind: "team_session",
    p_items: params.input.items.map((item) => ({
      category_rule_id: item.categoryRuleId,
      measurement_kind: item.measurementKind,
      unit: item.unit,
      quantity: item.quantity,
      mass_grams: item.massGrams,
      object_count: item.objectCount,
      measurement_method: item.measurementMethod,
      provenance: item.provenance,
      arbitration_comment: item.arbitrationComment,
      source_reference: "team_form",
    })),
  });
  if (rpc.error) {
    if (rpc.error.code === "23505" || rpc.error.code === "40001") throw new Error("Conflict: cette version a changé entre-temps.");
    throw rpc.error;
  }
  return rpc.data;
}

export type SpogomiReviewResult = {
  teamId: string;
  teamNumber: number;
  publicName: string;
  latestSubmission: { id: string; version: number; status: string; submittedAt: string | null; items: Array<Record<string, unknown>> } | null;
  score: SpogomiCompetitionResult | null;
};

export async function loadSpogomiEventResultReviews(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
}): Promise<SpogomiReviewResult[] | false | null> {
  const reviewerRole = await resolveSpogomiReviewerRole(params);
  if (reviewerRole === false) return false;
  const event = await params.supabase.from("spogomi_events").select("id").eq("id", params.eventId).maybeSingle();
  if (event.error) throw event.error;
  if (!event.data) return null;
  const [eventResult, teams, categories, submissions, items, participants] = await Promise.all([
    params.supabase.from("spogomi_events").select("id, name, event_slug, mode, state, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("id", params.eventId).single(),
    readAllSpogomiPages("review teams", (from, to) => params.supabase.from("spogomi_teams").select("id, team_number, public_name").eq("event_id", params.eventId).order("team_number", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("review regulation categories", (from, to) => params.supabase.from("spogomi_category_rules").select("id, event_id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, display_order, is_complete").eq("event_id", params.eventId).order("display_order", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("review submissions", (from, to) => params.supabase.from("spogomi_result_submissions").select("id, team_id, version, status, submitted_at").eq("event_id", params.eventId).order("version", { ascending: false }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("review result items", (from, to) => params.supabase.from("spogomi_result_items").select("id, submission_id, category_rule_id, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, arbitration_comment").eq("event_id", params.eventId).order("submission_id", { ascending: true }).order("category_rule_id", { ascending: true }).order("id", { ascending: true }).range(from, to)),
    readAllSpogomiPages("review participants", (from, to) => params.supabase.from("spogomi_participants").select("id, team_id, attendance_status, registration_status").eq("event_id", params.eventId).order("id", { ascending: true }).range(from, to)),
  ]);
  if (eventResult.error) throw eventResult.error;
  const eventRow = eventResult.data as EventRegulationRow;
  const categoryRows = categories as unknown as CategoryRow[];
  const regulation = buildSpogomiRegulation(eventRow, categoryRows);
  const itemRows = items as Array<Record<string, unknown>>;
  const submissionRows = submissions as Array<{ id: string; team_id: string; version: number; status: string; submitted_at: string | null }>;
  const categoryCodes = new Map(categoryRows.map((category) => [category.id, category.code]));
  const participantRows = participants as Array<{ team_id: string | null; attendance_status: string; registration_status: string }>;
  return (teams ?? []).map((team) => {
    const teamId = String(team.id);
    const latest = submissionRows.filter((submission) => submission.team_id === teamId).sort((left, right) => right.version - left.version || left.id.localeCompare(right.id))[0];
    const teamItems = latest ? itemRows.filter((item) => item.submission_id === latest.id) : [];
    const presentParticipants = participantRows.filter((participant) => participant.team_id === teamId && participant.registration_status === "registered" && participant.attendance_status === "present").length;
    const engineItems = teamItems.map((item) => toSpogomiResultItemInput(item, categoryCodes.get(String(item.category_rule_id)) ?? ""));
    const score = latest ? calculateSpogomiCompetitionResult({ regulation, items: engineItems, presentParticipants, submissionStatus: latest.status as SpogomiCompetitionInput["submissionStatus"] }) : null;
    return {
      teamId,
      teamNumber: Number(team.team_number),
      publicName: String(team.public_name),
      latestSubmission: latest ? { id: latest.id, version: Number(latest.version), status: latest.status, submittedAt: latest.submitted_at, items: teamItems } : null,
      score,
    };
  });
}

export async function reviewSpogomiTeamSubmission(params: {
  supabase: SupabaseClient;
  eventId: string;
  teamId: string;
  submissionId: string;
  reviewerClerkId: string;
  decision: "certified" | "rejected";
  reason: string | null;
  actorKind: "organizer" | "referee";
}): Promise<unknown> {
  const reviewerRole = await resolveSpogomiReviewerRole({ supabase: params.supabase, eventId: params.eventId, userId: params.reviewerClerkId });
  if (reviewerRole === false || reviewerRole !== params.actorKind) throw new Error("SPOGOMI review is forbidden.");
  const teamMember = await params.supabase
    .from("spogomi_participants")
    .select("id")
    .eq("event_id", params.eventId)
    .eq("team_id", params.teamId)
    .eq("clerk_id", params.reviewerClerkId)
    .maybeSingle();
  if (teamMember.error) throw teamMember.error;
  if (teamMember.data) throw new Error("SPOGOMI self-certification is forbidden.");
  const rpc = await params.supabase.rpc("spogomi_review_team_submission", {
    p_event_id: params.eventId,
    p_team_id: params.teamId,
    p_submission_id: params.submissionId,
    p_decision: params.decision,
    p_reviewer_clerk_id: params.reviewerClerkId,
    p_reason: params.reason,
    p_actor_kind: params.actorKind,
  });
  if (rpc.error) {
    if (rpc.error.code === "40001" || rpc.error.code === "23514") throw new Error("Conflict: la décision ou le règlement a changé entre-temps.");
    throw rpc.error;
  }
  return rpc.data;
}
