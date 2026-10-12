import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrganizerDirectoryEntries } from "@/lib/actions/association-options";
import { normalizeOrganizerName } from "@/lib/actions/organizer-directory-registry";
import type { WasteCategorySlug } from "@/lib/waste/types";
import {
  aggregateSpogomiEnvironmentalProjection,
  deriveSpogomiEnvironmentalMapping,
  type SpogomiConsolidationInput,
  type SpogomiConsolidationProjection,
  type SpogomiConsolidationParticipant,
  type SpogomiConsolidationSourceItem,
  type SpogomiEnvironmentalMapping,
  type SpogomiOfficialRouteReference,
  SPOGOMI_ENVIRONMENTAL_MAPPING_VERSION,
} from "./consolidation";

type EventRow = {
  id: string;
  action_id: string;
  name: string;
  location_label: string;
  starts_at: string;
  ends_at: string | null;
  state: string;
  environmental_mapping_version: string;
};

type CategoryRow = {
  id: string;
  code: string;
  label: string;
  measurement_kind: "mass" | "count" | "volume";
  unit: string;
  environmental_category_slug: string | null;
};

type PersistedMappingRow = {
  category_rule_id: string;
  mapping_version: string;
  category_code: string;
  environmental_category_slug: string | null;
  source_field: SpogomiEnvironmentalMapping["sourceField"];
  source_unit: string;
  target_unit: SpogomiEnvironmentalMapping["targetUnit"];
  unit_factor_to_target: number | string | null;
  counts_toward_total: boolean;
  is_megots: boolean;
  mapping_status: SpogomiEnvironmentalMapping["status"];
  exclusion_reason: string | null;
};

type ActionRow = {
  organizer_id: string | null;
  organizer_name: string | null;
  organizer_type: string | null;
};

const WASTE_CATEGORY_SLUGS: ReadonlySet<string> = new Set([
  "cigarette_butt",
  "nicotine_pouch",
  "plastic",
  "glass",
  "broken_glass",
  "metal",
  "mixed_residual",
  "bulky_furniture",
  "wood",
  "electrical_equipment",
  "battery",
  "medicine",
  "sharps",
  "other",
]);

function asWasteCategorySlug(value: string | null): WasteCategorySlug | null {
  return value && WASTE_CATEGORY_SLUGS.has(value) ? value as WasteCategorySlug : null;
}

function persistedMapping(row: PersistedMappingRow): SpogomiEnvironmentalMapping {
  return {
    categoryRuleId: row.category_rule_id,
    categoryCode: row.category_code,
    mappingVersion: row.mapping_version,
    environmentalCategorySlug: asWasteCategorySlug(row.environmental_category_slug),
    sourceField: row.source_field,
    sourceUnit: row.source_unit,
    targetUnit: row.target_unit,
    unitFactorToTarget: row.unit_factor_to_target === null ? null : Number(row.unit_factor_to_target),
    countsTowardTotal: Boolean(row.counts_toward_total),
    isMegots: Boolean(row.is_megots),
    status: row.mapping_status,
    exclusionReason: row.exclusion_reason,
  };
}

function asRoute(value: unknown): SpogomiOfficialRouteReference | null {
  if (!value || typeof value !== "object") return null;
  const row = value as {
    source?: unknown;
    file_name?: unknown;
    point_count?: unknown;
    reference_distance_km?: unknown;
    inferred_topology?: unknown;
    geometry_geojson?: unknown;
  };
  const geometry = row.geometry_geojson && typeof row.geometry_geojson === "object"
    ? row.geometry_geojson as { type?: unknown; coordinates?: unknown }
    : null;
  const coordinates = Array.isArray(geometry?.coordinates)
    ? geometry.coordinates.filter((coordinate): coordinate is [number, number] =>
        Array.isArray(coordinate) && coordinate.length === 2 && typeof coordinate[0] === "number" && typeof coordinate[1] === "number",
      )
    : [];
  if (
    row.source !== "official_reference" ||
    typeof row.file_name !== "string" ||
    typeof row.point_count !== "number" ||
    typeof row.reference_distance_km !== "number" ||
    (row.inferred_topology !== "loop" && row.inferred_topology !== "point_to_point") ||
    geometry?.type !== "LineString" ||
    coordinates.length < 2
  ) return null;
  return {
    source: "official_reference",
    fileName: row.file_name,
    pointCount: row.point_count,
    referenceDistanceKm: row.reference_distance_km,
    inferredTopology: row.inferred_topology,
    geometryGeojson: { type: "LineString", coordinates },
    note: "Parcours officiel de référence, non observé sur le terrain.",
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, canonicalize(nested)]));
  }
  return value;
}

function sourceHash(input: SpogomiConsolidationInput, projection: Omit<SpogomiConsolidationProjection, "sourceHash">): string {
  return createHash("sha256").update(JSON.stringify(canonicalize({ input, projection }))).digest("hex");
}

function resolveSPOGOMIFranceOrganizer(action: ActionRow): SpogomiConsolidationInput["organizer"] {
  const target = normalizeOrganizerName("SPOGOMI France");
  const staticEntry = getOrganizerDirectoryEntries("association").find((entry) => normalizeOrganizerName(entry.name) === target);
  if (staticEntry) return { id: staticEntry.id, name: staticEntry.name, organizerType: "association" };
  if (action.organizer_id && action.organizer_name && action.organizer_type === "association" && normalizeOrganizerName(action.organizer_name) === target) {
    return { id: action.organizer_id, name: action.organizer_name, organizerType: "association" };
  }
  return null;
}

export type SpogomiConsolidationPreview = {
  event: Pick<EventRow, "id" | "action_id" | "name" | "location_label" | "starts_at" | "ends_at" | "state" | "environmental_mapping_version">;
  mappings: SpogomiEnvironmentalMapping[];
  currentProjection: { id: string; projectionRevision: number; sourceHash: string; status: string } | null;
  projection: SpogomiConsolidationProjection;
};

async function loadConsolidationInput(supabase: SupabaseClient, eventId: string): Promise<{ event: EventRow; input: SpogomiConsolidationInput }> {
  const eventResult = await supabase.from("spogomi_events").select("id, action_id, name, location_label, starts_at, ends_at, state, environmental_mapping_version").eq("id", eventId).maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) throw new Error("SPOGOMI event not found.");
  const event = eventResult.data as EventRow;
  const [actionResult, categoriesResult, mappingsResult, teamsResult, submissionsResult, itemsResult, participantsResult, routeResult] = await Promise.all([
    supabase.from("actions").select("organizer_id, organizer_name, organizer_type").eq("id", event.action_id).single(),
    supabase.from("spogomi_category_rules").select("id, code, label, measurement_kind, unit, environmental_category_slug").eq("event_id", event.id).order("display_order"),
    supabase.from("spogomi_environment_category_mappings").select("category_rule_id, mapping_version, category_code, environmental_category_slug, source_field, source_unit, target_unit, unit_factor_to_target, counts_toward_total, is_megots, mapping_status, exclusion_reason").eq("event_id", event.id).eq("mapping_version", event.environmental_mapping_version),
    supabase.from("spogomi_teams").select("id, team_number, public_name, certified_submission_id").eq("event_id", event.id).order("team_number"),
    supabase.from("spogomi_result_submissions").select("id, team_id, status").eq("event_id", event.id),
    supabase.from("spogomi_result_items").select("submission_id, category_rule_id, quantity, mass_grams, object_count, provenance, measurement_method, source_reference").eq("event_id", event.id),
    supabase.from("spogomi_participants").select("id, team_id, attendance_status, registration_status").eq("event_id", event.id),
    supabase.from("spogomi_event_routes").select("source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson").eq("event_id", event.id).maybeSingle(),
  ]);
  for (const result of [actionResult, categoriesResult, mappingsResult, teamsResult, submissionsResult, itemsResult, participantsResult, routeResult]) if (result.error) throw result.error;
  const action = actionResult.data as ActionRow;
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const persisted = new Map(((mappingsResult.data ?? []) as unknown as PersistedMappingRow[]).map((row) => [row.category_rule_id, persistedMapping(row)]));
  const mappings = categories.map((category) => deriveSpogomiEnvironmentalMapping({
    categoryRuleId: category.id,
    categoryCode: category.code,
    measurementKind: category.measurement_kind,
    unit: category.unit,
    environmentalCategorySlug: asWasteCategorySlug(category.environmental_category_slug),
    mappingVersion: event.environmental_mapping_version || SPOGOMI_ENVIRONMENTAL_MAPPING_VERSION,
    persisted: persisted.get(category.id) ?? null,
  }));
  const submissions = new Map((submissionsResult.data ?? []).map((row) => [String(row.id), row as { id: string; team_id: string; status: string }]));
  const rawItems = (itemsResult.data ?? []) as Array<Record<string, unknown>>;
  const teams = (teamsResult.data ?? []).map((row) => {
    const teamId = String(row.id);
    const submissionId = row.certified_submission_id ? String(row.certified_submission_id) : null;
    const submission = submissionId ? submissions.get(submissionId) : null;
    const teamItems: SpogomiConsolidationSourceItem[] = rawItems.filter((item) => String(item.submission_id) === submissionId).map((item) => {
      const category = categories.find((candidate) => candidate.id === String(item.category_rule_id));
      return {
        categoryRuleId: String(item.category_rule_id),
        categoryCode: category?.code ?? "unknown",
        categoryLabel: category?.label ?? "Catégorie inconnue",
        quantity: item.quantity === null || item.quantity === undefined ? null : Number(item.quantity),
        massGrams: item.mass_grams === null || item.mass_grams === undefined ? null : Number(item.mass_grams),
        objectCount: item.object_count === null || item.object_count === undefined ? null : Number(item.object_count),
        provenance: [item.provenance, item.measurement_method, item.source_reference]
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value) => value.trim())
          .join(" · "),
        measurementMethod: typeof item.measurement_method === "string" ? item.measurement_method : null,
        sourceReference: typeof item.source_reference === "string" ? item.source_reference : null,
        submissionId: submissionId ?? "",
        teamId,
      };
    });
    return {
      teamId,
      teamNumber: Number(row.team_number),
      publicName: String(row.public_name),
      certifiedSubmissionId: submissionId,
      certifiedSubmissionStatus: submission?.status ?? null,
      items: teamItems,
    };
  });
  const participants = ((participantsResult.data ?? []) as Array<Record<string, unknown>>).map((participant): SpogomiConsolidationParticipant => ({
    id: String(participant.id),
    teamId: participant.team_id ? String(participant.team_id) : null,
    attendanceStatus: String(participant.attendance_status),
    registrationStatus: String(participant.registration_status),
  }));
  const input: SpogomiConsolidationInput = {
    eventId: event.id,
    actionId: event.action_id,
    mappingVersion: event.environmental_mapping_version || SPOGOMI_ENVIRONMENTAL_MAPPING_VERSION,
    mappings,
    teams,
    participants,
    officialRoute: asRoute(routeResult.data),
    organizer: resolveSPOGOMIFranceOrganizer(action),
  };
  return { event, input };
}

export async function buildSpogomiConsolidationPreview(params: { supabase: SupabaseClient; eventId: string }): Promise<SpogomiConsolidationPreview> {
  const { event, input } = await loadConsolidationInput(params.supabase, params.eventId);
  const baseProjection = aggregateSpogomiEnvironmentalProjection(input);
  const hash = sourceHash(input, baseProjection);
  const projection: SpogomiConsolidationProjection = {
    ...baseProjection,
    sourceHash: hash,
    consolidation: { ...baseProjection.consolidation, sourceHash: hash },
  };
  const existing = await params.supabase.from("spogomi_action_consolidations").select("id, projection_revision, source_hash, status").eq("event_id", event.id).eq("is_current", true).maybeSingle();
  if (existing.error) throw existing.error;
  return {
    event,
    mappings: input.mappings,
    currentProjection: existing.data ? { id: String(existing.data.id), projectionRevision: Number(existing.data.projection_revision), sourceHash: String(existing.data.source_hash), status: String(existing.data.status) } : null,
    projection,
  };
}

export async function publishSpogomiConsolidation(params: {
  supabase: SupabaseClient;
  eventId: string;
  publishedByClerkId: string;
  expectedSourceHash: string;
}) {
  const preview = await buildSpogomiConsolidationPreview({ supabase: params.supabase, eventId: params.eventId });
  if (preview.projection.sourceHash !== params.expectedSourceHash) throw new Error("Conflict: le bilan a changé depuis son aperçu.");
  if (!preview.projection.readyForPublication) throw new Error("Validation: le bilan environnemental est incomplet ou contient des mesures exclues.");
  const rpc = await params.supabase.rpc("consolidate_spogomi_event_to_action", {
    p_event_id: params.eventId,
    p_consolidation_key: preview.projection.consolidationKey,
    p_source_hash: preview.projection.sourceHash,
    p_projection_version: preview.projection.projectionVersion,
    p_mappings: preview.mappings.map((mapping) => ({
      category_rule_id: mapping.categoryRuleId,
      category_code: mapping.categoryCode,
      environmental_category_slug: mapping.environmentalCategorySlug,
      source_field: mapping.sourceField,
      source_unit: mapping.sourceUnit,
      target_unit: mapping.targetUnit,
      unit_factor_to_target: mapping.unitFactorToTarget,
      counts_toward_total: mapping.countsTowardTotal,
      is_megots: mapping.isMegots,
      mapping_status: mapping.status,
      exclusion_reason: mapping.exclusionReason,
    })),
    p_projection: preview.projection,
    p_published_by_clerk_id: params.publishedByClerkId,
  });
  if (rpc.error) {
    if (rpc.error.code === "40001" || rpc.error.code === "23514") throw new Error(`Conflict: ${rpc.error.message}`);
    throw rpc.error;
  }
  return rpc.data;
}
