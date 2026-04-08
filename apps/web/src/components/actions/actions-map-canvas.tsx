"use client";

import { useMemo } from "react";
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer } from "react-leaflet";
import type { LatLngExpression, LatLngTuple } from "leaflet";
import type { ActionMapItem, ActionDrawing } from "@/lib/actions/types";
import { classifyPollutionColor } from "@/components/actions/map-marker-categories";
import { mapItemCoordinates, mapItemLocationLabel } from "../../lib/actions/data-contract";

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

function resolvePointColor(item: ActionMapItem): string {
  const category = classifyPollutionColor(item);
  if (category === "violet") {
    return "#7c3aed";
  }
  if (category === "yellow") {
    return "#ca8a04";
  }
  if (category === "blue") {
    return "#0284c7";
  }
  return "#059669";
}

function drawingCoordinates(drawing: ActionDrawing | null | undefined): LatLngExpression[] {
  if (!drawing) {
    return [];
  }
  return drawing.coordinates.map((point) => [point[0], point[1]] as LatLngExpression);
}

export function ActionsMapCanvas({ items }: { items: ActionMapItem[] }) {
  const center = useMemo<LatLngTuple>(() => {
    const first = items.find((item) => mapItemCoordinates(item).latitude !== null && mapItemCoordinates(item).longitude !== null);
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
      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[460px] w-full bg-white">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {items.map((item) => {
          const coords = mapItemCoordinates(item);
          if (coords.latitude === null || coords.longitude === null) {
            return null;
          }
          return (
            <CircleMarker
              key={`point-${item.id}`}
              center={[coords.latitude, coords.longitude]}
              radius={6}
              pathOptions={{
                color: resolvePointColor(item),
                fillColor: resolvePointColor(item),
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <p className="font-semibold">{mapItemLocationLabel(item)}</p>
                <p className="text-xs">Statut: {item.status}</p>
              </Popup>
            </CircleMarker>
          );
        })}

        {items.map((item) => {
          const coordinates = drawingCoordinates(item.manual_drawing);
          if (!item.manual_drawing || coordinates.length === 0) {
            return null;
          }

          if (item.manual_drawing.kind === "polygon") {
            return (
              <Polygon
                key={`shape-${item.id}`}
                positions={coordinates}
                pathOptions={{ color: "#2563eb", weight: 3, fillOpacity: 0.18 }}
              >
                <Popup>
                  <p className="font-semibold">{mapItemLocationLabel(item)}</p>
                  <p className="text-xs">Polygone nettoye ({item.manual_drawing.coordinates.length} points)</p>
                </Popup>
              </Polygon>
            );
          }

          return (
            <Polyline
              key={`shape-${item.id}`}
              positions={coordinates}
              pathOptions={{ color: "#0f766e", weight: 4 }}
            >
              <Popup>
                <p className="font-semibold">{mapItemLocationLabel(item)}</p>
                <p className="text-xs">Trace nettoyee ({item.manual_drawing.coordinates.length} points)</p>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
}
