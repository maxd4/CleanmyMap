"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";
import type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";
import type {
  RouteRecommendationOrigin,
  RouteResponseOrigin,
} from "../route-types";

const EMPTY_CENTER: [number, number] = [48.8566, 2.3522];

export function buildRouteMapCoordinates(
  stops: RouteStop[],
  routeGeometry: RouteGeometry,
  origin?: RouteResponseOrigin | null,
): [number, number][] {
  const originCoordinates = origin
    ? ([[origin.latitude, origin.longitude]] as [number, number][])
    : [];
  const stopCoordinates = stops.map(
    (stop) => [stop.latitude, stop.longitude] as [number, number],
  );
  return [...originCoordinates, ...routeGeometry.coordinates, ...stopCoordinates];
}

function RouteMapViewport({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const uniqueCoordinates = coordinates.filter(
      (coordinate, index) =>
        coordinates.findIndex(
          (candidate) =>
            candidate[0] === coordinate[0] && candidate[1] === coordinate[1],
        ) === index,
    );
    if (uniqueCoordinates.length >= 2) {
      map.fitBounds(uniqueCoordinates, {
        padding: [32, 32],
        maxZoom: 16,
        animate: false,
      });
    }
  }, [coordinates, map]);

  return null;
}

function buildStopIcon(index: number, selected: boolean) {
  return divIcon({
    className: "cmm-route-stop-icon",
    html: `<span class="cmm-route-stop-icon__body${selected ? " cmm-route-stop-icon__body--selected" : ""}">${index + 1}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function buildOriginIcon() {
  return divIcon({
    className: "cmm-route-origin-icon",
    html: '<span class="cmm-route-origin-icon__body">Départ</span>',
    iconSize: [76, 28],
    iconAnchor: [38, 14],
  });
}

function RouteOriginPicker({
  onSelectOrigin,
}: {
  onSelectOrigin: (origin: RouteRecommendationOrigin) => void;
}) {
  useMapEvents({
    click: ({ latlng }) => {
      onSelectOrigin({
        latitude: latlng.lat,
        longitude: latlng.lng,
        source: "map",
      });
    },
  });

  return null;
}

export function RouteMap({
  stops,
  routeGeometry,
  selectedStopId = null,
  onSelectStop,
  origin = null,
  onSelectOrigin,
  onClearOrigin,
  fr,
}: {
  stops: RouteStop[];
  routeGeometry: RouteGeometry;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string) => void;
  origin?: RouteResponseOrigin | null;
  onSelectOrigin?: (origin: RouteRecommendationOrigin) => void;
  onClearOrigin?: () => void;
  fr: boolean;
}) {
  const mapCoordinates = useMemo(
    () => buildRouteMapCoordinates(stops, routeGeometry, origin),
    [origin, routeGeometry, stops],
  );
  const routeCoordinates =
    routeGeometry.coordinates.length >= 2
      ? routeGeometry.coordinates
      : stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  const center = origin
    ? [origin.latitude, origin.longitude] as [number, number]
    : routeCoordinates[0] ?? EMPTY_CENTER;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/18 bg-[rgba(10,31,50,0.98)] shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
      <div className="absolute left-4 top-4 z-[1000] rounded-full border border-white/15 bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl">
        {routeGeometry.mode === "network"
          ? `${fr ? "Réseau" : "Network"} · ${routeGeometry.provider.toUpperCase()} · ${fr ? "profil configuré" : "configured profile"}: ${routeGeometry.profile ?? "n/a"}`
          : fr
            ? "Itinéraire estimé · réseau indisponible"
            : "Estimated route · network unavailable"}
      </div>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        className="h-[430px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          crossOrigin="anonymous"
        />
        <RouteMapViewport coordinates={mapCoordinates} />
        {onSelectOrigin ? <RouteOriginPicker onSelectOrigin={onSelectOrigin} /> : null}
        {origin ? (
          <Marker
            position={[origin.latitude, origin.longitude]}
            icon={buildOriginIcon()}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              {origin.source === "map"
                ? fr
                  ? "Point choisi sur la carte"
                  : "Point chosen on the map"
                : fr
                  ? "Point de départ utilisé"
                  : "Starting point used"}
            </Tooltip>
            <Popup>
              {origin.source === "map"
                ? fr
                  ? "Point choisi sur la carte"
                  : "Point chosen on the map"
                : fr
                  ? "Point de départ utilisé"
                  : "Starting point used"}
              {onClearOrigin ? (
                <button type="button" onClick={onClearOrigin}>
                  {fr ? "Réinitialiser" : "Reset"}
                </button>
              ) : null}
            </Popup>
          </Marker>
        ) : null}
        {routeCoordinates.length >= 2 ? (
          <Polyline
            positions={routeCoordinates}
            pathOptions={
              routeGeometry.mode === "network"
                ? { color: "#34d399", weight: 5, opacity: 0.9 }
                : {
                    color: "#fbbf24",
                    weight: 5,
                    opacity: 0.95,
                    dashArray: "10 10",
                  }
            }
          >
            <Tooltip sticky>
              {routeGeometry.mode === "network"
                ? fr
                  ? "Tracé suivant le réseau routable"
                  : "Network route"
                : fr
                  ? "Tracé estimé entre les arrêts"
                  : "Estimated line between stops"}
            </Tooltip>
          </Polyline>
        ) : null}
        {stops.map((stop, index) => {
          const selected = selectedStopId === stop.id;
          return (
            <Marker
              key={stop.id}
              position={[stop.latitude, stop.longitude]}
              icon={buildStopIcon(index, selected)}
              eventHandlers={{
                click: () => onSelectStop?.(stop.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -12]}>
                {`${index + 1}. ${stop.label}`}
              </Tooltip>
              <Popup>
                <strong>{index + 1}. {stop.label}</strong>
                <br />
                {stop.segmentKm.toFixed(2)} km · {stop.estimatedMinutes} min
              </Popup>
            </Marker>
          );
        })}
        {stops.map((stop) => (
          <CircleMarker
            key={`anchor-${stop.id}`}
            center={[stop.latitude, stop.longitude]}
            radius={selectedStopId === stop.id ? 13 : 9}
            pathOptions={{
              color: "#064e3b",
              fillColor: "#6ee7b7",
              fillOpacity: selectedStopId === stop.id ? 0.25 : 0.12,
              weight: 2,
            }}
            interactive={false}
          />
        ))}
      </MapContainer>
      {routeGeometry.mode === "network" &&
      routeGeometry.provider === "fossgis-osrm" ? (
        <p className="border-t border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-200">
          Routage piéton FOSSGIS /{" "}
          <a
            className="underline decoration-emerald-300 underline-offset-2"
            href="https://www.openstreetmap.org"
            rel="noreferrer"
            target="_blank"
          >
            OpenStreetMap
          </a>{" "}
          ·{" "}
          <a
            className="underline decoration-emerald-300 underline-offset-2"
            href="https://www.openstreetmap.org/fixthemap"
            rel="noreferrer"
            target="_blank"
          >
            Corriger la carte
          </a>
        </p>
      ) : null}
    </section>
  );
}
