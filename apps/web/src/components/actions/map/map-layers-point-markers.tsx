"use client";

import { useEffect, useRef } from "react";
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
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";
import { ActionPopupContent } from "./action-popup-content";
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
import { resolveMapPlaceStateForItem } from "./actions-map-display-state";
import {
  isTrashSpotterItem,
  resolvePointColor,
  type ActionPointLayerProps,
  type LeafletClusterLike,
} from "./map-layers.shared";

export function SignalementMarkers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
  displayMode = "projected_today",
  currentPlaceStateViews = [],
}: ActionPointLayerProps) {
  const { references } = useActionPollutionScoreReferences();
  const now = new Date();
  const layerRefs = useRef<Record<string, { openPopup?: () => void; closePopup?: () => void }>>({});

  useEffect(() => {
    if (!selectedActionId) {
      return;
    }

    const layer = layerRefs.current[selectedActionId];
    layer?.openPopup?.();
  }, [selectedActionId]);

  if (!visible) {
    return null;
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={resolveClusterRadius}
      disableClusteringAtZoom={18}
      spiderfyOnMaxZoom={true}
      spiderfyDistanceMultiplier={1.6}
      showCoverageOnHover={false}
      iconCreateFunction={(cluster: LeafletClusterLike) => {
        const childCount = cluster.getChildCount();
        const tier = resolveClusterDensityTier(childCount);
        const size = resolveClusterIconSize(childCount);
        const ariaLabel = resolveClusterAriaLabel(childCount);

        return divIcon({
          className: `cmm-action-cluster ${
            tier === "dense"
              ? "cmm-action-cluster--dense"
              : tier === "high"
                ? "cmm-action-cluster--high"
                : tier === "medium"
                  ? "cmm-action-cluster--medium"
                  : "cmm-action-cluster--low"
          }`,
          html: `
            <div class="cmm-action-cluster__body" aria-label="${ariaLabel}">
              <span class="cmm-action-cluster__count">${formatClusterCount(childCount)}</span>
              <span class="cmm-action-cluster__label">actions</span>
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -(size / 2)],
          tooltipAnchor: [0, -(size / 2)],
        });
      }}
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
        );
        const geometry = resolveActionMapGeometryViewModel(item);
        const renderStyle = resolveGeometryRenderStyle(geometry);
        const isFallbackPoint = geometry.presentation.strokeStyle === "point";
        const isSelected = selectedActionId === item.id;

        return (
          <CircleMarker
            key={`point-${item.id}`}
            ref={(layer) => {
              if (layer) {
                layerRefs.current[item.id] = layer;
              } else {
                delete layerRefs.current[item.id];
              }
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
}: ActionPointLayerProps) {
  const spotItems = items.filter(isTrashSpotterItem);
  const layerRefs = useRef<Record<string, { openPopup?: () => void; closePopup?: () => void }>>({});
  const now = new Date();

  useEffect(() => {
    if (!selectedActionId) {
      return;
    }

    const layer = layerRefs.current[selectedActionId];
    layer?.openPopup?.();
  }, [selectedActionId]);

  if (!visible) {
    return null;
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={resolveClusterRadius}
      disableClusteringAtZoom={18}
      spiderfyOnMaxZoom={true}
      spiderfyDistanceMultiplier={1.6}
      showCoverageOnHover={false}
      iconCreateFunction={(cluster: LeafletClusterLike) => {
        const childCount = cluster.getChildCount();
        const tier = resolveClusterDensityTier(childCount);
        const size = resolveClusterIconSize(childCount);
        const ariaLabel = resolveClusterAriaLabel(childCount);

        return divIcon({
          className: `cmm-trash-spotter-cluster ${
            tier === "dense"
              ? "cmm-trash-spotter-cluster--dense"
              : tier === "high"
                ? "cmm-trash-spotter-cluster--high"
                : tier === "medium"
                  ? "cmm-trash-spotter-cluster--medium"
                  : "cmm-trash-spotter-cluster--low"
          }`,
          html: `
            <div class="cmm-trash-spotter-cluster__body" aria-label="${ariaLabel}">
              <span class="cmm-trash-spotter-cluster__count">${formatClusterCount(childCount)}</span>
              <span class="cmm-trash-spotter-cluster__label">trash spotter</span>
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -(size / 2)],
          tooltipAnchor: [0, -(size / 2)],
        });
      }}
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
        );

        return (
          <CircleMarker
            key={`trash-spotter-${item.id}`}
            ref={(layer) => {
              if (layer) {
                layerRefs.current[item.id] = layer;
              } else {
                delete layerRefs.current[item.id];
              }
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
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </MarkerClusterGroup>
  );
}
