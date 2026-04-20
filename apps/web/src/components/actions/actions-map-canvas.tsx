"use client";

import { useMemo, useState } from "react";
import {
  CircleMarker,
  LayerGroup,
  LayersControl,
  MapContainer,
  Polygon,
  Polyline,
  Tooltip,
  TileLayer,
  Popup,
  useMap
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { LatLngExpression, LatLngTuple } from "leaflet";
import type { ActionMapItem, ActionDrawing } from "@/lib/actions/types";
import {
  resolveDynamicColor,
  SCORE_THRESHOLDS,
} from "@/components/actions/map-marker-categories";
import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemWasteKg,
} from "../../lib/actions/data-contract";
import { computePollutionScore } from "@/lib/actions/pollution-score";

function MapControls({ center }: { center: LatLngTuple }) {
  const map = useMap();
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    
    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        map.flyTo([parseFloat(lat), parseFloat(lon)], 15);
      }
    } catch (err) {
      console.error("Geocoding error", err);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="absolute top-20 left-3 z-[1000] flex flex-col gap-2">
      <form onSubmit={handleSearch} className="flex overflow-hidden rounded-lg border border-slate-300 bg-white/90 shadow-lg backdrop-blur-sm">
        <input 
          type="text" 
          placeholder="Rechercher une adresse..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 px-3 py-1.5 text-xs outline-none bg-transparent"
        />
        <button 
          type="submit" 
          disabled={isSearching}
          className="bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {isSearching ? "..." : "🔍"}
        </button>
      </form>
      
      <button 
        onClick={() => map.flyTo(center, 12)}
        className="flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-lg backdrop-blur-sm transition hover:bg-slate-50"
      >
        <span>📍</span> Reset Vue
      </button>

      <a 
        href="/methodologie"
        className="flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-[10px] font-bold text-emerald-700 shadow-lg backdrop-blur-sm transition hover:bg-emerald-100"
      >
        <span>🔬</span> Méthodologie
      </a>
    </div>
  );
}

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

function getPollutionScore(item: ActionMapItem): number {
  return computePollutionScore({
    wasteKg: mapItemWasteKg(item),
    cigaretteButts: mapItemCigaretteButts(item),
  });
}

function resolvePointColor(item: ActionMapItem): string {
  const score = getPollutionScore(item);
  if (mapItemWasteKg(item) <= 0 && mapItemCigaretteButts(item) <= 0) {
    return "#0284c7"; // Bleu propre
  }
  return resolveDynamicColor(score);
}

function drawingCoordinates(
  drawing: ActionDrawing | null | undefined,
): LatLngExpression[] {
  if (!drawing) {
    return [];
  }
  return drawing.coordinates.map(
    (point) => [point[0], point[1]] as LatLngExpression,
  );
}

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
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-[460px] w-full bg-white transition-colors duration-500"
      >
        <MapControls center={center} />
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
                <MarkerClusterGroup
                  chunkedLoading
                  maxClusterRadius={50}
                  spiderfyOnMaxZoom={true}
                >
                  {items.map((item) => {
                    const coords = mapItemCoordinates(item);
                    if (coords.latitude === null || coords.longitude === null) return null;
                    
                    const score = getPollutionScore(item);
                    const color = resolvePointColor(item);

                    return (
                      <CircleMarker
                        key={`point-${item.id}`}
                        center={[coords.latitude, coords.longitude]}
                        radius={6}
                        pathOptions={{
                          color: color,
                          fillColor: color,
                          fillOpacity: 0.85,
                          weight: 2,
                        }}
                      >
                        <Popup className="glass-popup custom-popup">
                          <div className="text-center p-1 min-w-[140px]">
                            {score > 0 ? (
                              <>
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                                  {item.contract?.metadata.placeType || "Zone Polluée"}
                                </p>
                                <p className="text-2xl font-black leading-tight" style={{ color }}>
                                  {Math.min(100, Math.round(score))}%
                                </p>
                                <p className="text-[10px] font-medium opacity-80 mt-0.5 mb-3">
                                  Score de Pollution
                                </p>
                                <a 
                                  href={`/actions/new?lat=${coords.latitude}&lng=${coords.longitude}`}
                                  className="block w-full rounded-md bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 shadow-sm"
                                >
                                  Dépolluer ici
                                </a>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-bold text-sky-700 mb-1">Lieu Propre</p>
                                {item.contract?.metadata.placeType && (
                                  <p className="text-[9px] uppercase font-medium opacity-70 mb-2">
                                    {item.contract.metadata.placeType}
                                  </p>
                                )}
                                <p className="text-[9px] font-medium leading-none opacity-80 mb-2">
                                  Zone vérifiée
                                </p>
                                <a 
                                  href={`/actions/new?lat=${coords.latitude}&lng=${coords.longitude}&mode=propre`}
                                  className="block w-full rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                                >
                                  Mettre à jour
                                </a>
                              </>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MarkerClusterGroup>

              {items.map((item) => {
                const coordinates = drawingCoordinates(item.manual_drawing);
                if (!item.manual_drawing || coordinates.length === 0) return null;
                
                const color = resolvePointColor(item);
                const score = getPollutionScore(item);

                if (item.manual_drawing.kind === "polygon") {
                  return (
                    <Polygon
                      key={`shape-${item.id}`}
                      positions={coordinates}
                      pathOptions={{
                        color: color,
                        weight: 2,
                        fillOpacity: 0.25,
                        dashArray: score >= SCORE_THRESHOLDS.STRONG ? "5, 10" : undefined,
                      }}
                    >
                      <Tooltip className="glass-tooltip" direction="center" sticky>
                        <div className="text-center">
                          <p className="text-[9px] uppercase font-bold tracking-wider">Zone {Math.round(score)}%</p>
                        </div>
                      </Tooltip>
                    </Polygon>
                  );
                }

                return (
                  <Polyline
                    key={`shape-${item.id}`}
                    positions={coordinates}
                    pathOptions={{
                      color: color,
                      weight: 4,
                      opacity: 0.85,
                      className: score >= SCORE_THRESHOLDS.MEDIUM ? "leaflet-ant-path" : ""
                    }}
                  >
                     <Tooltip className="glass-tooltip" direction="top" sticky>
                        <div className="text-center">
                          <p className="text-[9px] uppercase font-bold tracking-wider">Trace {Math.round(score)}%</p>
                        </div>
                      </Tooltip>
                  </Polyline>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
