"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  LayersControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { MapPin, Sparkles } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import type { CompostPoint } from "@/lib/learning/compost-guide-data";

type CompostMapCanvasProps = {
  points: CompostPoint[];
};

function FitBounds({ points }: { points: CompostPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds.pad(0.12), { animate: true });
  }, [map, points]);

  return null;
}

function markerColor(region: CompostPoint["region"]): string {
  switch (region) {
    case "paris":
      return "#10b981"; // emerald-500
    case "petite_couronne":
      return "#f59e0b"; // amber-500
    default:
      return "#3b82f6"; // blue-500
  }
}

function createMarkerIcon(point: CompostPoint) {
  const color = markerColor(point.region);
  return L.divIcon({
    className: "cmm-compost-marker",
    html: `
      <div class="flex items-center justify-center rounded-2xl border-2 border-white/20 shadow-2xl backdrop-blur-md transition-transform hover:scale-110" style="width: 32px; height: 32px; background: ${color}cc; color: white;">
        <span style="font-size: 14px; font-weight: 900; line-height: 1;">C</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
}

export function CompostMapCanvas({ points }: CompostMapCanvasProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";

  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) {
      return [48.8566, 2.3522];
    }
    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    return [lat, lng];
  }, [points]);

  return (
    <RubriqueCard 
      themeColor="emerald" 
      withTopBar={false}
      className="p-0"
    >
      <div className="border-b border-white/5 bg-white/5 px-8 py-6">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                 <MapPin size={18} />
              </div>
              <div>
                 <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                    {isFrench ? "Points de Collecte" : "Collection Points"}
                 </h4>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {isFrench ? "Localisation des sites actifs" : "Location of active sites"}
                 </p>
              </div>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
              <Sparkles size={12} />
              {points.length} {isFrench ? "Sites" : "Sites"}
           </div>
        </div>
      </div>

      <div className="relative h-[480px]">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom={false}
          className="h-full w-full bg-slate-950"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name={isFrench ? "Plan contrasté" : "High contrast map"}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name={isFrench ? "Plan clair" : "Light map"}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {points.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={createMarkerIcon(point)}
            >
              <Popup className="cmm-map-popup">
                <div className="p-1 min-w-[180px] font-sans">
                  <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight mb-2">
                    {isFrench ? point.name.fr : point.name.en}
                  </h4>
                  <div className="flex items-center gap-2 mb-3">
                     <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
                        {point.region.replace('_', ' ')}
                     </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium mb-3">
                    {point.address}
                  </p>
                  <button className="w-full py-2 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                     {isFrench ? "Voir détails" : "View details"}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
          <FitBounds points={points} />
        </MapContainer>

        {/* Floating Controls Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Paris</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Banlieue</span>
           </div>
        </div>
      </div>
    </RubriqueCard>
  );
}
