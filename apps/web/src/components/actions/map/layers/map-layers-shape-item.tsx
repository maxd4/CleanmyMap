"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Fragment } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import { resolveKnownParticipantsCount } from "@/lib/actions/volunteer-participation";
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
import { fitActionGeometryBounds, resolveShapeCasingStyle, type ShapeBasemapMode } from "./map-layers.shared";
import { ShapeGeometryRenderer } from "./map-layers-shape-geometry";
import { resolveShapeLayerGeometryModel, resolveShapeLayerScoreModel } from "./map-layers-shape-item-model";
import { HYPOTHETICAL_GEOMETRY_DASH_ARRAY, resolveGeometryRenderStyle, resolveGeometryStrokeWeight } from "./actions-map-geometry-render";
import { resolveVisibleShapePathOptions } from "./map-layers-coverage-geometry";

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
  zoom: number;
  layerRefs: ShapeLayerRefs;
  setHoveredActionId: Dispatch<SetStateAction<string | null>>;
  references?: PollutionScoreReferences | null;
  referencesLoading: boolean;
  now: Date;
  actionItemsById: Map<string, ActionMapItem>;
  corridorHistories: ReturnType<typeof groupActionsByCorridor>;
};

function OperationalRouteLayers({
  item,
  displayColor,
  pollutionCategory,
  basemapMode,
  participantsCount,
  zoom,
}: {
  item: ActionMapItem;
  displayColor: string;
  pollutionCategory: Parameters<typeof resolveShapeCasingStyle>[0]["pollutionCategory"];
  basemapMode: ShapeBasemapMode;
  participantsCount: number | null;
  zoom: number;
}) {
  const operationalRoute = item.contract?.metadata.preparationData?.operationalRoute;
  const segments = getPublicOperationalRouteSegments(operationalRoute);
  const renderStyle = resolveGeometryRenderStyle({
    kind: "polyline",
    presentation: {
      origin: "routed",
      reality: "planned",
      label: "Itinéraire prévu sur le réseau",
      strokeStyle: "dashed",
      variant: "network",
    },
  });
  const strokeWeight = resolveGeometryStrokeWeight({ participantsCount, zoom });
  const casingStyle = resolveShapeCasingStyle({
    pollutionCategory,
    basemapMode,
    geometryKind: "polyline",
    visibleWeight: strokeWeight,
    dashArray: HYPOTHETICAL_GEOMETRY_DASH_ARRAY,
  });
  const visibleStyle = resolveVisibleShapePathOptions({
    geometryKind: "polyline",
    displayColor,
    renderStyle,
    visibleWeight: strokeWeight,
    isSelected: false,
  });
  return (
    <>
      {segments.map((segment) => (
        <Fragment key={`operational-route-${item.id}-${segment.routeId}`}>
          {casingStyle ? <Polyline positions={segment.coordinates} pathOptions={casingStyle} /> : null}
          <Polyline
            positions={segment.coordinates}
            pathOptions={visibleStyle}
          >
            <Tooltip sticky>Itinéraire prévu sur le réseau</Tooltip>
          </Polyline>
        </Fragment>
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
  zoom,
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
  const hasRenderableGeometry =
    geometry.positions.length > 0 || geometry.multiLinePositions.some((line) => line.length > 1);
  const showOperationalRoute =
    operationalRouteSegments.length > 0 && geometry.presentation.reality !== "observed";
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
  const participantsCount = resolveKnownParticipantsCount({
    volunteerParticipation:
      item.contract?.metadata.volunteerParticipation ??
      item.contract?.metadata.preparationData?.volunteerParticipation,
    legacyVolunteersCount:
      item.contract?.metadata.volunteersCount ?? item.volunteers_count,
  });
  const strokeWeight = resolveGeometryStrokeWeight({ participantsCount, zoom });
  if (geometry.renderMode !== "drawing" || !hasRenderableGeometry) {
    return showOperationalRoute ? (
      <OperationalRouteLayers
        item={item}
        displayColor={scoreModel.displayColor}
        pollutionCategory={scoreModel.pollutionCategory}
        basemapMode={basemapMode}
        participantsCount={participantsCount}
        zoom={zoom}
      />
    ) : null;
  }

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
      {showOperationalRoute ? (
        <OperationalRouteLayers
          item={item}
          displayColor={scoreModel.displayColor}
          pollutionCategory={scoreModel.pollutionCategory}
          basemapMode={basemapMode}
          participantsCount={participantsCount}
          zoom={zoom}
        />
      ) : null}
      <ShapeGeometryRenderer
        item={item}
        geometry={geometry}
        renderStyle={geometryModel.renderStyle}
        strokeWeight={strokeWeight}
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
