"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Polyline } from "react-leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import { groupActionsByCorridor } from "@/lib/actions/pollution/corridor-history";
import { getPublicOperationalRouteSegments } from "@/lib/route/route-operational";
import type {
  CurrentPlaceStateMode,
  CurrentPlaceStateViews,
} from "@/lib/actions/pollution/current-place-state";
import type {
  PollutionScoreReferences,
  PollutionScoreScope,
} from "@/lib/actions/pollution/pollution-score";
import { resolveActionMapGeometryViewModel, type ActionMapGeometryViewModel } from "./actions-map-geometry.utils";
import { fitActionGeometryBounds, type ShapeBasemapMode } from "./map-layers.shared";
import { ShapeGeometryRenderer } from "./map-layers-shape-geometry";
import { resolveShapeLayerGeometryModel, resolveShapeLayerScoreModel } from "./map-layers-shape-item-model";

export type ActionShapeLayerRef = {
  openPopup?: () => void;
  closePopup?: () => void;
  bringToFront?: () => void;
};

type ShapeLayerRefs = MutableRefObject<
  Record<string, { visible?: ActionShapeLayerRef; casing?: ActionShapeLayerRef }>
>;

export type ShapeLayerItemProps = {
  item: ActionMapItem;
  currentPlaceStateViews: readonly CurrentPlaceStateViews[];
  displayMode: CurrentPlaceStateMode;
  scoreScope: PollutionScoreScope;
  basemapMode: ShapeBasemapMode;
  selectedActionId: string | null;
  hoveredActionId: string | null;
  onSelectAction?: (actionId: string) => void;
  map: Parameters<typeof fitActionGeometryBounds>[0];
  layerRefs: ShapeLayerRefs;
  setHoveredActionId: Dispatch<SetStateAction<string | null>>;
  references?: PollutionScoreReferences | null;
  referencesLoading: boolean;
  now: Date;
  actionItemsById: Map<string, ActionMapItem>;
  corridorHistories: ReturnType<typeof groupActionsByCorridor>;
};

function OperationalRouteLayers({ item }: { item: ActionMapItem }) {
  const operationalRoute = item.contract?.metadata.preparationData?.operationalRoute;
  const segments = getPublicOperationalRouteSegments(operationalRoute);
  return (
    <>
      {segments.map((segment, index) => (
        <Polyline
          key={`operational-route-${item.id}-${segment.routeId}`}
          positions={segment.coordinates}
          pathOptions={{
            color: index % 2 === 0 ? "#059669" : "#2563eb",
            weight: 5,
            opacity: 0.78,
            dashArray: "10 7",
          }}
        />
      ))}
    </>
  );
}

export function ShapeLayerItem({
  item,
  currentPlaceStateViews,
  displayMode,
  scoreScope,
  basemapMode,
  selectedActionId,
  hoveredActionId,
  onSelectAction,
  map,
  layerRefs,
  setHoveredActionId,
  references,
  referencesLoading,
  now,
  actionItemsById,
  corridorHistories,
}: ShapeLayerItemProps) {
  const geometry: ActionMapGeometryViewModel = resolveActionMapGeometryViewModel(item);
  const operationalRouteSegments = getPublicOperationalRouteSegments(
    item.contract?.metadata.preparationData?.operationalRoute,
  );
  if (geometry.renderMode !== "drawing" || geometry.positions.length === 0) {
    return operationalRouteSegments.length > 0 ? (
      <OperationalRouteLayers item={item} />
    ) : null;
  }

  const scoreModel = resolveShapeLayerScoreModel({
    item,
    geometry,
    currentPlaceStateViews,
    displayMode,
    scoreScope,
    basemapMode,
    references,
    referencesLoading,
    now,
  });
  const geometryModel = resolveShapeLayerGeometryModel({
    item,
    geometry,
    selectedActionId,
    hoveredActionId,
    actionItemsById,
    corridorHistories,
    map,
    currentPlaceStateViews,
    displayMode,
    scoreScope,
    references,
    referencesLoading,
    now,
  });
  return (
    <>
      <OperationalRouteLayers item={item} />
      <ShapeGeometryRenderer
        item={item}
        geometry={geometry}
        renderStyle={geometryModel.renderStyle}
        color={scoreModel.color}
        displayColor={scoreModel.displayColor}
        pollutionCategory={scoreModel.pollutionCategory}
        basemapMode={basemapMode}
        coords={geometryModel.coords}
        actionTooltipReading={scoreModel.actionTooltipReading}
        currentPlaceState={scoreModel.currentPlaceState}
        displayMode={displayMode}
        scoreScope={scoreScope}
        corridorItems={geometryModel.corridorItems}
        corridorHistory={geometryModel.corridorHistory}
        onViewGeometry={geometryModel.onViewGeometry}
        onViewGeometryForItem={geometryModel.onViewGeometryForItem}
        resolveCurrentPlaceStateForItem={geometryModel.resolveCurrentPlaceStateForItem}
        resolveColorForItem={geometryModel.resolveColorForItem}
        layerRefs={layerRefs}
        onSelectAction={onSelectAction}
        setHoveredActionId={setHoveredActionId}
        isSelected={geometryModel.isSelected}
        endpointMarkers={geometryModel.endpointMarkers}
        directionMarkers={geometryModel.directionMarkers}
      />
    </>
  );
}
