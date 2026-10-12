"use client";

import { useEffect } from "react";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitRoute({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (coordinates.length > 1) map.fitBounds(coordinates, { padding: [24, 24], maxZoom: 16, animate: false }); }, [coordinates, map]);
  return null;
}

export function SpogomiOfficialRouteMap({ coordinates }: { coordinates: [number, number][] }) {
  return <div className="h-[320px] overflow-hidden rounded-2xl border border-amber-200/70"><MapContainer center={coordinates[0] ?? [48.8566, 2.3522]} zoom={6} scrollWheelZoom className="h-full w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png" /><FitRoute coordinates={coordinates} /><Polyline positions={coordinates} pathOptions={{ color: "#b45309", weight: 5, opacity: 0.88 }} /></MapContainer></div>;
}
