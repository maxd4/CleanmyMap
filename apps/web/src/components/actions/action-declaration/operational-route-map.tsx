"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { OperationalRoute } from "@/lib/route/route-operational";
import { getPublicOperationalRouteSegments } from "@/lib/route/route-operational";
import { TERRITORY_CENTER, buildTerritoryLeafletBounds } from "@/lib/geo/territory";

function FitOperationalRouteBounds({ operationalRoute }: { operationalRoute: OperationalRoute }) {
  const map = useMap();
  useEffect(() => {
    const points = getPublicOperationalRouteSegments(operationalRoute).flatMap(({ coordinates }) => coordinates);
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [24, 24], maxZoom: 16, animate: false });
    }
  }, [operationalRoute, map]);
  return null;
}

export function OperationalRouteMap({ operationalRoute }: { operationalRoute: OperationalRoute }) {
  const segments = getPublicOperationalRouteSegments(operationalRoute);
  const zones = [
    ["Départ", operationalRoute.zones.departure.coordinate],
    ["Mi-parcours", operationalRoute.zones.midpoint.coordinate],
    ["Arrivée", operationalRoute.zones.arrival.coordinate],
  ] as const;

  return (
    <div className="h-[320px] overflow-hidden rounded-2xl border border-emerald-200/70">
      <MapContainer
        center={TERRITORY_CENTER}
        zoom={5}
        minZoom={4}
        maxZoom={18}
        maxBounds={buildTerritoryLeafletBounds()}
        maxBoundsViscosity={0.9}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
          maxZoom={18}
        />
        <FitOperationalRouteBounds operationalRoute={operationalRoute} />
        {segments.map((segment, index) => (
          <Polyline
            key={segment.routeId}
            positions={segment.coordinates}
            pathOptions={{ color: index % 2 === 0 ? "#059669" : "#2563eb", weight: 5, opacity: 0.88 }}
          />
        ))}
        {zones.map(([label, coordinate]) =>
          coordinate ? (
            <CircleMarker
              key={label}
              center={coordinate}
              radius={6}
              pathOptions={{ color: "#0f172a", fillColor: "#f59e0b", fillOpacity: 0.95, weight: 2 }}
            >
              <Tooltip>{label}</Tooltip>
            </CircleMarker>
          ) : null,
        )}
      </MapContainer>
    </div>
  );
}
