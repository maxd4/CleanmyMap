"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
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

export function TerrainMapCanvas({ coordinate, label }: { coordinate: [number, number]; label: string }) {
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
      <CircleMarker center={coordinate} radius={9} pathOptions={{ color: "#065f46", fillColor: "#34d399", fillOpacity: 0.95, weight: 3 }}>
        <Tooltip>{label}</Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
