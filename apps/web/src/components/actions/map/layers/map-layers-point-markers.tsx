"use client";

import {
  CircleMarker,
  Popup,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { divIcon } from "leaflet";
import {
  mapItemCoordinates,
  mapItemShouldRenderPoint,
} from "@/lib/actions/data-contract";
import { useActionPollutionScoreReferences } from "../scores/action-pollution-score-references-context";
import { ActionPopupContent } from "../popup/action-popup-content";
import {
  formatClusterCount,
  resolveClusterAriaLabel,
  resolveClusterDensityTier,
  resolveClusterIconSize,
  resolveClusterRadius,
} from "./map-cluster.utils";
import {
  resolveActionMapGeometryViewModel,
  resolveGeometryRenderStyle,
} from "./actions-map-geometry.utils";
import { resolveMapPlaceStateForItem } from "../filters/actions-map-display-state";
import { useMapSelectableLayerRefs } from "./map-layers-selection";
import {
  isTrashSpotterItem,
  resolvePointColor,
  type ActionPointLayerProps,
  type LeafletClusterLike,
} from "./map-layers.shared";

const ACTION_MARKER_CLUSTER_PROPS = {
  chunkedLoading: true,
  maxClusterRadius: resolveClusterRadius,
  disableClusteringAtZoom: 18,
  spiderfyOnMaxZoom: true,
  spiderfyDistanceMultiplier: 1.6,
  showCoverageOnHover: false,
} as const;

function createActionMarkerClusterIcon(
  cluster: LeafletClusterLike,
  className: string,
  label: string,
) {
  const childCount = cluster.getChildCount();
  const tier = resolveClusterDensityTier(childCount);
  const size = resolveClusterIconSize(childCount);
  const ariaLabel = resolveClusterAriaLabel(childCount);
  const densityClass =
    tier === "dense"
      ? "dense"
      : tier === "high"
        ? "high"
        : tier === "medium"
          ? "medium"
          : "low";

  return divIcon({
    className: `${className} ${className}--${densityClass}`,
    html: `
      <div class="${className}__body" aria-label="${ariaLabel}">
        <span class="${className}__count">${formatClusterCount(childCount)}</span>
        <span class="${className}__label">${label}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
    tooltipAnchor: [0, -(size / 2)],
  });
}

export function SignalementMarkers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
  displayMode = "projected_today",
  currentPlaceStateViews = [],
  scoreScope = "global",
}: ActionPointLayerProps) {
  const { references, isLoading: referencesLoading } = useActionPollutionScoreReferences();
  const now = new Date();
  const registerLayerRef = useMapSelectableLayerRefs(selectedActionId).registerLayerRef;

  if (!visible) {
    return null;
  }

  return (
    <MarkerClusterGroup
      {...ACTION_MARKER_CLUSTER_PROPS}
      iconCreateFunction={(cluster: LeafletClusterLike) =>
        createActionMarkerClusterIcon(cluster, "cmm-action-cluster", "actions")
      }
    >
      {items.map((item) => {
        const coords = mapItemCoordinates(item);
        if (
          !mapItemShouldRenderPoint(item) ||
          coords.latitude === null ||
          coords.longitude === null
        ) {
          return null;
        }

        const currentPlaceState = resolveMapPlaceStateForItem(
          currentPlaceStateViews,
          item,
          displayMode,
        );
        const color = resolvePointColor(
          item,
          references,
          now,
          displayMode,
          currentPlaceState,
          scoreScope,
          referencesLoading && !references,
        );
        const geometry = resolveActionMapGeometryViewModel(item);
        const renderStyle = resolveGeometryRenderStyle(geometry);
        const isFallbackPoint = geometry.presentation.strokeStyle === "point";
        const isSelected = selectedActionId === item.id;

        return (
          <CircleMarker
            key={`point-${item.id}`}
            ref={(layer) => {
              registerLayerRef(item.id, layer);
            }}
            center={geometry.anchor ?? [coords.latitude, coords.longitude]}
            radius={renderStyle.pointRadius ?? (isFallbackPoint ? 4.5 : 6) + (isSelected ? 2 : 0)}
            eventHandlers={{
              click: () => {
                onSelectAction?.(item.id);
              },
            }}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity:
                renderStyle.pointFillOpacity ?? (isFallbackPoint ? 0.52 : 0.85),
              weight: (renderStyle.pointWeight ?? (isFallbackPoint ? 1.5 : 2)) + (isSelected ? 1 : 0),
              opacity: isSelected
                ? 1
                : renderStyle.pointOpacity ?? (isFallbackPoint ? 0.7 : 0.95),
            }}
          >
            <Popup className="glass-popup custom-popup">
              <ActionPopupContent
                key={item.id}
                item={item}
                color={color}
                coords={coords}
                displayMode={displayMode}
                currentPlaceState={currentPlaceState}
                scoreScope={scoreScope}
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </MarkerClusterGroup>
  );
}

export function TrashSpotterMarkers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
  displayMode = "projected_today",
  currentPlaceStateViews = [],
  scoreScope = "global",
}: ActionPointLayerProps) {
  const spotItems = items.filter(isTrashSpotterItem);
  const now = new Date();
  const { registerLayerRef } = useMapSelectableLayerRefs(selectedActionId);

  if (!visible) {
    return null;
  }

  return (
    <MarkerClusterGroup
      {...ACTION_MARKER_CLUSTER_PROPS}
      iconCreateFunction={(cluster: LeafletClusterLike) =>
        createActionMarkerClusterIcon(
          cluster,
          "cmm-trash-spotter-cluster",
          "trash spotter",
        )
      }
    >
      {spotItems.map((item) => {
        const coords = mapItemCoordinates(item);
        if (
          !mapItemShouldRenderPoint(item) ||
          coords.latitude === null ||
          coords.longitude === null
        ) {
          return null;
        }

        const isSelected = selectedActionId === item.id;
        const currentPlaceState = resolveMapPlaceStateForItem(
          currentPlaceStateViews,
          item,
          displayMode,
        );
        const color = resolvePointColor(
          item,
          null,
          now,
          displayMode,
          currentPlaceState,
          scoreScope,
        );

        return (
          <CircleMarker
            key={`trash-spotter-${item.id}`}
            ref={(layer) => {
              registerLayerRef(item.id, layer);
            }}
            center={[coords.latitude, coords.longitude]}
            radius={7 + (isSelected ? 2 : 0)}
            eventHandlers={{
              click: () => {
                onSelectAction?.(item.id);
              },
            }}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isSelected ? 0.9 : 0.82,
              weight: 2 + (isSelected ? 1 : 0),
              opacity: 1,
            }}
          >
            <Popup className="glass-popup custom-popup">
              <ActionPopupContent
                key={item.id}
                item={item}
                color={color}
                coords={coords}
                displayMode={displayMode}
                currentPlaceState={currentPlaceState}
                scoreScope={scoreScope}
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </MarkerClusterGroup>
  );
}
