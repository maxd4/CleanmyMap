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
import { Leaf, MapPin } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
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
    map.fitBounds(bounds.pad(0.12), { animate: false });
  }, [map, points]);

  return null;
}

function markerColor(region: CompostPoint["region"]): string {
  switch (region) {
    case "paris":
      return "#059669";
    case "petite_couronne":
      return "#d97706";
    default:
      return "#0284c7";
  }
}

function createMarkerIcon(point: CompostPoint) {
  const color = markerColor(point.region);
  return L.divIcon({
    className: "cmm-compost-marker",
    html: `
      <div class="flex items-center justify-center rounded-full border-2 border-white shadow-lg shadow-black/20" style="width: 28px; height: 28px; background: ${color}; color: white;">
        <span style="font-size: 12px; font-weight: 900; line-height: 1;">C</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
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
    <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
          <MapPin size={14} />
          {isFrench ? "Petite carte locale" : "Small local map"}
        </div>
        <p className="mt-1 text-sm cmm-text-secondary">
          {isFrench
            ? "Les points ci-dessous sont des repères officiels ou associatifs autour de Paris."
            : "The points below are official or associative references around Paris."}
        </p>
      </div>

      <div className="relative h-[420px]">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom
          className="h-full w-full bg-emerald-50"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name={isFrench ? "Plan clair" : "Light map"}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name={isFrench ? "Voyage" : "Voyager"}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <FitBounds points={points} />

          {points.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={createMarkerIcon(point)}
            >
              <Popup className="custom-popup">
                <div className="w-72 space-y-2 p-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    {isFrench
                      ? point.region === "paris"
                        ? "Paris"
                        : point.region === "petite_couronne"
                          ? "Petite couronne"
                          : "Grande couronne"
                      : point.region === "paris"
                        ? "Paris"
                        : point.region === "petite_couronne"
                          ? "Inner ring"
                          : "Outer ring"}
                  </p>
                  <h4 className="text-sm font-black tracking-tight cmm-text-primary">
                    {point.name[locale]}
                  </h4>
                  <p className="text-sm cmm-text-secondary">{point.address}</p>
                  <p className="text-sm cmm-text-secondary">{point.note[locale]}</p>
                  <a
                    href={point.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Leaf size={14} />
                    {point.sourceLabel[locale]}
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
