"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import L, { type LeafletEvent } from "leaflet";
import"leaflet-draw";
import { MapContainer, TileLayer, useMap } from"react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import type { ActionDrawing } from"@/lib/actions/types";

import {
 resolveDynamicColor,
} from"./map-marker-categories";
import { snapPolylineToStreetNetwork } from"@/lib/geo/osrm-routing";
import { computePollutionScore } from"@/lib/actions/pollution-score";
import {
 normalizeActionDrawing,
} from"./map/actions-map-geometry.utils";
import {
  TERRITORY_CENTER,
  buildTerritoryLeafletBounds,
} from "@/lib/geo/territory";

const FRANCE_TERRITORY_LAT_LNG_BOUNDS = L.latLngBounds(buildTerritoryLeafletBounds());
const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

type DrawingLayer = L.Polyline | L.Polygon;

const COLOR_BLUE ="#0284c7"; // Lieu Propre

function subscribeToMediaQuery(
 query: string,
 onStoreChange: () => void,
): () => void {
 if (typeof window ==="undefined") {
 return () => undefined;
 }

 const mediaQuery = window.matchMedia(query);
 mediaQuery.addEventListener("change", onStoreChange);

 return () => {
 mediaQuery.removeEventListener("change", onStoreChange);
 };
}

function useMediaQuery(query: string): boolean {
 return useSyncExternalStore(
  (onStoreChange) => subscribeToMediaQuery(query, onStoreChange),
  () => {
   if (typeof window ==="undefined") {
    return false;
   }
   return window.matchMedia(query).matches;
  },
  () => false,
 );
}

function asCoordinates(latLngs: L.LatLng[]): [number, number][] {
 return latLngs.map((point) => [
 Number(point.lat.toFixed(6)),
 Number(point.lng.toFixed(6)),
 ]);
}

 function extractDrawing(layer: DrawingLayer): ActionDrawing {
 if (layer instanceof L.Polygon) {
 const rings = layer.getLatLngs() as L.LatLng[][];
 return {
 kind:"polygon",
 coordinates: asCoordinates(rings[0] ?? []),
 };
 }
 const latLngs = layer.getLatLngs() as L.LatLng[];
 return { kind:"polyline", coordinates: asCoordinates(latLngs) };
}

function DrawingController({
 value,
 onChange,
 drawColor = COLOR_BLUE,
 readOnly = false,
}: {
 value: ActionDrawing | null;
 onChange: (drawing: ActionDrawing | null) => void;
 drawColor?: string;
 readOnly?: boolean;
}) {
 const map = useMap();
 const layerGroupRef = useRef<L.FeatureGroup | null>(null);
 const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

 useEffect(() => {
 const layerGroup = new L.FeatureGroup();
 layerGroupRef.current = layerGroup;
 map.addLayer(layerGroup);

 // Désactiver le tracé manuel sur mobile ou si readOnly
 const drawingDisabled = readOnly || isMobile;

 const drawControl = drawingDisabled
 ? null
 : new L.Control.Draw({
 position:"topright",
 draw: {
 marker: false,
 rectangle: false,
 circle: false,
 circlemarker: false,
 polyline: {
 metric: true,
 shapeOptions: { 
 color: drawColor, 
 weight: 4,
 opacity: 0.8
 },
 allowIntersection: false,
 showLength: true,
 repeatMode: false
 },
 polygon: {
 allowIntersection: false,
 showArea: true,
 shapeOptions: { 
 color: drawColor, 
 weight: 3, 
 fillOpacity: 0.25,
 opacity: 0.8
 },
 repeatMode: false
 },
 },
 edit: {
 featureGroup: layerGroup,
 remove: true,
 edit: {
 selectedPathOptions: { opacity: 0.6 }
 }
 },
 });

 const undoButton = drawingDisabled
 ? null
 : new (L.Control.extend({
 options: { position:"topright" },
 onAdd: function() {
 const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
 const button = L.DomUtil.create('a', 'cmm-undo-btn', container);
 button.textContent ="↩"; // CodeQL-safe: static text, not HTML
 button.href ="#";
 button.setAttribute("role", "button");
 button.setAttribute("aria-label", "Effacer le tracé dessiné");
 button.title ="Effacer le tracé";
 button.style.cursor ="pointer";
 button.style.fontSize ="16px";
 button.style.backgroundColor ="white";
 button.style.padding ="4px 8px";
 button.style.borderRadius ="4px";
 button.style.boxShadow ="0 1px 3px rgba(0,0,0,0.3)";

 L.DomEvent.on(button, 'click', (e) => {
 L.DomEvent.stop(e);
 layerGroup.clearLayers();
 onChange(null);
 });
 return container;
 }
 }))();

 if (drawControl) {
 map.addControl(drawControl);
 }
 if (undoButton) {
 map.addControl(undoButton);
 }

 applyMapControlAccessibilityLabels(map.getContainer());
 const labelTimer = window.setTimeout(() => {
 applyMapControlAccessibilityLabels(map.getContainer());
 }, 0);

 async function normalizeAndEmit(layer: DrawingLayer) {
 const rawDrawing = extractDrawing(layer);
 const normalizedDrawing = normalizeActionDrawing(rawDrawing);

 if (!normalizedDrawing) {
 onChange(null);
 return;
 }

 if (normalizedDrawing.kind ==="polygon") {
 // Les polygones représentent une zone, pas de snap automatique
 onChange(normalizedDrawing);
 return;
 }
 
 // Auto-Snap pour les polylines avec OSRM
 document.body.style.cursor ="wait";
 try {
 const snappedCoords = await snapPolylineToStreetNetwork(
 normalizedDrawing.coordinates,
 );
 
 if (snappedCoords && snappedCoords.length > 0) {
  // Créer une nouvelle polyline avec les coordonnées snappées
  const snappedDrawing = normalizeActionDrawing({
  kind: "polyline",
  coordinates: snappedCoords,
  });
  onChange(snappedDrawing ?? normalizedDrawing);
 } else {
  // Fallback vers les coordonnées brutes si le snap échoue
 onChange(normalizedDrawing);
 }
 } catch {
  // En cas d'erreur, utiliser les coordonnées brutes
 onChange(normalizedDrawing);
 } finally {
  document.body.style.cursor ="";
 }
 }

 function handleCreated(event: LeafletEvent & { layer: DrawingLayer }) {
 layerGroup.clearLayers();
 layerGroup.addLayer(event.layer);
 // Fire async normalization
 void normalizeAndEmit(event.layer);
 }

 function handleEdited() {
 const firstLayer = layerGroup.getLayers()[0] as DrawingLayer | undefined;
 if (firstLayer) {
 void normalizeAndEmit(firstLayer);
 } else {
 onChange(null);
 }
 }

 function handleDeleted() {
 onChange(null);
 }

 map.on(L.Draw.Event.CREATED, handleCreated);
 map.on(L.Draw.Event.EDITED, handleEdited);
 map.on(L.Draw.Event.DELETED, handleDeleted);

 return () => {
 map.off(L.Draw.Event.CREATED, handleCreated);
 map.off(L.Draw.Event.EDITED, handleEdited);
 map.off(L.Draw.Event.DELETED, handleDeleted);
 if (drawControl) {
 map.removeControl(drawControl);
 }
 if (undoButton) {
 map.removeControl(undoButton);
 }
 window.clearTimeout(labelTimer);
 map.removeLayer(layerGroup);
 layerGroupRef.current = null;
 };
 }, [map, onChange, drawColor, readOnly, isMobile]);

 useEffect(() => {
 const layerGroup = layerGroupRef.current;
 if (!layerGroup) {
 return;
 }
 layerGroup.clearLayers();
 const normalizedValue = normalizeActionDrawing(value);
 if (!normalizedValue) {
 return;
 }

 const latLngs = normalizedValue.coordinates.map(([lat, lng]) => L.latLng(lat, lng));
 const layer =
 normalizedValue.kind ==="polygon"
 ? L.polygon(latLngs, { 
 color: drawColor, 
 weight: 3, 
 fillOpacity: 0.25 
 })
 : L.polyline(latLngs, { 
 color: drawColor, 
 weight: 4,
 className:"leaflet-ant-path"
 });
 layerGroup.addLayer(layer);
 }, [value, drawColor]);

 return null;
}

function MapControlAccessibilityLabels() {
 const map = useMap();

 useEffect(() => {
  applyMapControlAccessibilityLabels(map.getContainer());
 }, [map]);

 return null;
}

function applyMapControlAccessibilityLabels(container: HTMLElement): void {
 const labels: Array<[string, string]> = [
  [".leaflet-control-zoom-in", "Zoomer sur la carte"],
  [".leaflet-control-zoom-out", "Dézoomer sur la carte"],
  [".leaflet-draw-draw-polyline", "Dessiner un tracé"],
  [".leaflet-draw-draw-polygon", "Dessiner une zone"],
  [".leaflet-draw-edit-edit", "Modifier le tracé dessiné"],
  [".leaflet-draw-edit-remove", "Effacer un tracé dessiné"],
  [".leaflet-draw-actions a", "Action de dessin sur la carte"],
 ];

 for (const [selector, label] of labels) {
  container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
   if (!element.getAttribute("aria-label")) {
    element.setAttribute("aria-label", label);
   }
   if (element.tagName === "A" && !element.getAttribute("role")) {
    element.setAttribute("role", "button");
   }
  });
 }
}

type ActionDrawingMapProps = {
 value?: ActionDrawing | null;
 onChange?: (drawing: ActionDrawing | null) => void;
 drawing?: ActionDrawing | null;
 onDrawingChange?: (drawing: ActionDrawing | null) => void;
 wasteKg?: number;
 butts?: number;
 isCleanPlace?: boolean;
 readOnly?: boolean;
};

export function ActionDrawingMap({
 value,
 onChange,
 drawing,
 onDrawingChange,
 wasteKg = 0,
 butts = 0,
 isCleanPlace = false,
 readOnly = false,
}: ActionDrawingMapProps) {
 const mapStyle = useMemo(() => ({ height:"400px", width:"100%" }), []);
 const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
 const currentValue = normalizeActionDrawing(value ?? drawing ?? null);
 const handleChange = onChange ?? onDrawingChange ?? (() => undefined);

 const drawColor = useMemo(() => {
 if (isCleanPlace) {
 return COLOR_BLUE;
 }

 const score = computePollutionScore({
 wasteKg,
 cigaretteButts: butts,
 });

 return resolveDynamicColor(score);
 }, [wasteKg, butts, isCleanPlace]);

 const effectiveReadOnly = readOnly || isMobile;

 return (
 <div className="relative overflow-hidden rounded-xl border border-slate-200">
 {isMobile && !readOnly && (
 <div className="absolute top-2 left-2 z-[1000] rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 cmm-text-caption font-medium text-amber-800 shadow-sm">
 📱 Tracé désactivé sur mobile
 </div>
 )}
 <MapContainer
 center={TERRITORY_CENTER}
 zoom={5}
 minZoom={4}
 maxZoom={18}
 maxBounds={FRANCE_TERRITORY_LAT_LNG_BOUNDS}
 maxBoundsViscosity={0.9}
 scrollWheelZoom
 className="bg-white"
 style={mapStyle}
 >
 <MapControlAccessibilityLabels />
 {/* Couche de base avec noms de rues */}
 <TileLayer
 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
 url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
 maxZoom={18}
 />
 <DrawingController
 value={currentValue}
 onChange={handleChange}
 drawColor={drawColor}
 readOnly={effectiveReadOnly}
 />
 </MapContainer>
 </div>
 );
}
