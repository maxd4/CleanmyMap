import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateSpogomiCompetitionResult,
  validateCompetitionItems,
} from "./scoring";
import { isRegulationReadyForCertification } from "./validation";
import type {
  SpogomiCategoryRule,
  SpogomiCompetitionResult,
  SpogomiRegulation,
  SpogomiResultItemInput,
} from "./types";
import { loadSpogomiEventForOrganizer } from "./preparation-service";
import { loadSpogomiTeamSession } from "./team-access";

export type SpogomiReviewerRole = "organizer" | "referee";

type RegulationConfig = {
  rounding?: SpogomiRegulation["rounding"];
  penalties?: SpogomiRegulation["penalties"];
  eligibility?: SpogomiRegulation["eligibility"];
  tiebreakers?: SpogomiRegulation["tiebreakers"];
};

type EventRegulationRow = {
  id: string;
  name: string;
  event_slug: string | null;
  mode: "casual" | "world_cup";
  state: string;
  regulation_version: string;
  regulation_status: "incomplete" | "complete";
  regulation_source_reference: string | null;
  regulation_config: unknown;
  team_size_config: unknown;
};

type CategoryRow = {
  id: string;
  event_id: string;
  regulation_version: string;
  code: string;
  label: string;
  measurement_kind: SpogomiCategoryRule["measurementKind"];
  unit: string;
  coefficient: number | string | null;
  coefficient_status: SpogomiCategoryRule["coefficientStatus"];
  environmental_category_slug: string | null;
  display_order: number;
  is_complete: boolean;
};

function asConfig(value: unknown): RegulationConfig {
  return value && typeof value === "object" ? value as RegulationConfig : {};
}

function asTeamSize(value: unknown): SpogomiRegulation["teamSize"] {
  const raw = value && typeof value === "object" ? value as { casual?: { minMembers?: unknown; maxMembers?: unknown } } : {};
  return {
    casual: {
      minMembers: typeof raw.casual?.minMembers === "number" ? raw.casual.minMembers : null,
      maxMembers: typeof raw.casual?.maxMembers === "number" ? raw.casual.maxMembers : null,
    },
  };
}

export function buildSpogomiRegulation(event: EventRegulationRow, categoryRows: CategoryRow[]): SpogomiRegulation {
  const config = asConfig(event.regulation_config);
  return {
    version: event.regulation_version,
    sourceReference: event.regulation_source_reference,
    status: event.regulation_status,
    teamSize: asTeamSize(event.team_size_config),
    rounding: config.rounding,
    penalties: config.penalties,
    eligibility: config.eligibility,
    tiebreakers: config.tiebreakers,
    categories: categoryRows
      .sort((left, right) => left.display_order - right.display_order)
      .map((category) => ({
        code: String(category.code),
        label: String(category.label),
        measurementKind: category.measurement_kind,
        unit: String(category.unit),
        coefficient: category.coefficient === null ? null : Number(category.coefficient),
        coefficientStatus: category.coefficient_status,
        environmentalCategorySlug: category.environmental_category_slug,
        isComplete: Boolean(category.is_complete),
      })),
  };
}

export async function resolveSpogomiReviewerRole(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
}): Promise<SpogomiReviewerRole | false> {
  const organizerEvent = await loadSpogomiEventForOrganizer(params.supabase, params.eventId, params.userId);
  if (organizerEvent) return "organizer";
  if (organizerEvent === null) return false;
  const reviewer = await params.supabase
    .from("spogomi_event_reviewers")
    .select("id")
    .eq("event_id", params.eventId)
    .eq("clerk_id", params.userId)
    .eq("role", "referee")
    .is("revoked_at", null)
    .maybeSingle();
  if (reviewer.error) throw reviewer.error;
  return reviewer.data ? "referee" : false;
}

export async function assignSpogomiReferee(params: {
  supabase: SupabaseClient;
  eventId: string;
  clerkId: string;
  assignedByClerkId: string;
}): Promise<unknown> {
  const event = await loadSpogomiEventForOrganizer(params.supabase, params.eventId, params.assignedByClerkId);
  if (event !== false && !event) throw new Error("SPOGOMI event not found.");
  if (event === false) throw new Error("SPOGOMI reviewer assignment is forbidden.");
  const result = await params.supabase
    .from("spogomi_event_reviewers")
    .upsert({ event_id: params.eventId, clerk_id: params.clerkId.trim(), role: "referee", assigned_by_clerk_id: params.assignedByClerkId, revoked_at: null }, { onConflict: "event_id,clerk_id,role" })
    .select("id, event_id, clerk_id, role, revoked_at")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function revokeSpogomiReferee(params: {
  supabase: SupabaseClient;
  eventId: string;
  clerkId: string;
  assignedByClerkId: string;
}): Promise<void> {
  const event = await loadSpogomiEventForOrganizer(params.supabase, params.eventId, params.assignedByClerkId);
  if (event === false) throw new Error("SPOGOMI reviewer assignment is forbidden.");
  if (!event) throw new Error("SPOGOMI event not found.");
  const result = await params.supabase
    .from("spogomi_event_reviewers")
    .update({ revoked_at: new Date().toISOString() })
    .eq("event_id", params.eventId)
    .eq("clerk_id", params.clerkId)
    .eq("role", "referee")
    .is("revoked_at", null);
  if (result.error) throw result.error;
}

function toResultItemInput(item: Record<string, unknown>, categoryCode: string): SpogomiResultItemInput & { categoryCode: string } {
  return {
    categoryCode,
    measurementKind: item.measurement_kind as SpogomiResultItemInput["measurementKind"],
    unit: String(item.unit),
    quantity: item.quantity === null ? null : Number(item.quantity),
    massGrams: item.mass_grams === null || item.mass_grams === undefined ? null : Number(item.mass_grams),
    objectCount: item.object_count === null || item.object_count === undefined ? null : Number(item.object_count),
    measurementMethod: item.measurement_method === null || item.measurement_method === undefined ? null : String(item.measurement_method),
    provenance: String(item.provenance ?? ""),
    arbitrationComment: item.arbitration_comment === null || item.arbitration_comment === undefined ? null : String(item.arbitration_comment),
  };
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
  const [eventResult, teamResult, categoryResult, submissionResult, attendanceResult] = await Promise.all([
    params.supabase.from("spogomi_events").select("id, name, event_slug, mode, state, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("id", session.eventId).maybeSingle(),
    params.supabase.from("spogomi_teams").select("id, team_number, public_name").eq("id", session.teamId).eq("event_id", session.eventId).maybeSingle(),
    params.supabase.from("spogomi_category_rules").select("id, event_id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, display_order, is_complete").eq("event_id", session.eventId).order("display_order"),
    params.supabase.from("spogomi_result_submissions").select("id, version, status, correction_reason").eq("event_id", session.eventId).eq("team_id", session.teamId).order("version", { ascending: false }).limit(1).maybeSingle(),
    params.supabase.from("spogomi_participants").select("id", { count: "exact", head: true }).eq("event_id", session.eventId).eq("team_id", session.teamId).eq("attendance_status", "present"),
  ]);
  for (const result of [eventResult, teamResult, categoryResult, submissionResult, attendanceResult]) if (result.error) throw result.error;
  if (!eventResult.data || !teamResult.data) return null;
  const event = eventResult.data as EventRegulationRow;
  const categories = (categoryResult.data ?? []) as unknown as CategoryRow[];
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
    const itemResult = await params.supabase.from("spogomi_result_items").select("id, category_rule_id, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, arbitration_comment, source_reference").eq("submission_id", submission.id).order("created_at");
    if (itemResult.error) throw itemResult.error;
    items = (itemResult.data ?? []) as typeof items;
  }
  const regulation = buildSpogomiRegulation(event, categories);
  return {
    event,
    team: { id: String(teamResult.data.id), teamNumber: Number(teamResult.data.team_number), publicName: String(teamResult.data.public_name) },
    categories: categories.map((category) => ({ id: category.id, code: category.code, label: category.label, measurementKind: category.measurement_kind, unit: category.unit, isComplete: category.is_complete })),
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
  const [eventResult, categoriesResult, latestResult] = await Promise.all([
    params.supabase.from("spogomi_events").select("id, name, event_slug, mode, state, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("id", session.eventId).maybeSingle(),
    params.supabase.from("spogomi_category_rules").select("id, event_id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, display_order, is_complete").eq("event_id", session.eventId).order("display_order"),
    params.supabase.from("spogomi_result_submissions").select("id, status, version").eq("event_id", session.eventId).eq("team_id", session.teamId).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [eventResult, categoriesResult, latestResult]) if (result.error) throw result.error;
  if (!eventResult.data) throw new Error("SPOGOMI event not found.");
  const categories = (categoriesResult.data ?? []) as unknown as CategoryRow[];
  const regulation = buildSpogomiRegulation(eventResult.data as EventRegulationRow, categories);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const itemsForEngine = params.input.items.map((item) => {
    const category = categoryById.get(item.categoryRuleId);
    return { ...item, categoryCode: category?.code ?? "" };
  });
  const validation = validateCompetitionItems({ regulation, items: itemsForEngine, presentParticipants: 0 });
  if (!validation.ok) throw new Error(`Validation: ${validation.reason}`);
  const uniqueCategoryIds = new Set(params.input.items.map((item) => item.categoryRuleId));
  if (uniqueCategoryIds.size !== params.input.items.length) throw new Error("Validation: each category can appear only once.");
  if (params.input.status === "submitted") {
    if (params.input.items.length !== categories.length || params.input.items.some((item) => item.quantity === null || !item.measurementMethod?.trim() || !item.provenance.trim())) {
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
  const [eventResult, teamsResult, categoriesResult, submissionsResult, itemsResult, participantsResult] = await Promise.all([
    params.supabase.from("spogomi_events").select("id, name, event_slug, mode, state, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("id", params.eventId).single(),
    params.supabase.from("spogomi_teams").select("id, team_number, public_name").eq("event_id", params.eventId).order("team_number"),
    params.supabase.from("spogomi_category_rules").select("id, event_id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, display_order, is_complete").eq("event_id", params.eventId).order("display_order"),
    params.supabase.from("spogomi_result_submissions").select("id, team_id, version, status, submitted_at").eq("event_id", params.eventId).order("version", { ascending: false }),
    params.supabase.from("spogomi_result_items").select("id, submission_id, category_rule_id, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, arbitration_comment").eq("event_id", params.eventId),
    params.supabase.from("spogomi_participants").select("id, team_id, attendance_status").eq("event_id", params.eventId),
  ]);
  for (const result of [eventResult, teamsResult, categoriesResult, submissionsResult, itemsResult, participantsResult]) if (result.error) throw result.error;
  const eventRow = eventResult.data as EventRegulationRow;
  const categories = (categoriesResult.data ?? []) as unknown as CategoryRow[];
  const regulation = buildSpogomiRegulation(eventRow, categories);
  const items = (itemsResult.data ?? []) as Array<Record<string, unknown>>;
  const submissions = (submissionsResult.data ?? []) as Array<{ id: string; team_id: string; version: number; status: string; submitted_at: string | null }>;
  const categoryCodes = new Map(categories.map((category) => [category.id, category.code]));
  const participants = (participantsResult.data ?? []) as Array<{ team_id: string | null; attendance_status: string }>;
  return (teamsResult.data ?? []).map((team) => {
    const teamId = String(team.id);
    const latest = submissions.find((submission) => submission.team_id === teamId);
    const teamItems = latest ? items.filter((item) => item.submission_id === latest.id) : [];
    const presentParticipants = participants.filter((participant) => participant.team_id === teamId && participant.attendance_status === "present").length;
    const engineItems = teamItems.map((item) => toResultItemInput(item, categoryCodes.get(String(item.category_rule_id)) ?? ""));
    const score = latest ? calculateSpogomiCompetitionResult({ regulation, items: engineItems, presentParticipants }) : null;
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
