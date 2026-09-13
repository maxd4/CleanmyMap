"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  CircleMarker,
  Marker,
  Polygon,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import { divIcon } from "leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  mapItemCoordinates,
  mapItemObservedAt,
  mapItemPostActionPollutionScore,
} from "@/lib/actions/data-contract";
import { presentActionPollutionProjection } from "@/lib/actions/pollution/revisit-priority";
import { formatProjectionConfidenceLabel } from "@/lib/actions/pollution/projection-confidence";
import {
  findCorridorHistoryForAction,
  groupActionsByCorridor,
} from "@/lib/actions/pollution/corridor-history";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";
import { ActionPopupContent } from "./action-popup-content";
import { GeometryTooltipContent } from "./map-geometry-tooltip-content";
import {
  formatGeometryModeLabel,
  formatGeometryPointCount,
  formatActionGeometryTooltipTitle,
  resolveActionMapGeometryViewModel,
  resolvePolylineDirectionMarkers,
  resolvePolylineEndpointMarkers,
  resolveGeometryRenderStyle,
} from "./actions-map-geometry.utils";
import { isActionMapItem } from "./action-popup-content.helpers";
import { resolveMapPlaceStateForItem } from "./actions-map-display-state";
import {
  ACTION_TRACE_HIT_AREA_WEIGHT,
  fitActionGeometryBounds,
  resolvePointPollutionScore,
  resolvePointColor,
  resolveShapeCasingStyle,
  resolveShapeDisplayColor,
  resolveShapePollutionCategory,
  type ActionPointLayerProps,
} from "./map-layers.shared";
import { resolveActionPollutionScore } from "./pollution-score-scope";

type ActionShapeLayerRef = {
  openPopup?: () => void;
  closePopup?: () => void;
  bringToFront?: () => void;
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
  const { references } = useActionPollutionScoreReferences();
  const map = useMap();
  const now = new Date();
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);
  const layerRefs = useRef<Record<string, {
    visible?: ActionShapeLayerRef;
    casing?: ActionShapeLayerRef;
  }>>({});
  const actionItemsById = new Map(
    items
      .filter((item) => item.contract)
      .map((item) => [
        item.id,
        item,
      ] as const),
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

    const layer = layerRefs.current[selectedActionId];
    layer?.visible?.openPopup?.();
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
      {items.map((item) => {
        const geometry = resolveActionMapGeometryViewModel(item);
        if (geometry.renderMode !== "drawing" || geometry.positions.length === 0) {
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
        );
        const pollutionCategory = resolveShapePollutionCategory(
          resolvePointPollutionScore(
            item,
            references,
            now,
            displayMode,
            currentPlaceState,
            scoreScope,
          ),
        );
        const displayColor = resolveShapeDisplayColor({
          pollutionCategory,
          baseColor: color,
          basemapMode,
        });
        const globalActionScore = isActionMapItem(item)
          ? resolveActionPollutionScore(item, references, {
              scope: "global",
              now,
              displayMode,
              currentPlaceState,
            })
          : null;
        const departmentActionScore = isActionMapItem(item)
          ? resolveActionPollutionScore(item, references, { scope: "department" })
          : null;
        const actionProjection = isActionMapItem(item) && scoreScope === "global" && globalActionScore?.historicalScore != null
          ? presentActionPollutionProjection(
              globalActionScore.historicalScore,
              mapItemObservedAt(item),
              now,
              {
                postActionScore: mapItemPostActionPollutionScore(item),
                geometryConfidence: geometry.confidence,
                sourceCompleteness: "partial",
              },
            )
          : null;
        const actionTooltipReading = isActionMapItem(item) && globalActionScore
          ? {
              scoreScope,
              historicalScore: globalActionScore.historicalScore ?? 0,
              projectedScore: actionProjection?.projectedPollutionScore ?? globalActionScore.score ?? 0,
              elapsedDays: actionProjection?.elapsedDays ?? 0,
              isEstimate: actionProjection?.isEstimate ?? false,
              projectionConfidenceLabel: actionProjection
                ? formatProjectionConfidenceLabel(actionProjection.projectionConfidence.level)
                : "",
              displayMode: scoreScope === "global" ? displayMode : undefined,
              displaySource: scoreScope === "global"
                ? currentPlaceState?.source ?? (displayMode === "projected_today" ? "projected" : "observed")
                : undefined,
              displayedScore: scoreScope === "global"
                ? currentPlaceState?.score ?? (displayMode === "projected_today" ? actionProjection?.projectedPollutionScore : mapItemPostActionPollutionScore(item) ?? globalActionScore.historicalScore)
                : departmentActionScore?.score,
              displayedScoreKind: scoreScope === "global"
                ? currentPlaceState?.scoreKind ?? (displayMode === "projected_today" ? "projected" : "measured")
                : departmentActionScore?.score === null ? "unavailable" : "measured",
              displayedStateLabel: scoreScope === "global"
                ? currentPlaceState?.stateLabel ?? (displayMode === "projected_today" ? "Pollution projetée" : "Pollution observée")
                : departmentActionScore?.score === null ? "Comparaison départementale indisponible" : "Score relatif départemental",
              displayedDate: currentPlaceState?.date ?? mapItemObservedAt(item),
              globalScore: globalActionScore.historicalScore,
              globalWasteScore: globalActionScore.wasteScore,
              globalButtsScore: globalActionScore.buttsScore,
              departmentScore: departmentActionScore?.score,
              departmentWasteScore: departmentActionScore?.wasteScore,
              departmentButtsScore: departmentActionScore?.buttsScore,
              departmentName: item.contract?.location.departmentName ?? null,
              departmentUnavailable: departmentActionScore?.score === null,
              departmentAvailability: departmentActionScore?.availability,
            }
          : undefined;
        const coords = mapItemCoordinates(item);
        const renderStyle = resolveGeometryRenderStyle(geometry);
        const geometryModeLabel = formatGeometryModeLabel(
          geometry.kind,
          geometry.presentation,
        );
        const geometryPointsLabel = formatGeometryPointCount(geometry.pointCount);
        const geometryMetricLabel = geometry.metrics.label;
        const isSelected = selectedActionId === item.id;
        const isHovered = hoveredActionId === item.id;
        const corridorHistory = isActionMapItem(item)
          ? findCorridorHistoryForAction(corridorHistories, item.id)
          : null;
        const corridorItems = corridorHistory && corridorHistory.actions.length >= 2
          ? corridorHistory.actions
              .map((action) => actionItemsById.get(action.id))
              .filter((candidate): candidate is ActionMapItem => Boolean(candidate))
          : undefined;
        const endpointMarkers =
          geometry.kind === "polyline" && (isSelected || isHovered)
            ? resolvePolylineEndpointMarkers(geometry)
            : null;
        const directionMarkers =
          geometry.kind === "polyline" && isSelected
            ? resolvePolylineDirectionMarkers(geometry.positions)
            : [];
        const onViewGeometry =
          isActionMapItem(item) && geometry.positions.length > 1
            ? () => fitActionGeometryBounds(map, geometry.positions)
            : undefined;
        const onViewGeometryForItem = (targetItem: ActionMapItem) => {
          const targetGeometry = resolveActionMapGeometryViewModel(targetItem);
          if (targetGeometry.positions.length > 1) {
            fitActionGeometryBounds(map, targetGeometry.positions);
          }
        };

        if (geometry.kind === "polygon") {
          const visibleWeight =
            (renderStyle.strokeWeight ?? 2) + (isSelected ? 2 : 0);
          const casingStyle = resolveShapeCasingStyle({
            pollutionCategory,
            basemapMode,
            geometryKind: "polygon",
            visibleWeight,
            dashArray: renderStyle.dashArray,
          });

          return (
            <Fragment key={`shape-${item.id}`}>
              {casingStyle ? (
                <Polygon
                  key={`casing-${item.id}`}
                  ref={(layer) => {
                    const current = layerRefs.current[item.id] ?? {};
                    if (layer) {
                      layerRefs.current[item.id] = { ...current, casing: layer };
                    } else if (current.visible) {
                      layerRefs.current[item.id] = { visible: current.visible };
                    } else {
                      delete layerRefs.current[item.id];
                    }
                  }}
                  positions={geometry.positions}
                  pathOptions={casingStyle}
                />
              ) : null}
              <Polygon
                key={`visible-shape-${item.id}`}
                ref={(layer) => {
                  const current = layerRefs.current[item.id] ?? {};
                  if (layer) {
                    layerRefs.current[item.id] = { ...current, visible: layer };
                  } else if (current.casing) {
                    layerRefs.current[item.id] = { casing: current.casing };
                  } else {
                    delete layerRefs.current[item.id];
                  }
                }}
                positions={geometry.positions}
                eventHandlers={{
                  click: () => {
                    onSelectAction?.(item.id);
                  },
                  mouseover: () => setHoveredActionId(item.id),
                  mouseout: () =>
                    setHoveredActionId((current) =>
                      current === item.id ? null : current,
                    ),
                }}
                pathOptions={{
                  color: displayColor,
                  weight: visibleWeight,
                  opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? 0.95,
                  fillOpacity: (renderStyle.fillOpacity ?? 0.24) + (isSelected ? 0.08 : 0),
                  dashArray: renderStyle.dashArray,
                }}
              >
                <Tooltip className="glass-tooltip" direction="auto" sticky>
                  <GeometryTooltipContent
                    title={
                      formatActionGeometryTooltipTitle(
                        "polygon",
                        geometryMetricLabel,
                      )
                    }
                    geometryModeLabel={geometryModeLabel}
                    geometryPointsLabel={geometryPointsLabel}
                    geometryMetricLabel={geometryMetricLabel}
                    color={color}
                    actionReading={actionTooltipReading}
                  />
                </Tooltip>
                <Popup className="glass-popup custom-popup">
                  <ActionPopupContent
                    key={item.id}
                    item={item}
                    color={color}
                    coords={coords}
                    onViewGeometry={onViewGeometry}
                    displayMode={displayMode}
                    currentPlaceState={currentPlaceState}
                    scoreScope={scoreScope}
                    resolveCurrentPlaceStateForItem={(targetItem) =>
                      resolveMapPlaceStateForItem(
                        currentPlaceStateViews,
                        targetItem,
                        displayMode,
                      )
                    }
                    corridorItems={corridorItems}
                    corridorHistory={corridorHistory ?? undefined}
                    onViewGeometryForItem={onViewGeometryForItem}
                    resolveColorForItem={(targetItem) =>
                      resolvePointColor(
                        targetItem,
                        references,
                        now,
                        displayMode,
                        resolveMapPlaceStateForItem(
                          currentPlaceStateViews,
                          targetItem,
                          displayMode,
                        ),
                        scoreScope,
                      )
                    }
                  />
                </Popup>
              </Polygon>
            </Fragment>
          );
        }

        const visibleWeight =
          (renderStyle.strokeWeight ?? 4) + (isSelected ? 2 : 0);
        const casingStyle = resolveShapeCasingStyle({
          pollutionCategory,
          basemapMode,
          geometryKind: "polyline",
          visibleWeight,
          dashArray: renderStyle.dashArray,
        });

        return (
          <Fragment key={`shape-${item.id}`}>
            {casingStyle ? (
              <Polyline
                key={`casing-${item.id}`}
                ref={(layer) => {
                  const current = layerRefs.current[item.id] ?? {};
                  if (layer) {
                    layerRefs.current[item.id] = { ...current, casing: layer };
                  } else if (current.visible) {
                    layerRefs.current[item.id] = { visible: current.visible };
                  } else {
                    delete layerRefs.current[item.id];
                  }
                }}
                positions={geometry.positions}
                pathOptions={casingStyle}
              />
            ) : null}
            <Polyline
              key={`visible-shape-${item.id}`}
              ref={(layer) => {
                const current = layerRefs.current[item.id] ?? {};
                if (layer) {
                  layerRefs.current[item.id] = { ...current, visible: layer };
                } else if (current.casing) {
                  layerRefs.current[item.id] = { casing: current.casing };
                } else {
                  delete layerRefs.current[item.id];
                }
              }}
              positions={geometry.positions}
              eventHandlers={{
                click: () => {
                  onSelectAction?.(item.id);
                },
                mouseover: () => setHoveredActionId(item.id),
                mouseout: () =>
                  setHoveredActionId((current) =>
                    current === item.id ? null : current,
                  ),
              }}
              pathOptions={{
                color: displayColor,
                weight: visibleWeight,
                opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? 0.92,
                dashArray: renderStyle.dashArray,
              }}
            >
              <Tooltip className="glass-tooltip" direction="auto" sticky>
                <GeometryTooltipContent
                  title={
                    formatActionGeometryTooltipTitle(
                      "polyline",
                      geometryMetricLabel,
                    )
                  }
                  geometryModeLabel={geometryModeLabel}
                  geometryPointsLabel={geometryPointsLabel}
                  geometryMetricLabel={geometryMetricLabel}
                  color={color}
                  actionReading={actionTooltipReading}
                />
              </Tooltip>
              <Popup className="glass-popup custom-popup">
                <ActionPopupContent
                  key={item.id}
                  item={item}
                  color={color}
                  coords={coords}
                  onViewGeometry={onViewGeometry}
                  displayMode={displayMode}
                  currentPlaceState={currentPlaceState}
                  scoreScope={scoreScope}
                  resolveCurrentPlaceStateForItem={(targetItem) =>
                    resolveMapPlaceStateForItem(
                      currentPlaceStateViews,
                      targetItem,
                      displayMode,
                    )
                  }
                  corridorItems={corridorItems}
                  corridorHistory={corridorHistory ?? undefined}
                  onViewGeometryForItem={onViewGeometryForItem}
                  resolveColorForItem={(targetItem) =>
                    resolvePointColor(
                      targetItem,
                      references,
                      now,
                      displayMode,
                      resolveMapPlaceStateForItem(
                        currentPlaceStateViews,
                        targetItem,
                        displayMode,
                      ),
                      scoreScope,
                    )
                  }
                />
              </Popup>
            </Polyline>
            {isActionMapItem(item) && (
              <Polyline
                key={`hit-area-${item.id}`}
                positions={geometry.positions}
                pathOptions={{
                  color: color,
                  weight: ACTION_TRACE_HIT_AREA_WEIGHT,
                  opacity: 0,
                  interactive: true,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectAction?.(item.id);
                  },
                  mouseover: () => setHoveredActionId(item.id),
                  mouseout: () =>
                    setHoveredActionId((current) =>
                      current === item.id ? null : current,
                    ),
                }}
              />
            )}
            {endpointMarkers ? (
              isSelected ? (
                endpointMarkers.isLoop ? (
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
                )
              ) : endpointMarkers.isLoop ? (
                <CircleMarker
                  center={endpointMarkers.start}
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
              ) : (
                <>
                  <CircleMarker
                    center={endpointMarkers.start}
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
                  <CircleMarker
                    center={endpointMarkers.end}
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
                </>
              )
            ) : null}
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
      })}
    </>
  );
}
