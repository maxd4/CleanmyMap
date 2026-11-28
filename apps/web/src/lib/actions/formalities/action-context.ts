import { createHash } from "node:crypto";
import { resolveActionTerritory } from "@/lib/geo/action-territory-resolver";
import type { ActionRow } from "@/types/database";
import { buildFormalitiesTerritoryFingerprint } from "./rules";
import { normalizeActionFormalitiesWorkflow } from "./workflow";
import {
  actionFormalitiesFactsSchema,
  deriveActionFormalitiesFacts,
} from "./facts";
import type { ActionFormalitiesFacts } from "./qualification";

/**
 * Rebuilds the facts used by the canonical qualification from the latest
 * persisted action. User facts are retained; the territory is refreshed from
 * its location and survives a provider outage only when that location is unchanged.
 */
export async function deriveActionFormalitiesFactsFromAction(
  action: Pick<
    ActionRow,
    | "department_code"
    | "department_name"
    | "action_date"
    | "location_label"
    | "latitude"
    | "longitude"
    | "derived_geometry_kind"
    | "derived_geometry_geojson"
    | "preparation_data"
  >,
): Promise<ActionFormalitiesFacts> {
  const resolvedTerritory = await resolveActionTerritory({
    latitude: action.latitude,
    longitude: action.longitude,
    geometry: {
      kind: action.derived_geometry_kind,
      geojson: action.derived_geometry_geojson,
    },
    departmentCode: action.department_code,
    departmentName: action.department_name,
  });
  const fallback = deriveActionFormalitiesFacts({
    departmentCode: action.department_code,
    departmentName: action.department_name,
    resolvedTerritory,
    resolvedPoint: action.derived_geometry_kind === "point",
    plannedObjective: action.preparation_data?.plannedObjective,
  });
  const parsed = actionFormalitiesFactsSchema.safeParse(
    action.preparation_data?.formalitiesContext,
  );

  const previousWorkflow = normalizeActionFormalitiesWorkflow(
    action.preparation_data?.formalitiesWorkflow,
  );
  const previousTerritory = previousWorkflow?.trace.determiningFacts.territory;
  const currentLocationFingerprint = buildFormalitiesLocationFingerprint(action);
  const preserveLastVerifiedTerritory = Boolean(
      (!resolvedTerritory || resolvedTerritory.source === "persisted_department") &&
      previousTerritory?.jurisdictionEvidence === "metropolitan_point" &&
      previousWorkflow?.trace.actionLocationFingerprint === currentLocationFingerprint,
  );
  const currentTerritory = preserveLastVerifiedTerritory && previousTerritory
    ? previousTerritory
    : fallback.territory;

  if (!parsed.success) return { ...fallback, territory: currentTerritory };

  return {
    ...parsed.data,
    isCortegeOrGathering: parsed.data.isCortegeOrGathering ?? "unknown",
    territory: currentTerritory,
  };
}

export function buildFormalitiesLocationFingerprint(
  action: Pick<
    ActionRow,
    | "location_label"
    | "latitude"
    | "longitude"
    | "department_code"
    | "department_name"
    | "derived_geometry_kind"
    | "derived_geometry_geojson"
  >,
): string {
  const geometry = action.derived_geometry_geojson
    ? (() => {
        try {
          return JSON.parse(action.derived_geometry_geojson) as unknown;
        } catch {
          return action.derived_geometry_geojson;
        }
      })()
    : null;
  return createHash("sha256")
    .update(JSON.stringify({
      locationLabel: typeof action.location_label === "string" ? action.location_label.trim() : null,
      latitude: action.latitude,
      longitude: action.longitude,
      departmentCode: action.department_code,
      departmentName: action.department_name,
      geometryKind: action.derived_geometry_kind,
      geometry,
    }))
    .digest("hex");
}

export function buildFormalitiesActionDependencies(
  action: Pick<
    ActionRow,
    | "location_label"
    | "action_date"
    | "latitude"
    | "longitude"
    | "department_code"
    | "department_name"
    | "derived_geometry_kind"
    | "derived_geometry_geojson"
  >,
  territory: ActionFormalitiesFacts["territory"],
) {
  return {
    locationLabel: action.location_label ?? "",
    actionDate: action.action_date ?? null,
    territoryFingerprint: buildFormalitiesTerritoryFingerprint(territory),
    locationFingerprint: buildFormalitiesLocationFingerprint(action),
  };
}
