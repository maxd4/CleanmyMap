"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import { cn } from "@/lib/utils";
import { MapControls } from "./map/map-controls";
import {
  SignalementMarkers,
  ShapeLayers,
  InfrastructureMarkers,
  TrashSpotterMarkers,
  isTrashSpotterItem,
} from "./map/map-layers";
import { getActionsMapCenter } from "./actions-map-canvas.utils";
import type { MapViewportState } from "./map/map-export.types";
import {
  DEFAULT_VISIBLE_MAP_LAYERS,
  toggleVisibleMapLayer,
  type VisibleMapLayerKey,
} from "./actions-map-canvas.layers";

type ActionsMapCanvasProps = {
  items: ActionMapItem[];
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
  fullViewport?: boolean;
  compact?: boolean;
  className?: string;
  tone?: "sky" | "emerald";
  onViewportChange?: (viewport: MapViewportState) => void;
  initialViewport?: MapViewportState | null;
};

function MapViewportReporter({
  onViewportChange,
}: {
  onViewportChange?: (viewport: MapViewportState) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      onViewportChange?.(resolveViewportState(map));
    },
    zoomend: () => {
      onViewportChange?.(resolveViewportState(map));
    },
  });

  useEffect(() => {
    onViewportChange?.(resolveViewportState(map));
  }, [map, onViewportChange]);

  return null;
}

function resolveViewportState(map: LeafletMap): MapViewportState {
  const center = map.getCenter();
  const bounds = map.getBounds();
  return {
    center: [Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6))],
    zoom: map.getZoom(),
    bounds: {
      south: Number(bounds.getSouth().toFixed(6)),
      west: Number(bounds.getWest().toFixed(6)),
      north: Number(bounds.getNorth().toFixed(6)),
      east: Number(bounds.getEast().toFixed(6)),
    },
  };
}

function MapViewportSync({
  viewport,
}: {
  viewport: MapViewportState | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!viewport) {
      return;
    }

    map.fitBounds(
      [
        [viewport.bounds.south, viewport.bounds.west],
        [viewport.bounds.north, viewport.bounds.east],
      ],
      {
        animate: false,
        padding: [24, 24],
        maxZoom: viewport.zoom,
      },
    );
  }, [map, viewport]);

  return null;
}

export function ActionsMapCanvas({
  items,
  selectedActionId = null,
  onSelectAction,
  fullViewport = false,
  compact = false,
  className,
  tone = "sky",
  onViewportChange,
  initialViewport = null,
}: ActionsMapCanvasProps) {
  const center = useMemo(() => getActionsMapCenter(items), [items]);
  const mapCenter = initialViewport?.center ?? center;
  const mapZoom = initialViewport?.zoom ?? (compact ? 11 : 12);
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_VISIBLE_MAP_LAYERS);
  const isEmerald = tone === "emerald";
  const mapShellClasses = isEmerald
    ? "border-emerald-200/30 bg-[rgba(245,251,244,0.98)] shadow-[0_32px_64px_-12px_rgba(34,197,94,0.18)] ring-1 ring-emerald-200/20"
    : "border-sky-300/16 bg-[rgba(10,31,50,0.98)] shadow-[0_32px_64px_-12px_rgba(56,189,248,0.28)] ring-1 ring-sky-300/10";
  const mapCanvasClass = isEmerald
    ? "bg-[rgba(244,249,241,0.98)]"
    : "bg-[rgba(10,31,50,0.98)]";
  const layerButtonClasses = {
    active: isEmerald
      ? "border-emerald-300/35 bg-emerald-400/18 text-emerald-950"
      : "border-sky-300/35 bg-sky-400/18 text-sky-50",
    inactive: isEmerald
      ? "border-emerald-300/16 bg-white/78 text-emerald-900/58 hover:border-emerald-300/28 hover:text-emerald-950"
      : "border-sky-300/12 bg-[rgba(16,40,64,0.9)] text-sky-100/56 hover:border-sky-300/24 hover:text-sky-50",
  };
  const mainItems = useMemo(
    () => items.filter((item) => !isTrashSpotterItem(item)),
    [items],
  );
  const trashSpotterItems = useMemo(
    () => items.filter((item) => isTrashSpotterItem(item)),
    [items],
  );

  function toggleLayer(key: VisibleMapLayerKey) {
    setVisibleLayers((current) => toggleVisibleMapLayer(current, key));
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem]",
        mapShellClasses,
        compact && "rounded-none border-0 bg-transparent shadow-none ring-0",
        className,
      )}
    >
      <div className="pointer-events-none absolute left-3 top-28 z-[1000] flex flex-wrap gap-2 md:top-32">
        {compact ? null : [
          { key: "points" as const, label: "Points" },
          { key: "shapes" as const, label: "Tracés" },
          { key: "infrastructure" as const, label: "Infras" },
          { key: "trashSpotter" as const, label: "Trash Spotter" },
        ].map((layer) => {
          const active = visibleLayers[layer.key];
          return (
            <button
              key={layer.key}
              type="button"
              onClick={() => toggleLayer(layer.key)}
              className={[
                "pointer-events-auto rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-xl transition",
                isEmerald
                  ? "shadow-[0_24px_56px_-32px_rgba(34,197,94,0.22)]"
                  : "shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)]",
                active ? layerButtonClasses.active : layerButtonClasses.inactive,
              ].join(" ")}
              aria-pressed={active}
            >
              {layer.label}
            </button>
          );
        })}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        wheelPxPerZoomLevel={120}
        className={
          compact
            ? cn(
                "h-full min-h-[18rem] w-full transition-colors duration-500",
                mapCanvasClass,
                fullViewport ? "min-h-full" : null,
              )
            : fullViewport
            ? `h-[100dvh] min-h-[100dvh] w-full transition-colors duration-500 ${mapCanvasClass}`
            : `h-[68vh] min-h-[34rem] w-full transition-colors duration-500 md:h-[74vh] md:min-h-[42rem] ${mapCanvasClass}`
        }
        >
        <MapViewportSync viewport={initialViewport} />
        <MapViewportReporter onViewportChange={onViewportChange} />
        <MapControls center={mapCenter} variant={compact ? "default" : "immersive"} tone={tone} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Plan clair">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Plan contrasté">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <LayerGroup>
          <SignalementMarkers
            items={mainItems}
            visible={visibleLayers.points}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
          />
          <ShapeLayers
            items={mainItems}
            visible={visibleLayers.shapes}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
          />
          <InfrastructureMarkers
            items={mainItems}
            visible={visibleLayers.infrastructure}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
          />
          <TrashSpotterMarkers
            items={trashSpotterItems}
            visible={visibleLayers.trashSpotter}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
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
          .cmm-trash-spotter-cluster {
            background: transparent;
            border: none;
          }
          .cmm-trash-spotter-cluster__body {
            width: 100%;
            height: 100%;
            border-radius: 999px;
            border: 1px solid rgba(34, 197, 94, 0.28);
            background: linear-gradient(180deg, rgba(236, 253, 245, 0.96), rgba(209, 250, 229, 0.86));
            color: #14532d;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            box-shadow: 0 20px 30px -16px rgba(34, 197, 94, 0.28);
          }
          .cmm-trash-spotter-cluster__count {
            font-size: 0.95rem;
            font-weight: 900;
            line-height: 1;
          }
          .cmm-trash-spotter-cluster__label {
            font-size: 0.48rem;
            font-weight: 900;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            opacity: 0.72;
          }
          @keyframes pulse-glow {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
          .leaflet-container {
            background: var(--bg-canvas, ${isEmerald ? "#f5fbf3" : "#061423"});
          }
        `}</style>
      </MapContainer>
    </div>
  );
}
