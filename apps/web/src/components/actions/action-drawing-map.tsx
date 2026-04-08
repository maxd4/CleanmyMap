"use client";

import { useEffect, useMemo, useRef } from "react";
import L, { type LeafletEvent } from "leaflet";
import "leaflet-draw";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { ActionDrawing } from "@/lib/actions/types";

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];
const PARIS_BOUNDS = L.latLngBounds([48.78, 2.2], [48.92, 2.48]);

type DrawingLayer = L.Polyline | L.Polygon;

function asCoordinates(latLngs: L.LatLng[]): [number, number][] {
  return latLngs.map((point) => [Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6))]);
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
}: {
  value: ActionDrawing | null;
  onChange: (drawing: ActionDrawing | null) => void;
}) {
  const map = useMap();
  const layerGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const layerGroup = new L.FeatureGroup();
    layerGroupRef.current = layerGroup;
    map.addLayer(layerGroup);

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        marker: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        polyline: {
          metric: true,
          shapeOptions: { color: "#0f766e", weight: 4 },
        },
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: "#2563eb", weight: 3, fillOpacity: 0.18 },
        },
      },
      edit: {
        featureGroup: layerGroup,
        remove: true,
      },
    });

    map.addControl(drawControl);

    function handleCreated(event: LeafletEvent & { layer: DrawingLayer }) {
      layerGroup.clearLayers();
      layerGroup.addLayer(event.layer);
      onChange(extractDrawing(event.layer));
    }

    function handleEdited() {
      const firstLayer = layerGroup.getLayers()[0] as DrawingLayer | undefined;
      onChange(firstLayer ? extractDrawing(firstLayer) : null);
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
      map.removeControl(drawControl);
      map.removeLayer(layerGroup);
      layerGroupRef.current = null;
    };
  }, [map, onChange]);

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
        ? L.polygon(latLngs, { color: "#2563eb", weight: 3, fillOpacity: 0.18 })
        : L.polyline(latLngs, { color: "#0f766e", weight: 4 });
    layerGroup.addLayer(layer);
  }, [value]);

  return null;
}

export function ActionDrawingMap({
  value,
  onChange,
}: {
  value: ActionDrawing | null;
  onChange: (drawing: ActionDrawing | null) => void;
}) {
  const mapStyle = useMemo(() => ({ height: "360px", width: "100%" }), []);

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
        <DrawingController value={value} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
