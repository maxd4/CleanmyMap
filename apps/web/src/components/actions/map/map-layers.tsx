"use client";

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
  mapItemCoordinates,
  mapItemShouldRenderPoint,
  mapItemWasteKg,
  mapItemCigaretteButts,
} from "@/lib/actions/data-contract";
import { computePollutionScore } from "@/lib/actions/pollution-score";
import {
  resolveInfrastructureEmoji,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import { ActionPopupContent } from "./action-popup-content";
import {
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
  resolveActionMapGeometryViewModel,
  resolveInfrastructureAnchor,
  resolveGeometryRenderStyle,
} from "./actions-map-geometry.utils";

function getPollutionScore(item: ActionMapItem): number {
  return computePollutionScore({
    wasteKg: mapItemWasteKg(item),
    cigaretteButts: mapItemCigaretteButts(item),
  });
}

function resolvePointColor(item: ActionMapItem): string {
  const score = getPollutionScore(item);
  if (
    (mapItemWasteKg(item) ?? 0) <= 0 &&
    (mapItemCigaretteButts(item) ?? 0) <= 0
  ) {
    return "#0284c7"; // Bleu propre
  }
  return resolveDynamicColor(score);
}

function GeometryTooltipContent({
  title,
  geometryModeLabel,
  geometryPointsLabel,
  geometryMetricLabel,
  geometryConfidenceLabel,
  color,
}: {
  title: string;
  geometryModeLabel: string;
  geometryPointsLabel: string;
  geometryMetricLabel: string | null;
  geometryConfidenceLabel: string | null;
  color: string;
}) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.5)] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-2">
        <span className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {geometryModeLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {geometryPointsLabel}
        </span>
      </div>

      <p className="mt-1 text-[11px] font-bold leading-tight text-slate-900 dark:text-slate-50">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {geometryMetricLabel && (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {geometryMetricLabel}
          </span>
        )}
        {geometryConfidenceLabel && (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {geometryConfidenceLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function SignalementMarkers({
  items,
  visible = true,
  selectedActionId = null,
}: {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
}) {
  if (!visible) {
    return null;
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={50}
      spiderfyOnMaxZoom={true}
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

        const score = getPollutionScore(item);
        const color = resolvePointColor(item);
        const geometry = resolveActionMapGeometryViewModel(item);
        const renderStyle = resolveGeometryRenderStyle(geometry);
        const isFallbackPoint = geometry.presentation.strokeStyle === "point";
        const isSelected = selectedActionId === item.id;

        return (
          <CircleMarker
            key={`point-${item.id}`}
            center={geometry.anchor ?? [coords.latitude, coords.longitude]}
            radius={renderStyle.pointRadius ?? (isFallbackPoint ? 4.5 : 6) + (isSelected ? 2 : 0)}
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
                item={item}
                color={color}
                score={score}
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
}: {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
}) {
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

        const color = resolvePointColor(item);
        const score = getPollutionScore(item);
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
              positions={geometry.positions}
              pathOptions={{
                color: color,
                weight: (renderStyle.strokeWeight ?? 2) + (isSelected ? 2 : 0),
                opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? 0.95,
                fillOpacity: (renderStyle.fillOpacity ?? 0.24) + (isSelected ? 0.08 : 0),
                dashArray: renderStyle.dashArray,
              }}
            >
              <Tooltip className="glass-tooltip" direction="center" sticky>
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
                  item={item}
                  color={color}
                  score={score}
                  coords={coords}
                />
              </Popup>
            </Polygon>
          );
        }

        return (
          <Polyline
            key={`shape-${item.id}`}
            positions={geometry.positions}
            pathOptions={{
              color: color,
              weight: (renderStyle.strokeWeight ?? 4) + (isSelected ? 2 : 0),
              opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? 0.92,
              dashArray: renderStyle.dashArray,
            }}
          >
            <Tooltip className="glass-tooltip" direction="top" sticky>
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
                item={item}
                color={color}
                score={score}
                coords={coords}
              />
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

export function InfrastructureMarkers({
  items,
  visible = true,
  selectedActionId = null,
}: {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
}) {
  if (!visible) {
    return null;
  }

  return (
    <>
      {items.map((item) => {
        const emoji = resolveInfrastructureEmoji(item);
        if (!emoji) {
          return null;
        }

        const anchor = resolveInfrastructureAnchor(item);
        if (!anchor) {
          return null;
        }
        const isSelected = selectedActionId === item.id;

        return (
          <Marker
            key={`infrastructure-${item.id}`}
            position={anchor}
            interactive={true}
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
                      {item.cigarette_butts && item.cigarette_butts > 0 ? "Cendrier de rue" : "Bac de collecte"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="cmm-text-caption cmm-text-muted">Priorité</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-widest">Critique</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200">
                    <div className="mt-0.5"><Info size={14} className="text-violet-500" /></div>
                    <p className="text-[10px] leading-relaxed italic">
                      <strong>Analyse Scientifique :</strong> Ce besoin est généré automatiquement car la densité de déchets observée ({mapItemWasteKg(item)}kg) dépasse le seuil de saturation des infrastructures existantes.
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
