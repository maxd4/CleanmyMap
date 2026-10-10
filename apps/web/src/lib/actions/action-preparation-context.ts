import type { ActionEditorRecord } from "./http";
import type { ActionPreparationData } from "./types";
import type { PlannerActionHandoff } from "@/lib/route/route-operational";
import {
  normalizePreparationChecklist,
  normalizeSuggestedMaterials,
  type ActionMaterialSuggestion,
  type ActionPreparationChecklistItem,
} from "./preparation-contract";

export type PreparationSelection = {
  actionDate: string;
  departureTime?: string;
  source: "weather-date" | "weather-slot";
  weatherLocationLabel?: string;
};

export type ActionPreparationContext = {
  actionId: string | null;
  locationLabel: string;
  actionDate: string;
  departureTime: string;
  latitude: string;
  longitude: string;
  plannerHandoff: PlannerActionHandoff | null;
  confirmedSelection: PreparationSelection | null;
  preparationChecklist: ActionPreparationChecklistItem[] | null;
  suggestedMaterials: ActionMaterialSuggestion[] | null;
  materialsProvided: string | null;
  recommendedMaterials: string | null;
};

type DraftPreparationSource = Partial<{
  actionDate: string;
  departureTime: string;
  locationLabel: string;
  departureLocationLabel: string;
  latitude: string;
  longitude: string;
  preparationChecklist: unknown;
  suggestedMaterials: unknown;
  materialsProvided: string;
  recommendedMaterials: string;
}>;

function text(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}
function coordinateValue(value: unknown, minimum: number, maximum: number): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? numeric : null;
}

function coordinatePair(latitude: unknown, longitude: unknown): Pick<ActionPreparationContext, "latitude" | "longitude"> | null {
  const validLatitude = coordinateValue(latitude, -90, 90);
  const validLongitude = coordinateValue(longitude, -180, 180);
  if (validLatitude === null || validLongitude === null) return null;
  return { latitude: String(validLatitude), longitude: String(validLongitude) };
}
function preparationFor(source: ActionEditorRecord | null | undefined): ActionPreparationData {
  return source?.preparationData ?? {};
}

function matchingPlannerHandoff(
  action: ActionEditorRecord | null | undefined,
  handoff: PlannerActionHandoff | null | undefined,
): PlannerActionHandoff | null {
  if (!handoff) return null;
  if (!action?.id) return handoff;
  return handoff.actionId === action.id ? handoff : null;
}

function preparationLocation(
  action: ActionEditorRecord | null | undefined,
  draft: DraftPreparationSource | null | undefined,
  preparation: ActionPreparationData,
  handoffPreparation: ActionPreparationData,
): string {
  return text(
    action?.departureLocationLabel,
    action?.locationLabel,
    preparation.pointDeRendezVous,
    draft?.departureLocationLabel,
    draft?.locationLabel,
    handoffPreparation.pointDeRendezVous,
  );
}

function preparationCoordinates(
  action: ActionEditorRecord | null | undefined,
  draft: DraftPreparationSource | null | undefined,
  handoff: PlannerActionHandoff | null,
): Pick<ActionPreparationContext, "latitude" | "longitude"> {
  const candidates = [
    coordinatePair(action?.latitude, action?.longitude),
    coordinatePair(draft?.latitude, draft?.longitude),
    coordinatePair(
      handoff?.operationalRoute.zones.departure.coordinate?.[0],
      handoff?.operationalRoute.zones.departure.coordinate?.[1],
    ),
  ];
  return candidates.find((candidate): candidate is Pick<ActionPreparationContext, "latitude" | "longitude"> => candidate !== null) ?? {
    latitude: "",
    longitude: "",
  };
}

function firstText(...values: unknown[]): string | null {
  const value = values.find((candidate) => typeof candidate === "string");
  return typeof value === "string" ? value : null;
}

function firstChecklist(...values: unknown[]): ActionPreparationChecklistItem[] | null {
  for (const value of values) {
    const normalized = normalizePreparationChecklist(value);
    if (normalized) return normalized;
  }
  return null;
}

function firstSuggestedMaterials(...values: unknown[]): ActionMaterialSuggestion[] | null {
  for (const value of values) {
    const normalized = normalizeSuggestedMaterials(value);
    if (normalized) return normalized;
  }
  return null;
}

export function buildActionPreparationContext({
  action,
  draft,
  plannerHandoff,
}: {
  action?: ActionEditorRecord | null;
  draft?: DraftPreparationSource | null;
  plannerHandoff?: PlannerActionHandoff | null;
}): ActionPreparationContext {
  const preparation = preparationFor(action);
  const matchingHandoff = matchingPlannerHandoff(action, plannerHandoff);
  const handoffPreparation = matchingHandoff?.preparationData ?? {};
  const coordinates = preparationCoordinates(action, draft, matchingHandoff);

  return {
    actionId: action?.id ?? matchingHandoff?.actionId ?? null,
    locationLabel: preparationLocation(action, draft, preparation, handoffPreparation),
    actionDate: text(action?.actionDate, preparation.actionDate, draft?.actionDate, handoffPreparation.actionDate),
    departureTime: text(preparation.departureTime, draft?.departureTime, handoffPreparation.departureTime),
    ...coordinates,
    plannerHandoff: matchingHandoff,
    confirmedSelection: null,
    preparationChecklist: firstChecklist(
      preparation.preparationChecklist,
      draft?.preparationChecklist,
      handoffPreparation.preparationChecklist,
    ),
    suggestedMaterials: firstSuggestedMaterials(
      preparation.suggestedMaterials,
      draft?.suggestedMaterials,
      handoffPreparation.suggestedMaterials,
    ),
    materialsProvided: firstText(
      preparation.materialsProvided,
      draft?.materialsProvided,
      handoffPreparation.materialsProvided,
    ),
    recommendedMaterials: firstText(
      preparation.recommendedMaterials,
      draft?.recommendedMaterials,
      handoffPreparation.recommendedMaterials,
    ),
  };
}
export function resolvePreparationSelection(
  context: ActionPreparationContext,
  selection: PreparationSelection,
  decision: "ask" | "replace" | "preserve" = "ask",
): {
  status: "applied" | "conflict" | "preserved";
  context: ActionPreparationContext;
  conflicts: Array<"actionDate" | "departureTime">;
} {
  const conflicts: Array<"actionDate" | "departureTime"> = [];
  if (context.actionDate && context.actionDate !== selection.actionDate) conflicts.push("actionDate");
  if (selection.departureTime && context.departureTime && context.departureTime !== selection.departureTime) conflicts.push("departureTime");
  if (conflicts.length > 0 && decision === "ask") return { status: "conflict", context, conflicts };
  if (decision === "preserve") return { status: "preserved", context, conflicts };

  return {
    status: "applied",
    conflicts,
    context: {
      ...context,
      actionDate: selection.actionDate,
      departureTime: selection.departureTime ?? context.departureTime,
      confirmedSelection: selection,
    },
  };
}
