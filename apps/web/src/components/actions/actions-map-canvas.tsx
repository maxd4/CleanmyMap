"use client";

import { useMemo } from "react";
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  TileLayer,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCoordinates } from "@/lib/actions/data-contract";
import { MapControls } from "./map/map-controls";
import {
  SignalementMarkers,
  ShapeLayers,
  InfrastructureMarkers,
} from "./map/map-layers";

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

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
    <div className="overflow-hidden rounded-[2rem] border border-white/10 dark:border-white/5 bg-slate-950 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.45)] relative ring-1 ring-black/5">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-[68vh] min-h-[34rem] w-full bg-slate-900 transition-colors duration-500 md:h-[74vh] md:min-h-[42rem]"
      >
        <MapControls center={center} variant="immersive" />
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
            <LayerGroup>
              <SignalementMarkers items={items} />
              <ShapeLayers items={items} />
              <InfrastructureMarkers items={items} />
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
        <style>{`
          .cmm-infrastructure-marker {
            background: transparent;
            border: none;
          }
          .cmm-infrastructure-marker__outer {
            position: relative;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .cmm-infrastructure-marker__outer:hover {
            transform: scale(1.15) translateY(-4px);
          }
          .cmm-infrastructure-marker__glow {
            position: absolute;
            width: 32px;
            height: 32px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%);
            border-radius: 50%;
            animation: pulse-glow 2s infinite;
          }
          .cmm-infrastructure-marker__inner {
            position: relative;
            width: 34px;
            height: 34px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-blur: 8px;
            border: 2px solid white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          }
          html.dark .cmm-infrastructure-marker__inner {
            background: rgba(15, 23, 42, 0.8);
            border-color: rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          }
          .cmm-infrastructure-marker__emoji {
            font-size: 20px;
          }
          @keyframes pulse-glow {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
          .leaflet-container {
            background: var(--bg-canvas, #020617);
          }
        `}</style>
      </MapContainer>
    </div>
  );
}
