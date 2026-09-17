import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { X } from "lucide-react";
import type { ActionMapItem } from "@/lib/actions/types";
import type {
  CurrentPlaceStateMode,
  CurrentPlaceStateViews,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import { mapItemCoordinates } from "@/lib/actions/data-contract";
import { resolveMapPlaceStateForItem } from "./actions-map-display-state";
import { resolveActionMapGeometryViewModel } from "./actions-map-geometry.utils";
import { ActionPopupContent } from "./action-popup-content";
import {
  fitActionGeometryBounds,
  resolvePointColor,
} from "./map-layers.shared";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";

type ActionSelectionPanelProps = {
  item: ActionMapItem;
  displayMode: CurrentPlaceStateMode;
  scoreScope: PollutionScoreScope;
  currentPlaceStateViews: readonly CurrentPlaceStateViews[];
  frameOnMount?: boolean;
  onClose: () => void;
};

export function ActionSelectionPanel({
  item,
  displayMode,
  scoreScope,
  currentPlaceStateViews,
  frameOnMount = false,
  onClose,
}: ActionSelectionPanelProps) {
  const map = useMap();
  const { references, isLoading: referencesLoading } =
    useActionPollutionScoreReferences();
  const framedActionIdRef = useRef<string | null>(null);
  const currentPlaceState = resolveMapPlaceStateForItem(
    currentPlaceStateViews,
    item,
    displayMode,
  );
  const geometry = resolveActionMapGeometryViewModel(item);
  const coordinates = mapItemCoordinates(item);
  const color = resolvePointColor(
    item,
    references,
    new Date(),
    displayMode,
    currentPlaceState,
    scoreScope,
    referencesLoading,
  );

  useEffect(() => {
    // The contextual panel is the selected-action surface. Close the Leaflet
    // popup opened by the marker so the same business content is not rendered
    // twice; the panel keeps the canonical geometry action below.
    map.closePopup();

    if (!frameOnMount || framedActionIdRef.current === item.id) {
      return;
    }

    if (geometry.positions.length > 1) {
      fitActionGeometryBounds(map, geometry.positions);
    } else if (
      coordinates.latitude !== null &&
      coordinates.longitude !== null
    ) {
      map.setView(
        [coordinates.latitude, coordinates.longitude],
        Math.max(map.getZoom(), 15),
        { animate: false },
      );
    }

    framedActionIdRef.current = item.id;
  }, [
    coordinates.latitude,
    coordinates.longitude,
    frameOnMount,
    geometry.positions,
    item.id,
    map,
  ]);

  return (
    <aside
      aria-label={`Détail de ${item.location_label}`}
      className="absolute inset-x-2 bottom-2 z-[1200] max-h-[min(72dvh,42rem)] overflow-y-auto rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_24px_64px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl md:bottom-auto md:left-auto md:right-3 md:top-16 md:w-[min(23rem,calc(100%-1.5rem))] md:max-h-[calc(100%-5.5rem)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <p className="cmm-text-caption font-semibold text-slate-700">
          Détail lié à la carte
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le détail de l’action"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="px-1 pb-1">
        <ActionPopupContent
          item={item}
          color={color}
          coords={coordinates}
          onViewGeometry={
            geometry.positions.length > 1
              ? () => fitActionGeometryBounds(map, geometry.positions)
              : undefined
          }
          displayMode={displayMode}
          currentPlaceState={currentPlaceState}
          scoreScope={scoreScope}
          wrap={false}
        />
      </div>
    </aside>
  );
}
