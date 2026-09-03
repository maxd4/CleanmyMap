"use client";

import { Fragment, useEffect, useRef } from "react";
import {
  CircleMarker,
  Polygon,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  mapItemCoordinates,
  mapItemObservedAt,
  mapItemPostActionPollutionScore,
} from "@/lib/actions/data-contract";
import { resolveItemPollutionScores } from "@/components/actions/map-marker-categories";
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
  resolveGeometryConfidenceLabel,
  resolveActionMapGeometryViewModel,
  resolvePolylineEndpointMarkers,
  resolveGeometryRenderStyle,
} from "./actions-map-geometry.utils";
import { isActionMapItem } from "./action-popup-content.helpers";
import { resolveMapPlaceStateForItem } from "./actions-map-display-state";
import {
  ACTION_TRACE_HIT_AREA_WEIGHT,
  fitActionGeometryBounds,
  resolvePointColor,
  type ActionPointLayerProps,
} from "./map-layers.shared";

export function ShapeLayers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
  displayMode = "projected_today",
  currentPlaceStateViews = [],
}: ActionPointLayerProps) {
  const { references } = useActionPollutionScoreReferences();
  const map = useMap();
  const now = new Date();
  const layerRefs = useRef<Record<string, { openPopup?: () => void; closePopup?: () => void }>>({});
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
    layer?.openPopup?.();
  }, [selectedActionId]);

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

        const pollutionScores = resolveItemPollutionScores(item, references);
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
        const score = pollutionScores.severityScore;
        const actionProjection = isActionMapItem(item)
          ? presentActionPollutionProjection(
              score,
              mapItemObservedAt(item),
              now,
              {
                postActionScore: mapItemPostActionPollutionScore(item),
                geometryConfidence: geometry.confidence,
                sourceCompleteness: "partial",
              },
            )
          : null;
        const actionTooltipReading = actionProjection
          ? {
              historicalScore: actionProjection.historicalScore,
              projectedScore: actionProjection.projectedPollutionScore,
              elapsedDays: actionProjection.elapsedDays,
              isEstimate: actionProjection.isEstimate,
              projectionConfidenceLabel: formatProjectionConfidenceLabel(
                actionProjection.projectionConfidence.level,
              ),
              displayMode,
              displaySource:
                currentPlaceState?.source ??
                (displayMode === "projected_today" ? "projected" : "observed"),
              displayedScore:
                currentPlaceState?.score ??
                (displayMode === "projected_today"
                  ? actionProjection.projectedPollutionScore
                  : mapItemPostActionPollutionScore(item) ?? score),
              displayedScoreKind:
                currentPlaceState?.scoreKind ??
                (displayMode === "projected_today" ? "projected" : "measured"),
              displayedStateLabel:
                currentPlaceState?.stateLabel ??
                (displayMode === "projected_today"
                  ? "Pollution projetée"
                  : "Pollution observée"),
              displayedDate: currentPlaceState?.date ?? mapItemObservedAt(item),
            }
          : undefined;
        const coords = mapItemCoordinates(item);
        const renderStyle = resolveGeometryRenderStyle(geometry);
        const geometryModeLabel = formatGeometryModeLabel(geometry.presentation);
        const geometryPointsLabel = formatGeometryPointCount(geometry.pointCount);
        const geometryConfidenceLabel = resolveGeometryConfidenceLabel(
          geometry.presentation,
          geometry.confidence,
        );
        const geometryMetricLabel = geometry.metrics.label;
        const isSelected = selectedActionId === item.id;
        const corridorHistory = isActionMapItem(item)
          ? findCorridorHistoryForAction(corridorHistories, item.id)
          : null;
        const corridorItems = corridorHistory && corridorHistory.actions.length >= 2
          ? corridorHistory.actions
              .map((action) => actionItemsById.get(action.id))
              .filter((candidate): candidate is ActionMapItem => Boolean(candidate))
          : undefined;
        const endpointMarkers = isActionMapItem(item)
          ? resolvePolylineEndpointMarkers(geometry)
          : null;
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
          return (
            <Polygon
              key={`shape-${item.id}`}
              ref={(layer) => {
                if (layer) {
                  layerRefs.current[item.id] = layer;
                } else {
                  delete layerRefs.current[item.id];
                }
              }}
              positions={geometry.positions}
              eventHandlers={{
                click: () => {
                  onSelectAction?.(item.id);
                },
              }}
              pathOptions={{
                color: color,
                weight: (renderStyle.strokeWeight ?? 2) + (isSelected ? 2 : 0),
                opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? 0.95,
                fillOpacity: (renderStyle.fillOpacity ?? 0.24) + (isSelected ? 0.08 : 0),
                dashArray: renderStyle.dashArray,
              }}
            >
            <Tooltip className="glass-tooltip" direction="auto" sticky>
                <GeometryTooltipContent
                  title={
                    isActionMapItem(item)
                      ? formatActionGeometryTooltipTitle(
                          "polygon",
                          geometryMetricLabel,
                        )
                      : `Zone ${Math.round(score)}%`
                  }
                  geometryModeLabel={geometryModeLabel}
                  geometryPointsLabel={geometryPointsLabel}
                  geometryMetricLabel={geometryMetricLabel}
                  geometryConfidenceLabel={geometryConfidenceLabel}
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
                    )
                  }
                />
              </Popup>
            </Polygon>
          );
        }

        return (
          <Fragment key={`shape-${item.id}`}>
            <Polyline
              key={`visible-shape-${item.id}`}
              ref={(layer) => {
                if (layer) {
                  layerRefs.current[item.id] = layer;
                } else {
                  delete layerRefs.current[item.id];
                }
              }}
              positions={geometry.positions}
              eventHandlers={{
                click: () => {
                  onSelectAction?.(item.id);
                },
              }}
              pathOptions={{
                color: color,
                weight: (renderStyle.strokeWeight ?? 4) + (isSelected ? 2 : 0),
                opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? 0.92,
                dashArray: renderStyle.dashArray,
              }}
            >
              <Tooltip className="glass-tooltip" direction="auto" sticky>
                <GeometryTooltipContent
                  title={
                    isActionMapItem(item)
                      ? formatActionGeometryTooltipTitle(
                          "polyline",
                          geometryMetricLabel,
                        )
                      : `Trace ${Math.round(score)}%`
                  }
                  geometryModeLabel={geometryModeLabel}
                  geometryPointsLabel={geometryPointsLabel}
                  geometryMetricLabel={geometryMetricLabel}
                  geometryConfidenceLabel={geometryConfidenceLabel}
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
                }}
              />
            )}
            {endpointMarkers ? (
              <>
                <CircleMarker
                  center={endpointMarkers.start}
                  radius={3.5}
                  interactive={false}
                  pathOptions={{
                    color: "#ffffff",
                    fillColor: color,
                    fillOpacity: 0.95,
                    opacity: 0.95,
                    weight: 1.5,
                  }}
                />
                <CircleMarker
                  center={endpointMarkers.end}
                  radius={3.5}
                  interactive={false}
                  pathOptions={{
                    color: "#ffffff",
                    fillColor: color,
                    fillOpacity: 0.95,
                    opacity: 0.95,
                    weight: 1.5,
                  }}
                />
              </>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
