"use client";

import { useEffect, useMemo, useRef } from "react";
import L, { type LeafletEvent } from "leaflet";
import "leaflet-draw";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { ActionDrawing } from "@/lib/actions/types";

import {
  resolveDynamicColor,
} from "./map-marker-categories";
import { snapPolylineToStreetNetwork } from "@/lib/geo/osrm-routing";
import { computePollutionScore } from "@/lib/actions/pollution-score";

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];
const PARIS_BOUNDS = L.latLngBounds([48.78, 2.2], [48.92, 2.48]);

type DrawingLayer = L.Polyline | L.Polygon;

const COLOR_BLUE = "#0284c7"; // Lieu Propre

function asCoordinates(latLngs: L.LatLng[]): [number, number][] {
  return latLngs.map((point) => [
    Number(point.lat.toFixed(6)),
    Number(point.lng.toFixed(6)),
  ]);
}

function extractDrawing(layer: DrawingLayer): ActionDrawing {
  if (layer instanceof L.Polygon) {
    const rings = layer.getLatLngs() as L.LatLng[][];
    return { kind: "polygon", coordinates: asCoordinates(rings[0] ?? []) };
  }
  const latLngs = layer.getLatLngs() as L.LatLng[];
  return { kind: "polyline", coordinates: asCoordinates(latLngs) };
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

  useEffect(() => {
    const layerGroup = new L.FeatureGroup();
    layerGroupRef.current = layerGroup;
    map.addLayer(layerGroup);

    const drawControl = readOnly
      ? null
      : new L.Control.Draw({
          position: "topright",
          draw: {
            marker: false,
            rectangle: false,
            circle: false,
            circlemarker: false,
            polyline: {
              metric: true,
              shapeOptions: { color: drawColor, weight: 4 },
            },
            polygon: {
              allowIntersection: false,
              showArea: true,
              shapeOptions: { color: drawColor, weight: 3, fillOpacity: 0.25 },
            },
          },
          edit: {
            featureGroup: layerGroup,
            remove: true,
          },
        });

    const undoButton = readOnly
      ? null
      : new (L.Control.extend({
          options: { position: "topright" },
          onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = L.DomUtil.create('a', 'cmm-undo-btn', container);
            button.innerHTML = "↩";
            button.title = "Annuler";
            button.style.cursor = "pointer";
            button.style.fontSize = "18px";
            button.style.backgroundColor = "white";

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

    async function normalizeAndEmit(layer: DrawingLayer) {
      if (layer instanceof L.Polygon) {
        // We don't snap polygons natively with the street routing, 
        // as they represent an area.
        onChange(extractDrawing(layer));
        return;
      }
      
      // Auto-Snap for Polylines using OSRM
      document.body.style.cursor = "wait";
      const rawCoords = asCoordinates(layer.getLatLngs() as L.LatLng[]);
      const snappedCoords = await snapPolylineToStreetNetwork(rawCoords);
      document.body.style.cursor = "";

      if (snappedCoords && snappedCoords.length > 0) {
        // Create a new polyline with snapped coordinates to trigger re-render
        const newLayer = L.polyline(snappedCoords.map(c => L.latLng(c[0], c[1])));
        onChange(extractDrawing(newLayer));
      } else {
        // Fallback to raw if snap failed
        onChange(extractDrawing(layer));
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
      map.removeLayer(layerGroup);
      layerGroupRef.current = null;
    };
  }, [map, onChange, drawColor, readOnly]);

  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup) {
      return;
    }
    layerGroup.clearLayers();
    if (!value || value.coordinates.length === 0) {
      return;
    }

    const latLngs = value.coordinates.map(([lat, lng]) => L.latLng(lat, lng));
    const layer =
      value.kind === "polygon"
        ? L.polygon(latLngs, { 
            color: drawColor, 
            weight: 3, 
            fillOpacity: 0.25 
          })
        : L.polyline(latLngs, { 
            color: drawColor, 
            weight: 4,
            className: "leaflet-ant-path"
          });
    layerGroup.addLayer(layer);
  }, [value, drawColor]);

  return null;
}

export function ActionDrawingMap({
  value,
  onChange,
  wasteKg = 0,
  butts = 0,
  isCleanPlace = false,
  readOnly = false,
}: {
  value: ActionDrawing | null;
  onChange: (drawing: ActionDrawing | null) => void;
  wasteKg?: number;
  butts?: number;
  isCleanPlace?: boolean;
  readOnly?: boolean;
}) {
  const mapStyle = useMemo(() => ({ height: "360px", width: "100%" }), []);

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

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={PARIS_CENTER}
        zoom={12}
        minZoom={10}
        maxZoom={18}
        maxBounds={PARIS_BOUNDS}
        maxBoundsViscosity={0.9}
        scrollWheelZoom
        className="bg-white"
        style={mapStyle}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        <DrawingController
          value={value}
          onChange={onChange}
          drawColor={drawColor}
          readOnly={readOnly}
        />
      </MapContainer>
    </div>
  );
}
