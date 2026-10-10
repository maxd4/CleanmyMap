import { resolveActionTerritory } from "@/lib/geo/action-territory-resolver";
import type { ActionRow } from "@/types/database";
import {
  actionFormalitiesFactsSchema,
  deriveActionFormalitiesFacts,
} from "./formalities-facts";
import type { ActionFormalitiesFacts } from "./formalities-qualification";

/**
 * Rebuilds the facts used by the canonical qualification from the latest
 * persisted action. User-provided facts are retained, but the territory is
 * always refreshed from the current action location when it is resolvable.
 */
export async function deriveActionFormalitiesFactsFromAction(
  action: Pick<
    ActionRow,
    | "department_code"
    | "department_name"
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
    plannedObjective: action.preparation_data?.plannedObjective,
  });
  const parsed = actionFormalitiesFactsSchema.safeParse(
    action.preparation_data?.formalitiesContext,
  );

  if (!parsed.success) return fallback;

  return {
    ...parsed.data,
    territory:
      resolvedTerritory || fallback.territory.code !== "FR-unknown"
        ? fallback.territory
        : parsed.data.territory,
  };
}
