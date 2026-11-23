"use client";

import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { buildTerritoryLeafletBounds, TERRITORY_CENTER } from "@/lib/geo/territory";

function FitPoint({ coordinate }: { coordinate: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coordinate, 15, { animate: false });
  }, [coordinate, map]);
  return null;
}

function FitPlannedRoute({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 1) map.fitBounds(coordinates, { padding: [20, 20], animate: false });
  }, [coordinates, map]);
  return null;
}

export function TerrainMapCanvas({ coordinate, label, plannedRoutes = [] }: { coordinate: [number, number]; label: string; plannedRoutes?: [number, number][][] }) {
  const routePoints = plannedRoutes.flat();
  return (
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
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png" maxZoom={18} />
      <FitPoint coordinate={coordinate} />
      {routePoints.length > 1 ? <FitPlannedRoute coordinates={[...routePoints, coordinate]} /> : null}
      {plannedRoutes.map((route, index) => route.length > 1 ? <Polyline key={`planned-route-${index}`} positions={route} pathOptions={{ color: "#7c3aed", weight: 4, dashArray: "8 8" }}><Tooltip>Segment GPX prévu {index + 1}</Tooltip></Polyline> : null)}
      <CircleMarker center={coordinate} radius={9} pathOptions={{ color: "#065f46", fillColor: "#34d399", fillOpacity: 0.95, weight: 3 }}>
        <Tooltip>{label}</Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
