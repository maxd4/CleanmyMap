"use client";

import { useEffect } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import type { MapViewportState } from "@/lib/geo/map-viewport";

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

function MapViewportReporter({
  onViewportChange,
  onViewportInteraction,
}: {
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
}) {
  const map = useMapEvents({
    dragstart: () => {
      onViewportInteraction?.();
    },
    zoomstart: () => {
      onViewportInteraction?.();
    },
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

function MapViewportSync({
  viewportRequest,
  viewportRequestKey,
}: {
  viewportRequest: MapViewportState | null;
  viewportRequestKey: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!viewportRequest) {
      return;
    }
    map.setView(viewportRequest.center, viewportRequest.zoom, { animate: false });
  }, [map, viewportRequest, viewportRequestKey]);
  return null;
}

export type ActionsMapCanvasViewportProps = {
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
  viewportRequest: MapViewportState | null;
  viewportRequestKey: number;
};

export function ActionsMapCanvasViewport({
  onViewportChange,
  onViewportInteraction,
  viewportRequest,
  viewportRequestKey,
}: ActionsMapCanvasViewportProps) {
  return (
    <>
      <MapViewportSync
        viewportRequest={viewportRequest}
        viewportRequestKey={viewportRequestKey}
      />
      <MapViewportReporter
        onViewportChange={onViewportChange}
        onViewportInteraction={onViewportInteraction}
      />
    </>
  );
}
