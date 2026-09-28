import type { ActionMapItem } from "@/lib/actions/types";
import type { CurrentPlaceStateMode } from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreReferences, PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import { isTrashSpotterSpotRecord } from "@/lib/actions/trash-spotter-actionable-candidates";
import { deriveMarkerCategories, type MarkerCategory } from "./map-marker-categories";
import { isTrashSpotterItem } from "./map/layers/map-layers";
import { createActionsMapViewport } from "./actions-map-canvas.utils";
import type { MapViewportState } from "@/lib/geo/map-viewport";

export function resolveActionsMapCanvasViewport({
  center,
  initialViewport,
  compact,
  recenterViewport,
}: {
  center: MapViewportState["center"];
  initialViewport: MapViewportState | null;
  compact: boolean;
  recenterViewport: MapViewportState | null;
}) {
  return {
    mapCenter: initialViewport?.center ?? center,
    mapZoom: initialViewport?.zoom ?? (compact ? 11 : 12),
    logicalRecenterViewport:
      recenterViewport ?? initialViewport ?? createActionsMapViewport(center, compact ? 11 : 12),
  };
}
export function resolveActionsMapCanvasTheme(isEmerald: boolean) {
  return {
    mapShellClasses: isEmerald
      ? "border-emerald-200/30 bg-[rgba(245,251,244,0.98)] shadow-[0_32px_64px_-12px_rgba(34,197,94,0.18)] ring-1 ring-emerald-200/20"
      : "border-sky-300/16 bg-[rgba(10,31,50,0.98)] shadow-[0_32px_64px_-12px_rgba(56,189,248,0.28)] ring-1 ring-sky-300/10",
    mapCanvasClass: isEmerald ? "bg-[rgba(244,249,241,0.98)]" : "bg-[rgba(10,31,50,0.98)]",
    layerButtonClasses: {
      active: isEmerald
        ? "border-emerald-300/35 bg-emerald-400/18 text-emerald-950"
        : "border-sky-300/35 bg-sky-400/18 text-sky-50",
      inactive: isEmerald
        ? "border-emerald-300/16 bg-white/78 text-emerald-900/58 hover:border-emerald-300/28 hover:text-emerald-950"
        : "border-sky-300/12 bg-[rgba(16,40,64,0.9)] text-sky-100/56 hover:border-sky-300/24 hover:text-sky-50",
    },
  };
}

export function deriveActionsMapCategoryCounts(
  sourceItems: ActionMapItem[],
  references: PollutionScoreReferences | null | undefined,
  scoreScope: PollutionScoreScope,
  displayMode: CurrentPlaceStateMode,
) {
  return sourceItems.reduce<Partial<Record<MarkerCategory, number>>>((counts, item) => {
    for (const category of deriveMarkerCategories(item, references, { scoreScope, displayMode })) {
      counts[category] = (counts[category] ?? 0) + 1;
    }
    return counts;
  }, {});
}

export function resolveActionsMapItemGroups(items: ActionMapItem[], selectedActionId: string | null) {
  return {
    mainItems: items.filter((item) => !isTrashSpotterSpotRecord(item)),
    trashSpotterItems: items.filter((item) => isTrashSpotterItem(item)),
    selectedItem: items.find((item) => item.id === selectedActionId) ?? null,
  };
}
