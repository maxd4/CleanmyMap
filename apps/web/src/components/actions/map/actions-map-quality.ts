import type { ActionMapItem } from "@/lib/actions/types";
import {
  getGeometryPresentation,
  mapItemCoordinates,
} from "@/lib/actions/data-contract";

export type ActionsMapGeoQuality = {
  total: number;
  missingCoordinates: number;
  realGeometry: number;
  estimatedGeometry: number;
  fallbackPoint: number;
};

export function buildActionsMapGeoQuality(
  items: ActionMapItem[],
): ActionsMapGeoQuality {
  return items.reduce<ActionsMapGeoQuality>(
    (acc, item) => {
      const coords = mapItemCoordinates(item);
      const geometry = getGeometryPresentation(item);

      acc.total += 1;
      if (coords.latitude === null || coords.longitude === null) {
        acc.missingCoordinates += 1;
      }
      if (geometry.reality === "real") {
        acc.realGeometry += 1;
      } else if (geometry.reality === "estimated") {
        acc.estimatedGeometry += 1;
      } else {
        acc.fallbackPoint += 1;
      }

      return acc;
    },
    {
      total: 0,
      missingCoordinates: 0,
      realGeometry: 0,
      estimatedGeometry: 0,
      fallbackPoint: 0,
    },
  );
}
