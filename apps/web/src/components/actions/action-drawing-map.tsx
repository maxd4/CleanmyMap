"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import L, { type LeafletEvent } from "leaflet";
import"leaflet-draw";
import { CircleMarker, MapContainer, TileLayer, useMap } from"react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type { ActionDrawing, ActionGeometrySource } from"@/lib/actions/types";

import { normalizeActionDrawing } from "@/lib/actions/geometry/geometry-core";
import { resolveDrawnGeometry } from "./action-drawing-map.geometry";
import { ACTION_DRAWING_EDIT_COLOR } from "./action-drawing-map.presentation";
import { ActionDrawingUndoToast } from "./action-drawing-undo-toast";
import {
  createActionDrawingSnapshot,
  createActionDrawingUndoState,
  areActionDrawingSnapshotsEqual,
  type ActionDrawingUndoState,
} from "./action-drawing-undo";
import {
  TERRITORY_CENTER,
  buildTerritoryLeafletBounds,
} from "@/lib/geo/territory";

const FRANCE_TERRITORY_LAT_LNG_BOUNDS = L.latLngBounds(buildTerritoryLeafletBounds());
const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

type DrawingLayer = L.Polyline | L.Polygon;

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

type DrawingControllerSetupParams = {
 map: L.Map;
 layerGroup: L.FeatureGroup;
 currentDrawingRef: React.MutableRefObject<ReturnType<typeof createActionDrawingSnapshot>>;
 drawingDisabled: boolean;
 onChange: (drawing: ActionDrawing | null, geometrySource?: ActionGeometrySource | null) => void;
 onUndoAvailable: (state: ActionDrawingUndoState | null) => void;
};

function createDrawControl(layerGroup: L.FeatureGroup, drawingDisabled: boolean): L.Control | null {
 if (drawingDisabled) return null;
 return new L.Control.Draw({
  position:"topright",
  draw: {
   marker: false, rectangle: false, circle: false, circlemarker: false,
   polyline: { metric: true, shapeOptions: { color: ACTION_DRAWING_EDIT_COLOR, weight: 4, opacity: 0.8 }, allowIntersection: false, showLength: true, repeatMode: false },
   polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: ACTION_DRAWING_EDIT_COLOR, weight: 3, fillOpacity: 0.25, opacity: 0.8 }, repeatMode: false },
  },
  edit: { featureGroup: layerGroup, remove: true, edit: { selectedPathOptions: { opacity: 0.6 } } },
 });
}

function createUndoControl(
 layerGroup: L.FeatureGroup,
 currentDrawingRef: DrawingControllerSetupParams["currentDrawingRef"],
 onChange: DrawingControllerSetupParams["onChange"],
 onUndoAvailable: DrawingControllerSetupParams["onUndoAvailable"],
 drawingDisabled: boolean,
): L.Control | null {
 if (drawingDisabled) return null;
 return new (L.Control.extend({
  options: { position:"topright" },
  onAdd: function() {
   const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
   const button = L.DomUtil.create('a', 'cmm-undo-btn', container);
   button.textContent ="↩";
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
   L.DomEvent.on(button, 'click', (event) => {
    L.DomEvent.stop(event);
    const previousDrawing = currentDrawingRef.current;
    currentDrawingRef.current = null;
    layerGroup.clearLayers();
    onUndoAvailable(createActionDrawingUndoState(previousDrawing, null, "removed"));
    onChange(null);
   });
   return container;
  },
 }))();
}

function emitNormalizedDrawing(
 layer: DrawingLayer,
 operation: "modified" | "replaced",
 params: DrawingControllerSetupParams,
): void {
 const previousDrawing = params.currentDrawingRef.current;
 const normalizedDrawing = normalizeActionDrawing(extractDrawing(layer));
 if (!normalizedDrawing) {
  params.currentDrawingRef.current = null;
  params.onUndoAvailable(createActionDrawingUndoState(previousDrawing, null, "removed"));
  params.onChange(null);
  return;
 }
 const resolved = normalizedDrawing.kind === "polygon"
  ? createActionDrawingSnapshot(normalizedDrawing, "manual")
  : (() => { const drawing = resolveDrawnGeometry(normalizedDrawing, null); return createActionDrawingSnapshot(drawing.drawing, drawing.geometrySource); })();
 if (!resolved) {
  params.currentDrawingRef.current = null;
  params.onUndoAvailable(createActionDrawingUndoState(previousDrawing, null, "removed"));
  params.onChange(null);
  return;
 }
 params.currentDrawingRef.current = resolved;
 params.onUndoAvailable(createActionDrawingUndoState(previousDrawing, resolved, operation));
 params.onChange(resolved.drawing, resolved.source);
}

function clearDrawing(params: DrawingControllerSetupParams): void {
 const previousDrawing = params.currentDrawingRef.current;
 params.currentDrawingRef.current = null;
 params.onUndoAvailable(createActionDrawingUndoState(previousDrawing, null, "removed"));
 params.onChange(null);
}

function setupDrawingController(params: DrawingControllerSetupParams): () => void {
 const { map, layerGroup, drawingDisabled } = params;
 const drawControl = createDrawControl(layerGroup, drawingDisabled);
 const undoButton = createUndoControl(layerGroup, params.currentDrawingRef, params.onChange, params.onUndoAvailable, drawingDisabled);
 map.addLayer(layerGroup);
 if (drawControl) map.addControl(drawControl);
 if (undoButton) map.addControl(undoButton);
 applyMapControlAccessibilityLabels(map.getContainer());
 const labelTimer = window.setTimeout(() => applyMapControlAccessibilityLabels(map.getContainer()), 0);
 const handleCreated = (event: LeafletEvent & { layer: DrawingLayer }) => {
  layerGroup.clearLayers();
  layerGroup.addLayer(event.layer);
  void emitNormalizedDrawing(event.layer, "replaced", params);
 };
 const handleEdited = () => {
  const layer = layerGroup.getLayers()[0] as DrawingLayer | undefined;
  if (layer) void emitNormalizedDrawing(layer, "modified", params); else clearDrawing(params);
 };
 const handleDeleted = () => clearDrawing(params);
 map.on(L.Draw.Event.CREATED, handleCreated);
 map.on(L.Draw.Event.EDITED, handleEdited);
 map.on(L.Draw.Event.DELETED, handleDeleted);
 return () => {
  map.off(L.Draw.Event.CREATED, handleCreated);
  map.off(L.Draw.Event.EDITED, handleEdited);
  map.off(L.Draw.Event.DELETED, handleDeleted);
  if (drawControl) map.removeControl(drawControl);
  if (undoButton) map.removeControl(undoButton);
  window.clearTimeout(labelTimer);
  map.removeLayer(layerGroup);
 };
}

function DrawingController({
 value,
  drawingSource,
  previewDrawings = [],
 onChange,
 onUndoAvailable,
 readOnly = false,
}: {
 value: ActionDrawing | null;
  drawingSource?: ActionGeometrySource | null;
 previewDrawings?: ActionDrawing[];
 onChange: (
  drawing: ActionDrawing | null,
  geometrySource?: ActionGeometrySource | null,
 ) => void;
  onUndoAvailable: (state: ActionDrawingUndoState | null) => void;
 readOnly?: boolean;
}) {
 const map = useMap();
 const layerGroupRef = useRef<L.FeatureGroup | null>(null);
 const previewLayerGroupRef = useRef<L.LayerGroup | null>(null);
 const currentDrawingRef = useRef(
  createActionDrawingSnapshot(normalizeActionDrawing(value), drawingSource),
 );
 const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

 useEffect(() => {
  currentDrawingRef.current = createActionDrawingSnapshot(normalizeActionDrawing(value), drawingSource);
 }, [drawingSource, value]);

 useEffect(() => {
  const previewLayerGroup = previewLayerGroupRef.current ?? new L.LayerGroup();
  if (!previewLayerGroupRef.current) {
   previewLayerGroupRef.current = previewLayerGroup;
   map.addLayer(previewLayerGroup);
  }
  previewLayerGroup.clearLayers();
  for (const previewDrawing of previewDrawings) {
   if (previewDrawing.kind !== "polyline" || previewDrawing.coordinates.length < 2) continue;
   previewLayerGroup.addLayer(L.polyline(previewDrawing.coordinates.map(([lat, lng]) => L.latLng(lat, lng)), {
    color: "#7c3aed",
    weight: 3,
    opacity: 0.72,
    dashArray: "7 5",
   }));
  }
  return () => { previewLayerGroup.clearLayers(); };
 }, [map, previewDrawings]);

useEffect(() => {
  const layerGroup = new L.FeatureGroup();
  layerGroupRef.current = layerGroup;
  const cleanup = setupDrawingController({
   map,
   layerGroup,
   currentDrawingRef,
   drawingDisabled: readOnly || isMobile,
   onChange,
   onUndoAvailable,
  });
  return () => {
   cleanup();
   if (previewLayerGroupRef.current) {
    map.removeLayer(previewLayerGroupRef.current);
    previewLayerGroupRef.current = null;
   }
   layerGroupRef.current = null;
  };
 }, [drawingSource, map, onChange, onUndoAvailable, readOnly, isMobile]);

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
 color: ACTION_DRAWING_EDIT_COLOR,
 weight: 3, 
 fillOpacity: 0.25 
 })
 : L.polyline(latLngs, { 
 color: ACTION_DRAWING_EDIT_COLOR,
 weight: 4,
 className:"leaflet-ant-path"
 });
 layerGroup.addLayer(layer);
 }, [value]);

 return null;
}

function MapControlAccessibilityLabels() {
 const map = useMap();

 useEffect(() => {
  applyMapControlAccessibilityLabels(map.getContainer());
 }, [map]);

 return null;
}

function FitDrawingViewport({
 drawing,
 previewDrawings,
 locationCoordinates,
}: {
 drawing: ActionDrawing | null;
 previewDrawings: ActionDrawing[];
 locationCoordinates: [number, number] | null;
}) {
 const map = useMap();
 const geometryKey = JSON.stringify({ drawing, previewDrawings, locationCoordinates });

 useEffect(() => {
  const geometry = JSON.parse(geometryKey) as {
   drawing: ActionDrawing | null;
   previewDrawings: ActionDrawing[];
   locationCoordinates: [number, number] | null;
  };
  const coordinates = [
   ...(geometry.drawing?.coordinates ?? []),
   ...geometry.previewDrawings.flatMap((preview) => preview.coordinates),
   ...(geometry.locationCoordinates ? [geometry.locationCoordinates] : []),
  ];
  if (coordinates.length === 0) return;
  if (coordinates.length === 1) {
   map.setView(coordinates[0], Math.max(map.getZoom(), 15), { animate: false });
   return;
  }
  map.fitBounds(L.latLngBounds(coordinates), {
   padding: [28, 28],
   maxZoom: 16,
   animate: false,
  });
 }, [geometryKey, map]);

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
 onChange?: (
  drawing: ActionDrawing | null,
  geometrySource?: ActionGeometrySource | null,
 ) => void;
 drawing?: ActionDrawing | null;
 onDrawingChange?: (
  drawing: ActionDrawing | null,
  geometrySource?: ActionGeometrySource | null,
 ) => void;
 drawingSource?: ActionGeometrySource | null;
 previewDrawings?: ActionDrawing[];
 locationCoordinates?: [number, number] | null;
 readOnly?: boolean;
 onUndoAvailable?: (state: ActionDrawingUndoState | null) => void;
};

export function ActionDrawingMap({
 value,
 onChange,
 drawing,
 onDrawingChange,
  drawingSource,
  previewDrawings = [],
 locationCoordinates = null,
 readOnly = false,
  onUndoAvailable,
}: ActionDrawingMapProps) {
 const mapStyle = useMemo(() => ({ height:"400px", width:"100%" }), []);
 const [undoState, setUndoState] = useState<ActionDrawingUndoState | null>(null);
 const [internalUndoObservation, setInternalUndoObservation] = useState<{
  state: ActionDrawingUndoState;
  baseline: ReturnType<typeof createActionDrawingSnapshot>;
 } | null>(null);
 const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
 const currentValue = useMemo(
  () => normalizeActionDrawing(value ?? drawing ?? null),
  [drawing, value],
 );
 const handleChange = useMemo(
  () => onChange ?? onDrawingChange ?? (() => undefined),
  [onChange, onDrawingChange],
 );
 const currentSnapshot = useMemo(
  () => createActionDrawingSnapshot(currentValue, drawingSource),
  [currentValue, drawingSource],
 );
 const currentSnapshotRef = useRef(currentSnapshot);
 useEffect(() => {
  currentSnapshotRef.current = currentSnapshot;
 }, [currentSnapshot]);
 const handleUndoAvailable = useCallback((nextState: ActionDrawingUndoState | null) => {
  if (onUndoAvailable) {
   onUndoAvailable(nextState);
   return;
  }
  setInternalUndoObservation(nextState
   ? {
    state: nextState,
    baseline: currentSnapshotRef.current,
   }
   : null);
  setUndoState(nextState);
 }, [onUndoAvailable]);
 const clearInternalUndo = useCallback(() => {
  setInternalUndoObservation(null);
  setUndoState(null);
 }, []);
 const isUndoStateAdmissible = undoState && internalUndoObservation?.state === undoState
  ? areActionDrawingSnapshotsEqual(undoState.current, currentSnapshot) ||
   areActionDrawingSnapshotsEqual(internalUndoObservation.baseline, currentSnapshot)
  : false;
 const handleUndo = useCallback(() => {
  if (!undoState || !isUndoStateAdmissible) {
   return;
  }
  handleChange(undoState.previous.drawing, undoState.previous.source);
  clearInternalUndo();
 }, [clearInternalUndo, handleChange, isUndoStateAdmissible, undoState]);

 const visibleUndoState = isUndoStateAdmissible ? undoState : null;

 const effectiveReadOnly = readOnly || isMobile;

 return (
 <div className="relative overflow-hidden rounded-xl border border-slate-200">
 {isMobile && (
 <div className="pointer-events-none absolute left-2 top-2 z-[1000] max-w-[calc(100%-1rem)] rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 cmm-text-caption font-medium text-amber-800 shadow-sm">
 Le dessin manuel est disponible sur ordinateur. Vous pouvez consulter votre tracé ici.
 </div>
 )}
 <MapContainer
 center={TERRITORY_CENTER}
 zoom={5}
 minZoom={4}
 maxZoom={18}
 maxBounds={FRANCE_TERRITORY_LAT_LNG_BOUNDS}
 maxBoundsViscosity={0.9}
 scrollWheelZoom={!isMobile}
 className="bg-white"
 style={mapStyle}
 >
 <MapControlAccessibilityLabels />
 <FitDrawingViewport drawing={currentValue} previewDrawings={previewDrawings} locationCoordinates={locationCoordinates} />
 {locationCoordinates ? <CircleMarker center={locationCoordinates} radius={7} pathOptions={{ color: "#047857", fillColor: "#10b981", fillOpacity: 0.85, weight: 2 }} /> : null}
 {/* Couche de base avec noms de rues */}
 <TileLayer
 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
 url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
 maxZoom={18}
 />
 <DrawingController
 value={currentValue}
 onChange={handleChange}
   drawingSource={drawingSource}
   previewDrawings={previewDrawings}
   onUndoAvailable={handleUndoAvailable}
 readOnly={effectiveReadOnly}
 />
 </MapContainer>
 {!onUndoAvailable && visibleUndoState ? (
  <ActionDrawingUndoToast
   state={visibleUndoState}
   onUndo={handleUndo}
   onClose={clearInternalUndo}
  />
 ) : null}
 </div>
 );
}
