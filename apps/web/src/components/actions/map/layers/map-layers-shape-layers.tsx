"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  groupActionsByCorridor,
} from "@/lib/actions/pollution/corridor-history";
import { useActionPollutionScoreReferences } from "../scores/action-pollution-score-references-context";
import type { ActionPointLayerProps, ShapeBasemapMode } from "./map-layers.shared";
import {
  ShapeLayerItem,
  type ActionShapeLayerRef,
} from "./map-layers-shape-item";

export function ShapeLayers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
  displayMode = "projected_today",
  currentPlaceStateViews = [],
  scoreScope = "global",
  basemapMode = "light",
}: ActionPointLayerProps) {
  const { references, isLoading: referencesLoading } = useActionPollutionScoreReferences();
  const map = useMap();
  const now = new Date();
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);
  const layerRefs = useRef<
    Record<string, { visible?: ActionShapeLayerRef; casing?: ActionShapeLayerRef }>
  >({});
  const actionItemsById = new Map(
    items
      .filter((item) => item.contract)
      .map((item) => [item.id, item] as const),
  );
  const corridorHistories = groupActionsByCorridor(
    items
      .filter((item) => item.contract)
      .map((item) => item.contract as unknown as ActionDataContract),
  );

  useEffect(() => {
    if (!selectedActionId) {
      return;
    }
    layerRefs.current[selectedActionId]?.visible?.openPopup?.();
  }, [selectedActionId]);

  useEffect(() => {
    const bringShapeToFront = (actionId: string | null) => {
      if (!actionId) {
        return;
      }
      const layers = layerRefs.current[actionId];
      layers?.casing?.bringToFront?.();
      layers?.visible?.bringToFront?.();
    };
    bringShapeToFront(hoveredActionId);
    bringShapeToFront(selectedActionId);
  }, [hoveredActionId, selectedActionId]);

  if (!visible) {
    return null;
  }

  return (
    <>
      {items.map((item) => (
        <ShapeLayerItem
          key={`shape-${item.id}`}
          item={item}
          currentPlaceStateViews={currentPlaceStateViews}
          displayMode={displayMode}
          scoreScope={scoreScope}
          basemapMode={basemapMode as ShapeBasemapMode}
          selectedActionId={selectedActionId}
          hoveredActionId={hoveredActionId}
          onSelectAction={onSelectAction}
          map={map}
          layerRefs={layerRefs}
          setHoveredActionId={setHoveredActionId}
          references={references}
          referencesLoading={referencesLoading}
          now={now}
          actionItemsById={actionItemsById}
          corridorHistories={corridorHistories}
        />
      ))}
    </>
  );
}
