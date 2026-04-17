"use client";

import { useMemo } from "react";
import {
  CircleMarker,
  LayersControl,
  MapContainer,
  Polygon,
  Polyline,
  Tooltip,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression, LatLngTuple } from "leaflet";
import type { ActionMapItem, ActionDrawing } from "@/lib/actions/types";
import {
  resolveDynamicColor,
  SCORE_THRESHOLDS,
} from "@/components/actions/map-marker-categories";
import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemWasteKg,
} from "../../lib/actions/data-contract";
import { computePollutionScore } from "@/lib/actions/pollution-score";

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

function getPollutionScore(item: ActionMapItem): number {
  return computePollutionScore({
    wasteKg: mapItemWasteKg(item),
    cigaretteButts: mapItemCigaretteButts(item),
  });
}

function resolvePointColor(item: ActionMapItem): string {
  const score = getPollutionScore(item);
  if (mapItemWasteKg(item) <= 0 && mapItemCigaretteButts(item) <= 0) {
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

export function ActionsMapCanvas({ items }: { items: ActionMapItem[] }) {
  const center = useMemo<LatLngTuple>(() => {
    const first = items.find(
      (item) =>
        mapItemCoordinates(item).latitude !== null &&
        mapItemCoordinates(item).longitude !== null,
    );
    if (!first) {
      return PARIS_CENTER;
    }
    const coords = mapItemCoordinates(first);
    if (coords.latitude === null || coords.longitude === null) {
      return PARIS_CENTER;
    }
    return [coords.latitude, coords.longitude];
  }, [items]);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-[460px] w-full bg-white transition-colors duration-500"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mode Clair">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Mode Sombre">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Google'
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Signalements">
            <L.LayerGroup>
              {items.map((item) => {
                const coords = mapItemCoordinates(item);
                if (coords.latitude === null || coords.longitude === null) return null;
                
                const score = getPollutionScore(item);
                const color = resolvePointColor(item);

                return (
                  <CircleMarker
                    key={`point-${item.id}`}
                    center={[coords.latitude, coords.longitude]}
                    radius={6}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                  >
                    <Tooltip className="glass-tooltip" direction="top" offset={[0, -10]}>
                      <div className="text-center">
                        <p className="text-[10px] uppercase opacity-70">Encaissé</p>
                        <p className="text-lg font-bold leading-tight">
                          {Math.min(100, Math.round(score))}%
                        </p>
                        <p className="text-[9px] font-medium leading-none opacity-80">
                          Pol. / Impact
                        </p>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

              {items.map((item) => {
                const coordinates = drawingCoordinates(item.manual_drawing);
                if (!item.manual_drawing || coordinates.length === 0) return null;
                
                const color = resolvePointColor(item);
                const score = getPollutionScore(item);

                if (item.manual_drawing.kind === "polygon") {
                  return (
                    <Polygon
                      key={`shape-${item.id}`}
                      positions={coordinates}
                      pathOptions={{
                        color: color,
                        weight: 2,
                        fillOpacity: 0.25,
                        dashArray: score >= SCORE_THRESHOLDS.STRONG ? "5, 10" : undefined,
                      }}
                    >
                      <Tooltip className="glass-tooltip" direction="center" sticky>
                        <div className="text-center">
                          <p className="text-[9px] uppercase font-bold tracking-wider">Zone {Math.round(score)}%</p>
                        </div>
                      </Tooltip>
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
                      opacity: 0.85,
                      className: score >= SCORE_THRESHOLDS.MEDIUM ? "leaflet-ant-path" : ""
                    }}
                  >
                     <Tooltip className="glass-tooltip" direction="top" sticky>
                        <div className="text-center">
                          <p className="text-[9px] uppercase font-bold tracking-wider">Trace {Math.round(score)}%</p>
                        </div>
                      </Tooltip>
                  </Polyline>
                );
              })}
            </L.LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
