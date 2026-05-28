"use client";

import { useMemo, useState } from "react";
import { LayerGroup, LayersControl, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ActionMapItem } from "@/lib/actions/types";
import { cn } from "@/lib/utils";
import { MapControls } from "./map/map-controls";
import { SignalementMarkers, ShapeLayers, InfrastructureMarkers } from "./map/map-layers";
import { getActionsMapCenter } from "./actions-map-canvas.utils";
import {
  DEFAULT_VISIBLE_MAP_LAYERS,
  toggleVisibleMapLayer,
  type VisibleMapLayerKey,
} from "./actions-map-canvas.layers";

type ActionsMapCanvasProps = {
  items: ActionMapItem[];
  selectedActionId?: string | null;
  fullViewport?: boolean;
  compact?: boolean;
  className?: string;
};

export function ActionsMapCanvas({
  items,
  selectedActionId = null,
  fullViewport = false,
  compact = false,
  className,
}: ActionsMapCanvasProps) {
  const center = useMemo(() => getActionsMapCenter(items), [items]);
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_VISIBLE_MAP_LAYERS);

  function toggleLayer(key: VisibleMapLayerKey) {
    setVisibleLayers((current) => toggleVisibleMapLayer(current, key));
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-sky-300/16 bg-[rgba(10,31,50,0.98)] shadow-[0_32px_64px_-12px_rgba(56,189,248,0.28)] ring-1 ring-sky-300/10",
        compact && "rounded-none border-0 bg-transparent shadow-none ring-0",
        className,
      )}
    >
      <div className="pointer-events-none absolute left-3 top-28 z-[1000] flex flex-wrap gap-2 md:top-32">
        {compact ? null : [
          { key: "points" as const, label: "Points" },
          { key: "shapes" as const, label: "Tracés" },
          { key: "infrastructure" as const, label: "Infras" },
        ].map((layer) => {
          const active = visibleLayers[layer.key];
          return (
            <button
              key={layer.key}
              type="button"
              onClick={() => toggleLayer(layer.key)}
              className={[
                "pointer-events-auto rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)] backdrop-blur-xl transition",
                active
                  ? "border-sky-300/35 bg-sky-400/18 text-sky-50"
                  : "border-sky-300/12 bg-[rgba(16,40,64,0.9)] text-sky-100/56 hover:border-sky-300/24 hover:text-sky-50",
              ].join(" ")}
              aria-pressed={active}
            >
              {layer.label}
            </button>
          );
        })}
      </div>

      <MapContainer
        center={center}
        zoom={compact ? 11 : 12}
        scrollWheelZoom
        className={
          compact
            ? cn(
                "h-full min-h-[18rem] w-full bg-[rgba(10,31,50,0.98)] transition-colors duration-500",
                fullViewport ? "min-h-full" : null,
              )
            : fullViewport
            ? "h-[100dvh] min-h-[100dvh] w-full bg-[rgba(10,31,50,0.98)] transition-colors duration-500"
            : "h-[68vh] min-h-[34rem] w-full bg-[rgba(10,31,50,0.98)] transition-colors duration-500 md:h-[74vh] md:min-h-[42rem]"
        }
      >
        <MapControls center={center} variant={compact ? "default" : "immersive"} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Plan clair">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Plan contrasté">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <LayerGroup>
          <SignalementMarkers
            items={items}
            visible={visibleLayers.points}
            selectedActionId={selectedActionId}
          />
          <ShapeLayers
            items={items}
            visible={visibleLayers.shapes}
            selectedActionId={selectedActionId}
          />
          <InfrastructureMarkers
            items={items}
            visible={visibleLayers.infrastructure}
            selectedActionId={selectedActionId}
          />
        </LayerGroup>

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
            background: radial-gradient(circle, rgba(125, 211, 252, 0.36) 0%, transparent 70%);
            border-radius: 50%;
            animation: pulse-glow 2s infinite;
          }
          .cmm-infrastructure-marker__inner {
            position: relative;
            width: 34px;
            height: 34px;
            background: rgba(16, 40, 64, 0.88);
            border: 1px solid rgba(125, 211, 252, 0.16);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.28);
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
            background: var(--bg-canvas, #061423);
          }
        `}</style>
      </MapContainer>
    </div>
  );
}
