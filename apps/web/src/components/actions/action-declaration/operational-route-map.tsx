"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { OperationalRoute } from "@/lib/route/route-operational";
import { getOperationalRouteMeetingPoint, getPublicOperationalRouteSegments } from "@/lib/route/route-operational";
import { TERRITORY_CENTER, buildTerritoryLeafletBounds } from "@/lib/geo/territory";
import { cn } from "@/lib/utils";

function FitOperationalRouteBounds({ operationalRoute }: { operationalRoute: OperationalRoute }) {
  const map = useMap();
  useEffect(() => {
    const routePoints = getPublicOperationalRouteSegments(operationalRoute).flatMap(({ coordinates }) => coordinates);
    const guidedPoints = operationalRoute.routes.flatMap((route) => [
      ...(route.plannedWaypoints ?? []).map(({ latitude, longitude }) => [latitude, longitude] as [number, number]),
      ...(route.plannedSector ? [
        [route.plannedSector.center.latitude, route.plannedSector.center.longitude] as [number, number],
        [route.plannedSector.center.latitude + route.plannedSector.radiusKm / 111, route.plannedSector.center.longitude] as [number, number],
      ] : []),
    ]);
    const points = [...routePoints, ...guidedPoints];
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [24, 24], maxZoom: 16, animate: false });
    }
  }, [operationalRoute, map]);
  return null;
}

export function OperationalRouteMap({ operationalRoute, compact = false }: { operationalRoute: OperationalRoute; compact?: boolean }) {
  const segments = getPublicOperationalRouteSegments(operationalRoute);
  const zones = [
    ["Départ", operationalRoute.zones.departure.coordinate],
    ["Arrivée", operationalRoute.zones.arrival.coordinate],
  ] as const;
  const meetingPoints = operationalRoute.routes.flatMap((route) => {
    const meetingPoint = getOperationalRouteMeetingPoint(operationalRoute, route);
    return meetingPoint ? [{ route, meetingPoint }] : [];
  });
  const guidedPlans = operationalRoute.routes.flatMap((route) => route.plannedSector ? [{ route, sector: route.plannedSector }] : []);
  const guidedWaypoints = operationalRoute.routes.flatMap((route) => (route.plannedWaypoints ?? []).map((waypoint) => ({ route, waypoint })));

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-emerald-200/70", compact ? "h-[240px]" : "h-[320px]")}>
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
        {guidedPlans.map(({ route, sector }) => (
          <Circle
            key={`guided-sector-${route.routeId}`}
            center={[sector.center.latitude, sector.center.longitude]}
            radius={sector.radiusKm * 1_000}
            pathOptions={{ color: route.groupIndex % 2 === 0 ? "#2563eb" : "#059669", fillOpacity: 0.08, weight: 2, dashArray: "6 5" }}
          >
            <Tooltip>{`Secteur planifié · groupe ${route.groupIndex} · rayon ${sector.radiusKm} km`}</Tooltip>
          </Circle>
        ))}
        {guidedWaypoints.map(({ route, waypoint }) => (
          <CircleMarker
            key={`guided-waypoint-${route.routeId}-${waypoint.id}`}
            center={[waypoint.latitude, waypoint.longitude]}
            radius={7}
            pathOptions={{ color: "#312e81", fillColor: route.groupIndex % 2 === 0 ? "#60a5fa" : "#34d399", fillOpacity: 0.98, weight: 2 }}
          >
            <Tooltip>{`${waypoint.order + 1}. ${waypoint.label} · passage planifié · aucune observation`}</Tooltip>
          </CircleMarker>
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
        {meetingPoints.map(({ route, meetingPoint }) => (
          <CircleMarker
            key={`meeting-point-${route.routeId}`}
            center={meetingPoint.coordinates}
            radius={7}
            pathOptions={{ color: "#78350f", fillColor: "#f59e0b", fillOpacity: 0.98, weight: 3 }}
          >
            <Tooltip>
              {`Rendez-vous intermédiaire · boucle ${route.groupIndex} · ${meetingPoint.cumulativeDistanceKm === null ? "distance indisponible" : `${meetingPoint.cumulativeDistanceKm.toFixed(2)} km`} · ${meetingPoint.estimatedDurationMinutes === null ? "temps indisponible" : `${Math.round(meetingPoint.estimatedDurationMinutes)} min`}`}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
