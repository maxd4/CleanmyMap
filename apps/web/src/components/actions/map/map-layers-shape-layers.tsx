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
import { resolveActionPollutionScore } from "./pollution-score-scope";

export function ShapeLayers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
  displayMode = "projected_today",
  currentPlaceStateViews = [],
  scoreScope = "global",
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
