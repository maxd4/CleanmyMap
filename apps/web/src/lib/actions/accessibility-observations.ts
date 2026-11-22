import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionAccessibilityObservedMeasure } from "./preparation-contract";
import { normalizeAccessibilityObservedMeasures } from "./preparation-contract";
import type { ActionPreparationData } from "./types";

export type AccessibilityObservationMeasure = {
  key: string;
  definitionHash: string;
  label: string;
};

export class AccessibilityObservationConflictError extends Error {
  constructor(message = "The action or observation definition changed.") {
    super(message);
    this.name = "AccessibilityObservationConflictError";
  }
}

export class AccessibilityObservationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessibilityObservationValidationError";
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableValue(nested)]),
  );
}

function hashDefinition(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isValidAccessibilityObservedDate(value: unknown, now = new Date()): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf())
    && parsed.toISOString().slice(0, 10) === value
    && value <= now.toISOString().slice(0, 10);
}

export function buildDeclaredAccessibilityObservationMeasures(
  value: unknown,
): AccessibilityObservationMeasure[] {
  const preparation = (isRecord(value) ? value : {}) as ActionPreparationData;
  const measures: AccessibilityObservationMeasure[] = [];
  const add = (key: string, label: string, kind: string, definition: unknown) => {
    measures.push({ key, label, definitionHash: hashDefinition({ kind, definition }) });
  };

  if (preparation.accessibilityPausePlan?.trim()) {
    add("pause-plan", "Modalités de pause prévues", "pause_plan", preparation.accessibilityPausePlan.trim());
  }
  if (preparation.accessibilityEarlyDeparturePlan?.trim()) {
    add("early-departure", "Sortie anticipée prévue", "early_departure_plan", preparation.accessibilityEarlyDeparturePlan.trim());
  }
  for (const mission of new Set((preparation.accessibilityAlternativeMissions ?? []).map((entry) => entry.trim()).filter(Boolean))) {
    const definitionHash = hashDefinition({ kind: "alternative_mission", definition: mission });
    measures.push({
      key: `alternative-mission:${definitionHash.slice(0, 32)}`,
      definitionHash,
      label: mission,
    });
  }

  const selectedVersionId = preparation.accessibilityAlternativeRouteVersionId;
  const versionHistory = preparation.routeVersioning?.history ?? [];
  const selectedVersion = versionHistory.find(({ versionId }) => versionId === selectedVersionId);
  if (selectedVersion) {
    add(
      `alternative-route:${selectedVersion.versionId}`,
      "Itinéraire alternatif sélectionné",
      "alternative_route_version",
      selectedVersion,
    );
  }
  if (preparation.accessibility?.trim()) {
    add("accessibility-conditions", "Conditions de parcours communiquées", "accessibility_conditions", {
      text: preparation.accessibility.trim(),
      source: preparation.accessibilityConditionsSource?.trim() ?? null,
      verifiedAt: preparation.accessibilityConditionsVerifiedAt ?? null,
    });
  }

  return measures;
}

export function getCurrentAccessibilityObservations(
  value: unknown,
): ActionAccessibilityObservedMeasure[] {
  const preparation = (isRecord(value) ? value : {}) as ActionPreparationData;
  const currentMeasures = new Map(
    buildDeclaredAccessibilityObservationMeasures(preparation)
      .map((measure) => [measure.key, measure]),
  );
  const stored = normalizeAccessibilityObservedMeasures(preparation.accessibilityObservedMeasures) ?? [];
  return stored.flatMap((entry) => {
    if (!entry || !isValidAccessibilityObservedDate(entry.observedAt)) return [];
    const current = currentMeasures.get(entry.key);
    if (!current || current.definitionHash !== entry.definitionHash) return [];
    return [{ ...entry, label: current.label }];
  });
}

export function getActionAccessibilityObservationState(value: unknown, revision: string) {
  const preparation = (isRecord(value) ? value : {}) as ActionPreparationData;
  return {
    revision,
    measures: buildDeclaredAccessibilityObservationMeasures(preparation),
    observations: getCurrentAccessibilityObservations(preparation),
  };
}

export async function updateActionAccessibilityObservation(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    expectedRevision: string;
    measurementKey: string;
    definitionHash: string;
    observed: boolean;
    evidenceKind?: ActionAccessibilityObservedMeasure["evidenceKind"];
    observedAt?: string;
  },
) {
  if (params.observed && !isValidAccessibilityObservedDate(params.observedAt)) {
    throw new AccessibilityObservationValidationError("Observation date must be a valid date no later than today.");
  }
  if (params.observed && params.evidenceKind !== "organizer_observation" && params.evidenceKind !== "participant_feedback") {
    throw new AccessibilityObservationValidationError("Observation evidence kind is invalid.");
  }

  const currentResult = await supabase
    .from("actions")
    .select("updated_at, preparation_data")
    .eq("id", params.actionId)
    .maybeSingle();
  if (currentResult.error) throw new Error("Action accessibility observation could not be loaded.");
  const current = currentResult.data as { updated_at?: unknown; preparation_data?: unknown } | null;
  if (!current || current.updated_at !== params.expectedRevision || typeof current.updated_at !== "string") {
    throw new AccessibilityObservationConflictError("The action changed. Reload it before recording the observation.");
  }

  const preparation = (isRecord(current.preparation_data) ? current.preparation_data : {}) as ActionPreparationData;
  const definition = buildDeclaredAccessibilityObservationMeasures(preparation)
    .find((measure) => measure.key === params.measurementKey && measure.definitionHash === params.definitionHash);
  if (!definition) {
    throw new AccessibilityObservationConflictError("The measured plan changed. Reload it before recording the observation.");
  }

  const existing = Array.isArray(preparation.accessibilityObservedMeasures)
    ? preparation.accessibilityObservedMeasures
    : [];
  const nextObservations = existing.filter((entry) => entry.key !== definition.key);
  if (params.observed) {
    nextObservations.push({
      key: definition.key,
      definitionHash: definition.definitionHash,
      label: definition.label,
      evidenceKind: params.evidenceKind!,
      observedAt: params.observedAt!,
    });
  }

  const update = await supabase
    .from("actions")
    .update({ preparation_data: { ...preparation, accessibilityObservedMeasures: nextObservations } })
    .eq("id", params.actionId)
    .eq("updated_at", params.expectedRevision)
    .select("updated_at")
    .maybeSingle();
  if (update.error) throw new Error("Action accessibility observation could not be saved.");
  if (!update.data || typeof update.data.updated_at !== "string") {
    throw new AccessibilityObservationConflictError("The action changed while the observation was being saved.");
  }
  return getActionAccessibilityObservationState(
    { ...preparation, accessibilityObservedMeasures: nextObservations },
    update.data.updated_at,
  );
}
