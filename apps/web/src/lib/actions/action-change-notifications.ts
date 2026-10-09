import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionPreparationData } from "./types";
import type { ActionRow } from "@/types/database";
import { normalizeClockTime } from "./time-contract";
import { emitActionUpdateNotifications } from "./action-update-notifications";

export type ActionChangeKind =
  | "meeting_point"
  | "schedule"
  | "route"
  | "safety"
  | "materials"
  | "cancellation";

export const ACTION_CHANGE_LABELS: Record<ActionChangeKind, { fr: string; en: string }> = {
  meeting_point: { fr: "Rendez-vous modifié", en: "Meeting point changed" },
  schedule: { fr: "Horaire modifié", en: "Schedule changed" },
  route: { fr: "Parcours actualisé", en: "Route updated" },
  safety: { fr: "Consignes de sécurité modifiées", en: "Safety instructions changed" },
  materials: { fr: "Matériel à prévoir modifié", en: "Equipment to bring changed" },
  cancellation: { fr: "Action annulée", en: "Action cancelled" },
};

export type ActionChangeSource = Pick<
  ActionRow,
  | "published_at"
  | "action_phase"
  | "status"
  | "action_date"
  | "location_label"
  | "latitude"
  | "longitude"
  | "derived_geometry_kind"
  | "derived_geometry_geojson"
  | "geometry_source"
  | "event_start_time"
  | "event_end_time"
  | "preparation_data"
>;

function asPreparationData(value: unknown): ActionPreparationData {
  return value && typeof value === "object" ? value as ActionPreparationData : {};
}
function readString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function readNestedRouteValue(preparationData: ActionPreparationData): unknown {
  const active = preparationData.routeVersioning?.active;
  return active?.calculation?.snapshotHash ?? active?.operationalRoute ?? preparationData.operationalRoute ?? null;
}

function valuesDiffer(current: unknown, next: unknown): boolean {
  return JSON.stringify(current ?? null) !== JSON.stringify(next ?? null);
}

function normalizeMeaningfulText(value: unknown): string | null {
  const text = readString(value);
  if (!text) return null;
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function meaningfulTextChanged(current: unknown, next: unknown): boolean {
  return normalizeMeaningfulText(current) !== normalizeMeaningfulText(next);
}

function operationalPreparationChanged(
  current: ActionPreparationData,
  next: ActionPreparationData,
): Pick<Record<ActionChangeKind, boolean>, "meeting_point" | "schedule" | "route" | "safety" | "materials"> {
  return {
    meeting_point: readString(current.pointDeRendezVous) !== readString(next.pointDeRendezVous),
    schedule:
      normalizeClockTime(current.meetingTime) !== normalizeClockTime(next.meetingTime) ||
      normalizeClockTime(current.departureTime) !== normalizeClockTime(next.departureTime),
    route: valuesDiffer(readNestedRouteValue(current), readNestedRouteValue(next)),
    safety: meaningfulTextChanged(current.safetyInstructions, next.safetyInstructions),
    materials: meaningfulTextChanged(current.recommendedMaterials, next.recommendedMaterials),
  };
}

function hasUpdateField(updateData: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(updateData, field);
}

function nextPreparationData(
  current: ActionChangeSource,
  updateData: Record<string, unknown>,
): { current: ActionPreparationData; next: ActionPreparationData } {
  const currentPreparation = asPreparationData(current.preparation_data);
  return {
    current: currentPreparation,
    next: hasUpdateField(updateData, "preparation_data")
      ? { ...currentPreparation, ...asPreparationData(updateData.preparation_data) }
      : currentPreparation,
  };
}

function hasScheduleChange(
  current: ActionChangeSource,
  updateData: Record<string, unknown>,
  preparation: { current: ActionPreparationData; next: ActionPreparationData },
): boolean {
  const dateChanged = hasUpdateField(updateData, "action_date") &&
    updateData.action_date !== current.action_date;
  const nextStart = hasUpdateField(updateData, "event_start_time")
    ? updateData.event_start_time as string | null
    : current.event_start_time;
  const nextEnd = hasUpdateField(updateData, "event_end_time")
    ? updateData.event_end_time as string | null
    : current.event_end_time;
  const eventWindowChanged =
    normalizeClockTime(nextStart) !== normalizeClockTime(current.event_start_time) ||
    normalizeClockTime(nextEnd) !== normalizeClockTime(current.event_end_time);
  const preparationChanges = operationalPreparationChanged(preparation.current, preparation.next);
  return dateChanged || eventWindowChanged || preparationChanges.schedule;
}

function hasMeetingPointChange(
  current: ActionChangeSource,
  updateData: Record<string, unknown>,
  preparation: { current: ActionPreparationData; next: ActionPreparationData },
): boolean {
  const locationChanged = hasUpdateField(updateData, "location_label") &&
    updateData.location_label !== current.location_label;
  const coordinatesChanged =
    (hasUpdateField(updateData, "latitude") && updateData.latitude !== current.latitude) ||
    (hasUpdateField(updateData, "longitude") && updateData.longitude !== current.longitude);
  const preparationChanges = operationalPreparationChanged(preparation.current, preparation.next);
  return locationChanged || coordinatesChanged || preparationChanges.meeting_point;
}

function hasRouteChange(
  current: ActionChangeSource,
  updateData: Record<string, unknown>,
  preparation: { current: ActionPreparationData; next: ActionPreparationData },
): boolean {
  const nextGeometry = {
    kind: hasUpdateField(updateData, "derived_geometry_kind")
      ? updateData.derived_geometry_kind
      : current.derived_geometry_kind,
    geojson: hasUpdateField(updateData, "derived_geometry_geojson")
      ? updateData.derived_geometry_geojson
      : current.derived_geometry_geojson,
    source: hasUpdateField(updateData, "geometry_source")
      ? updateData.geometry_source
      : current.geometry_source,
  };
  const preparationChanges = operationalPreparationChanged(preparation.current, preparation.next);
  return valuesDiffer(nextGeometry.kind, current.derived_geometry_kind) ||
    valuesDiffer(nextGeometry.geojson, current.derived_geometry_geojson) ||
    valuesDiffer(nextGeometry.source, current.geometry_source) ||
    preparationChanges.route;
}

/**
 * Classifies only operational changes that can affect a published future action.
 * Descriptions, estimates, formalities and other preparation metadata are
 * intentionally ignored here. Safety and equipment changes are included only
 * when their normalized content changes, so formatting-only edits do not
 * create an action event.
 */
export function detectActionChangeKinds(params: {
  current: ActionChangeSource;
  updateData: Record<string, unknown>;
}): ActionChangeKind[] {
  const { current, updateData } = params;
  if (!current.published_at || current.action_phase !== "pre_action") return [];

  const nextStatus = updateData.status;
  if (nextStatus === "cancelled" && current.status !== "cancelled") return ["cancellation"];
  if (current.status === "cancelled") return [];

  const preparation = nextPreparationData(current, updateData);
  const kinds: ActionChangeKind[] = [];
  if (hasMeetingPointChange(current, updateData, preparation)) kinds.push("meeting_point");
  if (hasScheduleChange(current, updateData, preparation)) kinds.push("schedule");
  if (hasRouteChange(current, updateData, preparation)) kinds.push("route");
  const preparationChanges = operationalPreparationChanged(preparation.current, preparation.next);
  if (preparationChanges.safety) kinds.push("safety");
  if (preparationChanges.materials) kinds.push("materials");
  return kinds;
}

export function buildActionChangeEventKey(params: {
  actionId: string;
  revision: string;
  changeKinds: readonly ActionChangeKind[];
}): string {
  const kinds = [...new Set(params.changeKinds)].sort().join(",");
  return `action_update:${params.actionId}:${params.revision}:${kinds}`;
}

export async function emitPublishedActionUpdateIfNeeded(params: {
  supabase: SupabaseClient;
  actionId: string;
  actorUserId: string;
  current: ActionChangeSource;
  updateData: Record<string, unknown>;
  actionWriteSucceeded: boolean;
  persistedActionRevision: string | null;
}): Promise<void> {
  if (!params.actionWriteSucceeded || !params.persistedActionRevision) return;

  const changeKinds = detectActionChangeKinds({
    current: params.current,
    updateData: params.updateData,
  });
  if (changeKinds.length === 0) return;

  await emitActionUpdateNotifications({
    supabase: params.supabase,
    actionId: params.actionId,
    actorUserId: params.actorUserId,
    changeKinds,
    eventKey: buildActionChangeEventKey({
      actionId: params.actionId,
      revision: params.persistedActionRevision,
      changeKinds,
    }),
  });
}
