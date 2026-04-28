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
import { divIcon, LatLngExpression, LatLngTuple } from "leaflet";
import { Info } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionMapItem, ActionDrawing } from "@/lib/actions/types";
import {
  mapItemCoordinates,
  mapItemShouldRenderPoint,
  mapItemWasteKg,
  mapItemCigaretteButts,
  getGeometryPresentation,
  mapItemDrawing,
} from "@/lib/actions/data-contract";
import { computePollutionScore } from "@/lib/actions/pollution-score";
import {
  resolveInfrastructureEmoji,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import { ActionPopupContent } from "./action-popup-content";

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

function drawingCoordinates(
  drawing: ActionDrawing | null | undefined,
): LatLngExpression[] {
  if (!drawing) {
    return [];
  }
  return drawing.coordinates.map(
    (point) => [point[0], point[1]] as LatLngExpression,
  );
}

function resolveInfrastructureAnchor(
  item: ActionMapItem,
  drawing: ActionDrawing | null,
): LatLngTuple | null {
  if (drawing && drawing.coordinates.length > 0) {
    const [latitudeSum, longitudeSum] = drawing.coordinates.reduce(
      (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
      [0, 0],
    );
    return [
      latitudeSum / drawing.coordinates.length,
      longitudeSum / drawing.coordinates.length,
    ];
  }

  const coords = mapItemCoordinates(item);
  if (coords.latitude === null || coords.longitude === null) {
    return null;
  }

  return [coords.latitude, coords.longitude];
}

export function SignalementMarkers({ items }: { items: ActionMapItem[] }) {
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
        const geometry = getGeometryPresentation(item);
        const isFallbackPoint = geometry.strokeStyle === "point";

        return (
          <CircleMarker
            key={`point-${item.id}`}
            center={[coords.latitude, coords.longitude]}
            radius={isFallbackPoint ? 4.5 : 6}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isFallbackPoint ? 0.52 : 0.85,
              weight: isFallbackPoint ? 1.5 : 2,
              opacity: isFallbackPoint ? 0.7 : 0.95,
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

export function ShapeLayers({ items }: { items: ActionMapItem[] }) {
  return (
    <>
      {items.map((item) => {
        const drawing = mapItemDrawing(item);
        const coordinates = drawingCoordinates(drawing);
        if (!drawing || coordinates.length === 0) return null;

        const color = resolvePointColor(item);
        const score = getPollutionScore(item);
        const coords = mapItemCoordinates(item);
        const geometry = getGeometryPresentation(item);
        const isEstimated = geometry.strokeStyle === "dashed";

        if (drawing.kind === "polygon") {
          return (
            <Polygon
              key={`shape-${item.id}`}
              positions={coordinates}
              pathOptions={{
                color: color,
                weight: 2,
                opacity: isEstimated ? 0.8 : 0.95,
                fillOpacity: isEstimated ? 0.14 : 0.24,
                dashArray: isEstimated ? "8 8" : undefined,
              }}
            >
              <Tooltip className="glass-tooltip" direction="center" sticky>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold tracking-wider">
                    Zone {Math.round(score)}%
                  </p>
                </div>
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
            positions={coordinates}
            pathOptions={{
              color: color,
              weight: 4,
              opacity: isEstimated ? 0.75 : 0.92,
              dashArray: isEstimated ? "8 8" : undefined,
            }}
          >
            <Tooltip className="glass-tooltip" direction="top" sticky>
              <div className="text-center">
                <p className="text-[9px] uppercase font-bold tracking-wider">
                  Trace {Math.round(score)}%
                </p>
              </div>
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

export function InfrastructureMarkers({ items }: { items: ActionMapItem[] }) {
  return (
    <>
      {items.map((item) => {
        const emoji = resolveInfrastructureEmoji(item);
        if (!emoji) {
          return null;
        }

        const drawing = mapItemDrawing(item);
        const anchor = resolveInfrastructureAnchor(item, drawing);
        if (!anchor) {
          return null;
        }

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
                  <div class="cmm-infrastructure-marker__inner">
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
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-2xl shadow-inner border border-violet-200/50">
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
