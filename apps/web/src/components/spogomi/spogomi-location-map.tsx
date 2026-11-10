"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ActionLocationCoordinates } from "@/lib/actions/types";
import { buildTerritoryLeafletBounds, TERRITORY_CENTER } from "@/lib/geo/territory";

const LOCATION_ICON = L.divIcon({
  className: "spogomi-location-marker",
  html: '<span aria-hidden="true" class="block h-5 w-5 rounded-full border-4 border-white bg-emerald-600 shadow-[0_2px_8px_rgba(6,78,59,0.45)]"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function LocationMapController({
  coordinates,
  onSelect,
}: {
  coordinates: ActionLocationCoordinates | null;
  onSelect: (coordinates: ActionLocationCoordinates) => void;
}) {
  const map = useMap();
  useMapEvents({
    click: (event) => onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
  });

  useEffect(() => {
    if (!coordinates) return;
    map.setView([coordinates.latitude, coordinates.longitude], Math.max(map.getZoom(), 15), { animate: false });
  }, [coordinates, map]);

  if (!coordinates) return null;
  return (
    <Marker
      position={[coordinates.latitude, coordinates.longitude]}
      icon={LOCATION_ICON}
      draggable
      eventHandlers={{
        dragend: (event) => {
          const position = event.target.getLatLng();
          onSelect({ latitude: position.lat, longitude: position.lng });
        },
      }}
    />
  );
}

export function SpogomiLocationMap({
  coordinates,
  onSelect,
}: {
  coordinates: ActionLocationCoordinates | null;
  onSelect: (coordinates: ActionLocationCoordinates) => void;
}) {
  return (
    <div className="relative h-[280px] overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50 sm:h-[320px]" aria-label="Carte de sélection du lieu">
      <MapContainer
        center={coordinates ? [coordinates.latitude, coordinates.longitude] : TERRITORY_CENTER}
        zoom={coordinates ? 15 : 5}
        minZoom={4}
        maxZoom={19}
        maxBounds={buildTerritoryLeafletBounds()}
        maxBoundsViscosity={0.85}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <LocationMapController coordinates={coordinates} onSelect={onSelect} />
      </MapContainer>
      <p className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500] rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold text-emerald-950 shadow-sm">
        Cliquez sur la carte ou déplacez l’épingle pour ajuster le point.
      </p>
    </div>
  );
}
