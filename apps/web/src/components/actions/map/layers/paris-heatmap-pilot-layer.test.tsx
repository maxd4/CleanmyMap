// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParisHeatmapPilotLayer } from "./paris-heatmap-pilot-layer";
import type { ParisHeatmapPilotLayer as PilotLayer } from "@/lib/geo/paris-heatmap-pilot";

vi.mock("react-leaflet", () => ({
  CircleMarker: ({ children, center }: { children?: React.ReactNode; center: [number, number] }) => <div data-testid="micro-point" data-center={center.join(",")}>{children}</div>,
  Polyline: ({ children, positions }: { children?: React.ReactNode; positions: [[number, number], [number, number]] }) => <div data-testid="heatmap-segment" data-positions={JSON.stringify(positions)}>{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ getZoom: () => 17 }),
  useMapEvents: () => null,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const layer: PilotLayer = {
  mode: "mixed",
  status: "predicted",
  source: {
    snapshotId: "pilot",
    retrievedAt: "2026-11-01T00:00:00.000Z",
    provider: "OpenStreetMap contributors",
    license: "ODbL-1.0",
    modelVersion: "pilot",
  },
  warnings: [],
  segments: [{
    id: "way:0:0",
    osmWayId: "way",
    name: "Rue test",
    geometry: [[48.85, 2.35], [48.851, 2.351]],
    midpoint: [48.8505, 2.3505],
    lengthKm: 0.1,
    irisReferenceId: "iris-1",
    scores: { mixed: 60, cigaretteButts: 70, waste: 50 },
    dominantFactors: ["Bar ou café OSM"],
    dominantMicroPlace: null,
    provenance: "osm-snapshot+iris-reference+polarized-policy",
    status: "predicted",
  }],
  microPlaces: [{
    id: "node:1",
    coordinate: [48.8505, 2.3505],
    name: "Café test",
    kind: "cafe",
    family: "hospitality_and_smoking",
    label: "Café OSM",
    cigaretteButtCoefficient: 2.8,
    wasteCoefficient: 1.45,
    provenance: "osm-snapshot",
  }],
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("ParisHeatmapPilotLayer", () => {
  it("renders clickable street segments and distinct micro-points without IRIS polygons", () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<ParisHeatmapPilotLayer visible mode="mixed" layer={layer} />));

    expect(host.querySelectorAll('[data-testid="heatmap-segment"]').length).toBe(1);
    expect(host.querySelectorAll('[data-testid="micro-point"]').length).toBe(1);
    expect(host.querySelector('[data-testid="popup"]')?.textContent).toContain("Mégots");
    expect(host.querySelector('[data-testid="popup"]')?.textContent).toContain("Déchets");
    expect(host.querySelector("polygon")).toBeNull();
  });

  it("does not replace unavailable street data with a mass of micro-points", () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<ParisHeatmapPilotLayer visible layer={{ ...layer, status: "unavailable", microPlaces: [] }} />));

    expect(host.textContent).toBe("");
  });
});
