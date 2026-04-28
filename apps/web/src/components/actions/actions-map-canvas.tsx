"use client";

import { useMemo, useState } from "react";
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  Rectangle,
  TileLayer,
} from "react-leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import { MapControls } from "./map/map-controls";
import {
  SignalementMarkers,
  ShapeLayers,
  InfrastructureMarkers,
} from "./map/map-layers";
import { getActionsMapCenter } from "./actions-map-canvas.utils";
import { buildGreaterParisLeafletBounds } from "@/lib/geo/greater-paris";
import {
  DEFAULT_VISIBLE_MAP_LAYERS,
  toggleVisibleMapLayer,
  type VisibleMapLayerKey,
} from "./actions-map-canvas.layers";

type ActionsMapCanvasProps = {
  items: ActionMapItem[];
  selectedActionId?: string | null;
};

export function ActionsMapCanvas({
  items,
  selectedActionId = null,
}: ActionsMapCanvasProps) {
  const center = useMemo(() => getActionsMapCenter(items), [items]);
  const greaterParisBounds = useMemo(() => buildGreaterParisLeafletBounds(), []);
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_VISIBLE_MAP_LAYERS);

  function toggleLayer(key: VisibleMapLayerKey) {
    setVisibleLayers((current) => toggleVisibleMapLayer(current, key));
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 dark:border-white/5 bg-slate-950 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.45)] relative ring-1 ring-black/5">
      <div className="pointer-events-none absolute left-3 top-28 z-[1000] flex flex-wrap gap-2 md:top-32">
        {[
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
                "pointer-events-auto rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-xl backdrop-blur-xl transition",
                active
                  ? "border-emerald-300/40 bg-emerald-500/90 text-white"
                  : "border-white/10 bg-slate-950/70 text-slate-300 hover:bg-slate-900/90",
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

          <LayersControl.Overlay checked name="Périmètre Grand Paris">
            <Rectangle
              bounds={greaterParisBounds}
              pathOptions={{
                color: "#0f766e",
                weight: 2,
                opacity: 0.9,
                dashArray: "6 8",
                fillColor: "#14b8a6",
                fillOpacity: 0.05,
              }}
              interactive={false}
            />
          </LayersControl.Overlay>
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
