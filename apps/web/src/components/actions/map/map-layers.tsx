"use client";

import { useEffect, useRef } from "react";
import {
  CircleMarker,
  Marker,
  Polygon,
  Polyline,
  Popup,
  Tooltip,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { divIcon } from "leaflet";
import { Info } from "lucide-react";
import { ActionMapItem } from "@/lib/actions/types";
import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemType,
  mapItemWasteKg,
  mapItemShouldRenderPoint,
} from "@/lib/actions/data-contract";
import type { PollutionScoreReferences } from "@/lib/actions/pollution-score";
import {
  resolveInfrastructureEmoji,
  resolveDynamicColor,
  resolveItemPollutionScores,
} from "@/components/actions/map-marker-categories";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";
import { ActionPopupContent } from "./action-popup-content";
import {
  formatNumber,
  formatThresholdScore,
  getInfrastructureReading,
} from "./map-layers.helpers";
import {
  formatClusterCount,
  resolveClusterAriaLabel,
  resolveClusterDensityTier,
  resolveClusterIconSize,
  resolveClusterRadius,
} from "./map-cluster.utils";
import { GeometryTooltipContent } from "./map-geometry-tooltip-content";
import {
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
  resolveActionMapGeometryViewModel,
  resolveInfrastructureAnchor,
  resolveGeometryRenderStyle,
} from "./actions-map-geometry.utils";
import {
  INFRASTRUCTURE_ALERT_THRESHOLD,
} from "@/components/actions/map-marker-categories";

function resolvePointColor(
  item: ActionMapItem,
  references?: PollutionScoreReferences | null,
): string {
  const score = resolveItemPollutionScores(item, references).severityScore;
  if (
    (mapItemWasteKg(item) ?? 0) <= 0 &&
    (mapItemCigaretteButts(item) ?? 0) <= 0
  ) {
    return "#0284c7"; // Bleu propre
  }
  return resolveDynamicColor(score);
}

export function isTrashSpotterItem(item: ActionMapItem): boolean {
  const type = mapItemType(item);
  return type === "spot" || item.source === "spots" || item.record_type === "other";
}

export function SignalementMarkers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
}: {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
}) {
  const { references } = useActionPollutionScoreReferences();
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
      iconCreateFunction={(cluster) => {
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

        const color = resolvePointColor(item, references);
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
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </MarkerClusterGroup>
  );
}

export function ShapeLayers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
}: {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
}) {
  const { references } = useActionPollutionScoreReferences();
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
    <>
      {items.map((item) => {
        const geometry = resolveActionMapGeometryViewModel(item);
        if (geometry.renderMode !== "drawing" || geometry.positions.length === 0) {
          return null;
        }

        const pollutionScores = resolveItemPollutionScores(item, references);
        const color = resolvePointColor(item, references);
        const score = pollutionScores.severityScore;
        const coords = mapItemCoordinates(item);
        const renderStyle = resolveGeometryRenderStyle(geometry);
        const geometryModeLabel = formatGeometryModeLabel(geometry.presentation);
        const geometryPointsLabel = formatGeometryPointCount(geometry.pointCount);
        const geometryConfidenceLabel = formatGeometryConfidenceLabel(
          geometry.confidence,
        );
        const geometryMetricLabel = geometry.metrics.label;
        const isSelected = selectedActionId === item.id;

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
                  title={`Zone ${Math.round(score)}%`}
                  geometryModeLabel={geometryModeLabel}
                  geometryPointsLabel={geometryPointsLabel}
                  geometryMetricLabel={geometryMetricLabel}
                  geometryConfidenceLabel={geometryConfidenceLabel}
                  color={color}
                />
              </Tooltip>
              <Popup className="glass-popup custom-popup">
                <ActionPopupContent
                  key={item.id}
                  item={item}
                  color={color}
                  coords={coords}
                />
              </Popup>
            </Polygon>
          );
        }

        return (
          <Polyline
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
              weight: (renderStyle.strokeWeight ?? 4) + (isSelected ? 2 : 0),
              opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? 0.92,
              dashArray: renderStyle.dashArray,
            }}
          >
            <Tooltip className="glass-tooltip" direction="auto" sticky>
              <GeometryTooltipContent
                title={`Trace ${Math.round(score)}%`}
                geometryModeLabel={geometryModeLabel}
                geometryPointsLabel={geometryPointsLabel}
                geometryMetricLabel={geometryMetricLabel}
                geometryConfidenceLabel={geometryConfidenceLabel}
                color={color}
              />
            </Tooltip>
            <Popup className="glass-popup custom-popup">
              <ActionPopupContent
                key={item.id}
                item={item}
                color={color}
                coords={coords}
              />
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

export function TrashSpotterMarkers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
}: {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
}) {
  const spotItems = items.filter(isTrashSpotterItem);
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
      iconCreateFunction={(cluster) => {
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
              color: "#16a34a",
              fillColor: "#22c55e",
              fillOpacity: isSelected ? 0.9 : 0.82,
              weight: 2 + (isSelected ? 1 : 0),
              opacity: 1,
            }}
          >
            <Popup className="glass-popup custom-popup">
              <ActionPopupContent
                key={item.id}
                item={item}
                color="#22c55e"
                coords={coords}
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </MarkerClusterGroup>
  );
}

export function InfrastructureMarkers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
}: {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
}) {
  const { references } = useActionPollutionScoreReferences();
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
    <>
      {items.map((item) => {
        const emoji = resolveInfrastructureEmoji(item, references);
        if (!emoji) {
          return null;
        }

        const anchor = resolveInfrastructureAnchor(item);
        if (!anchor) {
          return null;
        }
        const isSelected = selectedActionId === item.id;
        const infra = getInfrastructureReading(item, references);

        return (
          <Marker
            key={`infrastructure-${item.id}`}
            ref={(layer) => {
              if (layer) {
                layerRefs.current[item.id] = layer;
              } else {
                delete layerRefs.current[item.id];
              }
            }}
            position={anchor}
            interactive={true}
            eventHandlers={{
              click: () => {
                onSelectAction?.(item.id);
              },
            }}
            icon={divIcon({
              className: "cmm-infrastructure-marker",
              html: `
                <div class="cmm-infrastructure-marker__outer group">
                  <div class="cmm-infrastructure-marker__glow"></div>
                  <div class="cmm-infrastructure-marker__inner${isSelected ? " cmm-infrastructure-marker__inner--selected" : ""}">
                    <span class="cmm-infrastructure-marker__emoji">${emoji}</span>
                  </div>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup className="glass-popup custom-popup">
              <div className="p-5 space-y-4 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-2xl shadow-inner border border-violet-200/50 ${isSelected ? "ring-4 ring-violet-400/40" : ""}`}>
                    {emoji}
                  </div>
                  <div>
                    <h3 className="cmm-text-body font-bold cmm-text-primary">Besoin détecté</h3>
                    <p className="cmm-text-caption text-violet-600 font-bold uppercase tracking-wider">Infrastructure</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="cmm-text-caption cmm-text-muted">Type suggéré</span>
                    <span className="text-xs font-bold cmm-text-primary">
                      {infra.needLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="cmm-text-caption cmm-text-muted">Priorité</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-widest">
                      {infra.priorityLabel}
                    </span>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <span className="cmm-text-caption cmm-text-muted">Seuil infra</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {INFRASTRUCTURE_ALERT_THRESHOLD}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Déchets</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatNumber(infra.wasteKg, " kg")}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contribution</p>
                        <p className={infra.needsBin ? "text-xs font-black text-rose-700" : "text-xs font-semibold text-slate-700"}>
                          {formatThresholdScore(infra.wasteScore)}
                        </p>
                      </div>
                      <span className={infra.needsBin ? "rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700" : "rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600"}>
                        {infra.needsBin ? "Atteint" : "Sous seuil"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mégots</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatNumber(infra.butts)}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contribution</p>
                        <p className={infra.needsAshtray ? "text-xs font-black text-rose-700" : "text-xs font-semibold text-slate-700"}>
                          {formatThresholdScore(infra.buttsScore)}
                        </p>
                      </div>
                      <span className={infra.needsAshtray ? "rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700" : "rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600"}>
                        {infra.needsAshtray ? "Atteint" : "Sous seuil"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200">
                    <div className="mt-0.5"><Info size={14} className="text-violet-500" /></div>
                    <p className="text-[10px] leading-relaxed italic">
                      <strong>Lecture seuil :</strong> besoin déclenché quand la contribution déchets ou mégots atteint {INFRASTRUCTURE_ALERT_THRESHOLD}/100. Le marqueur peut être bac, cendrier ou combiné selon le signal atteint.
                    </p>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
