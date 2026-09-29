"use client";

import { Fragment, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { CircleMarker, Marker, Polygon, Polyline, Popup, Tooltip } from "react-leaflet";
import { divIcon } from "leaflet";
import type {
  ActionMapGeometryRenderStyle,
  ActionMapGeometryViewModel,
  ActionPolylineDirectionMarker,
  ActionPolylineEndpointMarkers,
} from "./actions-map-geometry.utils";
import type { ActionMapItem } from "@/lib/actions/types";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import { ActionPopupContent } from "../popup/action-popup-content";
import { isActionMapItem } from "../popup/action-popup-content.helpers";
import {
  GeometryTooltipContent,
  type GeometryTooltipReading,
} from "./map-geometry-tooltip-content";
import {
  formatActionGeometryTooltipTitle,
  formatGeometryModeLabel,
  formatGeometryPointCount,
} from "./actions-map-geometry.utils";
import {
  ACTION_TRACE_HIT_AREA_WEIGHT,
  resolveShapeCasingStyle,
  type ShapeBasemapMode,
  type ShapePollutionCategory,
} from "./map-layers.shared";
import type { ActionShapeLayerRef } from "./map-layers-shape-item";

export type ShapeGeometryRendererProps = {
  item: ActionMapItem;
  geometry: ActionMapGeometryViewModel;
  renderStyle: ActionMapGeometryRenderStyle;
  color: string;
  displayColor: string;
  pollutionCategory: ShapePollutionCategory;
  basemapMode: ShapeBasemapMode;
  coords: { latitude: number | null; longitude: number | null };
  actionTooltipReading?: GeometryTooltipReading;
  currentPlaceState: CurrentPlaceState | null;
  displayMode: CurrentPlaceStateMode;
  scoreScope: PollutionScoreScope;
  corridorItems?: readonly ActionMapItem[];
  corridorHistory?: Parameters<typeof ActionPopupContent>[0]["corridorHistory"];
  onViewGeometry?: () => void;
  onViewGeometryForItem: (item: ActionMapItem) => void;
  resolveCurrentPlaceStateForItem: (item: ActionMapItem) => CurrentPlaceState | null;
  resolveColorForItem: (item: ActionMapItem) => string;
  layerRefs: MutableRefObject<
    Record<string, { visible?: ActionShapeLayerRef; casing?: ActionShapeLayerRef }>
  >;
  onSelectAction?: (actionId: string) => void;
  setHoveredActionId: Dispatch<SetStateAction<string | null>>;
  isSelected: boolean;
  endpointMarkers: ActionPolylineEndpointMarkers | null;
  directionMarkers: ActionPolylineDirectionMarker[];
};

function createGeometryEndpointIcon(label: "D" | "A" | "D/A") {
  return divIcon({
    className: "cmm-action-geometry-endpoint-icon",
    html: `<span class="cmm-action-geometry-endpoint" aria-label="${label === "D" ? "Départ" : label === "A" ? "Arrivée" : "Départ et arrivée"}">${label}</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function createGeometryDirectionIcon(bearing: number) {
  const normalizedBearing = ((bearing % 360) + 360) % 360;
  return divIcon({
    className: "cmm-action-geometry-direction-icon",
    html: `<span class="cmm-action-geometry-direction" aria-hidden="true" style="transform: rotate(${normalizedBearing}deg)">▲</span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function setLayerRef(
  layerRefs: ShapeGeometryRendererProps["layerRefs"],
  itemId: string,
  key: "visible" | "casing",
  layer: ActionShapeLayerRef | null,
) {
  const current = layerRefs.current[itemId] ?? {};
  if (layer) {
    layerRefs.current[itemId] = { ...current, [key]: layer };
  } else if (key === "visible" && current.casing) {
    layerRefs.current[itemId] = { casing: current.casing };
  } else if (key === "casing" && current.visible) {
    layerRefs.current[itemId] = { visible: current.visible };
  } else {
    delete layerRefs.current[itemId];
  }
}

function resolveVisibleShapePathOptions({
  geometryKind,
  displayColor,
  renderStyle,
  visibleWeight,
  isSelected,
}: Pick<ShapeGeometryRendererProps, "displayColor" | "renderStyle" | "isSelected"> & {
  geometryKind: "polygon" | "polyline";
  visibleWeight: number;
}) {
  return {
    color: displayColor,
    weight: visibleWeight,
    opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? (geometryKind === "polygon" ? 0.95 : 0.92),
    ...(geometryKind === "polygon"
      ? { fillOpacity: (renderStyle.fillOpacity ?? 0.24) + (isSelected ? 0.08 : 0) }
      : {}),
    dashArray: renderStyle.dashArray,
  };
}

type PolygonGeometryRenderInput = {
  item: ActionMapItem;
  geometry: ActionMapGeometryViewModel;
  renderStyle: ActionMapGeometryRenderStyle;
  displayColor: string;
  visibleWeight: number;
  casingStyle: ReturnType<typeof resolveShapeCasingStyle>;
  layerRefs: ShapeGeometryRendererProps["layerRefs"];
  handlers: {
    click: () => void;
    mouseover: () => void;
    mouseout: () => void;
  };
  tooltipProps: {
    geometryModeLabel: string;
    geometryPointsLabel: string;
    geometryMetricLabel: string | null;
    color: string;
    actionReading?: GeometryTooltipReading;
  };
  commonPopupProps: Parameters<typeof ActionPopupContent>[0];
  isSelected: boolean;
};

type GeometryInteractionOverlaysProps = {
  item: ActionMapItem;
  geometryKind: "polygon" | "polyline";
  geometryLabel: string | null;
  tooltipProps: PolygonGeometryRenderInput["tooltipProps"];
  commonPopupProps: PolygonGeometryRenderInput["commonPopupProps"];
};

function GeometryInteractionOverlays({
  item,
  geometryKind,
  geometryLabel,
  tooltipProps,
  commonPopupProps,
}: GeometryInteractionOverlaysProps) {
  return (
    <>
      <Tooltip className="glass-tooltip" direction="auto" sticky>
        <GeometryTooltipContent
          title={formatActionGeometryTooltipTitle(geometryKind, geometryLabel)}
          {...tooltipProps}
        />
      </Tooltip>
      <Popup className="glass-popup custom-popup">
        <ActionPopupContent {...commonPopupProps} key={item.id} />
      </Popup>
    </>
  );
}

function renderPolygonGeometry({
  item,
  geometry,
  renderStyle,
  displayColor,
  visibleWeight,
  casingStyle,
  layerRefs,
  handlers,
  tooltipProps,
  commonPopupProps,
  isSelected,
}: PolygonGeometryRenderInput) {
  return (
    <Fragment>
      {casingStyle ? (
        <Polygon
          key={`casing-${item.id}`}
          ref={(layer) => setLayerRef(layerRefs, item.id, "casing", layer)}
          positions={geometry.positions}
          pathOptions={casingStyle}
        />
      ) : null}
      <Polygon
        key={`visible-shape-${item.id}`}
        ref={(layer) => setLayerRef(layerRefs, item.id, "visible", layer)}
        positions={geometry.positions}
        eventHandlers={handlers}
        pathOptions={resolveVisibleShapePathOptions({
          geometryKind: "polygon",
          displayColor,
          renderStyle,
          visibleWeight,
          isSelected,
        })}
      >
        <GeometryInteractionOverlays
          item={item}
          geometryKind="polygon"
          geometryLabel={geometry.metrics.label}
          tooltipProps={tooltipProps}
          commonPopupProps={commonPopupProps}
        />
      </Polygon>
    </Fragment>
  );
}

function renderPolylineEndpointMarkers({
  endpointMarkers,
  isSelected,
}: Pick<ShapeGeometryRendererProps, "endpointMarkers" | "isSelected">) {
  if (!endpointMarkers) return null;
  if (isSelected) {
    return endpointMarkers.isLoop ? (
      <Marker
        position={endpointMarkers.start}
        icon={createGeometryEndpointIcon("D/A")}
        interactive={false}
      />
    ) : (
      <>
        <Marker
          position={endpointMarkers.start}
          icon={createGeometryEndpointIcon("D")}
          interactive={false}
        />
        <Marker
          position={endpointMarkers.end}
          icon={createGeometryEndpointIcon("A")}
          interactive={false}
        />
      </>
    );
  }
  const marker = (position: [number, number]) => (
    <CircleMarker
      center={position}
      radius={2.5}
      interactive={false}
      pathOptions={{
        color: "#ffffff",
        fillColor: "#64748b",
        fillOpacity: 0.9,
        opacity: 0.9,
        weight: 1,
      }}
    />
  );
  return endpointMarkers.isLoop ? (
    marker(endpointMarkers.start)
  ) : (
    <>
      {marker(endpointMarkers.start)}
      {marker(endpointMarkers.end)}
    </>
  );
}

export function ShapeGeometryRenderer({
  item,
  geometry,
  renderStyle,
  color,
  displayColor,
  pollutionCategory,
  basemapMode,
  coords,
  actionTooltipReading,
  currentPlaceState,
  displayMode,
  scoreScope,
  corridorItems,
  corridorHistory,
  onViewGeometry,
  onViewGeometryForItem,
  resolveCurrentPlaceStateForItem,
  resolveColorForItem,
  layerRefs,
  onSelectAction,
  setHoveredActionId,
  isSelected,
  endpointMarkers,
  directionMarkers,
}: ShapeGeometryRendererProps) {
  const visibleWeight =
    (renderStyle.strokeWeight ?? (geometry.kind === "polygon" ? 2 : 4)) +
    (isSelected ? 2 : 0);
  const casingStyle = resolveShapeCasingStyle({
    pollutionCategory,
    basemapMode,
    geometryKind: geometry.kind === "polygon" ? "polygon" : "polyline",
    visibleWeight,
    dashArray: renderStyle.dashArray,
  });
  const commonPopupProps = {
    item,
    color,
    coords,
    onViewGeometry,
    displayMode,
    currentPlaceState,
    scoreScope,
    resolveCurrentPlaceStateForItem,
    corridorItems,
    corridorHistory,
    onViewGeometryForItem,
    resolveColorForItem,
  };
  const tooltipProps = {
    geometryModeLabel: formatGeometryModeLabel(geometry.kind, geometry.presentation),
    geometryPointsLabel: formatGeometryPointCount(geometry.pointCount),
    geometryMetricLabel: geometry.metrics.label,
    color,
    actionReading: actionTooltipReading,
  };
  const handlers = {
    click: () => onSelectAction?.(item.id),
    mouseover: () => setHoveredActionId(item.id),
    mouseout: () =>
      setHoveredActionId((current) => (current === item.id ? null : current)),
  };

  if (geometry.kind === "polygon") {
    return renderPolygonGeometry({
      item,
      geometry,
      renderStyle,
      displayColor,
      visibleWeight,
      casingStyle,
      layerRefs,
      handlers,
      tooltipProps,
      commonPopupProps,
      isSelected,
    });
  }

  return (
    <Fragment>
      {casingStyle ? (
        <Polyline
          key={`casing-${item.id}`}
          ref={(layer) => setLayerRef(layerRefs, item.id, "casing", layer)}
          positions={geometry.positions}
          pathOptions={casingStyle}
        />
      ) : null}
      <Polyline
        key={`visible-shape-${item.id}`}
        ref={(layer) => setLayerRef(layerRefs, item.id, "visible", layer)}
        positions={geometry.positions}
        eventHandlers={handlers}
        pathOptions={resolveVisibleShapePathOptions({
          geometryKind: "polyline",
          displayColor,
          renderStyle,
          visibleWeight,
          isSelected,
        })}
      >
        <GeometryInteractionOverlays
          item={item}
          geometryKind="polyline"
          geometryLabel={geometry.metrics.label}
          tooltipProps={tooltipProps}
          commonPopupProps={commonPopupProps}
        />
      </Polyline>
      {isActionMapItem(item) ? (
        <Polyline
          key={`hit-area-${item.id}`}
          positions={geometry.positions}
          pathOptions={{
            color,
            weight: ACTION_TRACE_HIT_AREA_WEIGHT,
            opacity: 0,
            interactive: true,
          }}
          eventHandlers={handlers}
        />
      ) : null}
      {renderPolylineEndpointMarkers({ endpointMarkers, isSelected })}
      {directionMarkers.map((marker, index) => (
        <Marker
          key={`direction-${item.id}-${index}`}
          position={marker.position}
          icon={createGeometryDirectionIcon(marker.bearing)}
          interactive={false}
        />
      ))}
    </Fragment>
  );
}
