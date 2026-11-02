// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParisHeatmapPilotLayer } from "./paris-heatmap-pilot-layer";
import { colorForScore } from "./paris-heatmap-pilot-layer";
import * as heatmapPilot from "@/lib/geo/paris-heatmap-pilot";
import type { ParisHeatmapPilotLayer as PilotLayer } from "@/lib/geo/paris-heatmap-pilot";

vi.mock("react-leaflet", () => ({
  CircleMarker: ({ children, center }: { children?: React.ReactNode; center: [number, number] }) => <div data-testid="micro-point" data-center={center.join(",")}>{children}</div>,
  Polyline: ({ children, positions, pathOptions }: { children?: React.ReactNode; positions: [[number, number], [number, number]]; pathOptions?: { color?: string } }) => <div data-testid="heatmap-segment" data-color={pathOptions?.color} data-positions={JSON.stringify(positions)}>{children}</div>,
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
    network: {
      snapshotId: "pilot",
      retrievedAt: "2026-11-01T00:00:00.000Z",
      provider: "OpenStreetMap contributors",
      license: "ODbL-1.0",
    },
    scores: {
      snapshotId: "pressure",
      generatedAt: "2026-09-05T00:00:00.000Z",
      refreshedAt: "2026-09-05T00:00:00.000Z",
      modelVersion: "risk",
      provenance: [],
    },
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
    scores: { mixed: 30, cigaretteButts: 70, waste: 50 },
    dominantFactors: ["Bar ou café OSM"],
    dominantMicroPlace: null,
    appliedMicroPlaceInfluences: {
      cigaretteButts: {
        microPlace: {
          id: "node:1",
          coordinate: [48.8505, 2.3505],
          name: "Café test",
          kind: "cafe",
          family: "hospitality_and_smoking",
          label: "Café OSM",
          cigaretteButtCoefficient: 2.8,
          wasteCoefficient: 1.45,
          provenance: "osm-snapshot",
          status: "hypothesis",
        },
        attenuatedCoefficient: 2.4,
        status: "hypothesis",
      },
      waste: null,
    },
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
    status: "hypothesis",
  }],
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.restoreAllMocks();
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
    expect(host.textContent).toContain("mégots ×2.80");
    expect(host.textContent).toContain("déchets ×1.45");
    expect(host.textContent).toContain("source osm-snapshot");
    expect(host.textContent).toContain("statut hypothèse");
    expect(host.textContent).toContain("Score local : non calculé");
    expect(host.querySelector("polygon")).toBeNull();
  });

  it("uses the five documented classes and a distinct unavailable color", () => {
    expect(colorForScore(null)).toBe("#64748b");
    expect(colorForScore(0)).toBe("#15803d");
    expect(colorForScore(19.99)).toBe("#15803d");
    expect(colorForScore(20)).toBe("#65a30d");
    expect(colorForScore(39.99)).toBe("#65a30d");
    expect(colorForScore(40)).toBe("#ca8a04");
    expect(colorForScore(59.99)).toBe("#ca8a04");
    expect(colorForScore(60)).toBe("#ea580c");
    expect(colorForScore(79.99)).toBe("#ea580c");
    expect(colorForScore(80)).toBe("#b91c1c");
    expect(colorForScore(100)).toBe("#b91c1c");
  });

  it("does not build while disabled and reuses one projection across the three modes", () => {
    const buildSpy = vi.spyOn(heatmapPilot, "buildParisHeatmapPilot").mockReturnValue(layer);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    act(() => root?.render(<ParisHeatmapPilotLayer visible={false} mode="mixed" />));
    expect(buildSpy).not.toHaveBeenCalled();
    expect(host.textContent).toBe("");

    act(() => root?.render(<ParisHeatmapPilotLayer visible mode="mixed" />));
    expect(buildSpy).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="heatmap-segment"]')?.getAttribute("data-color")).toBe("#65a30d");

    act(() => root?.render(<ParisHeatmapPilotLayer visible mode="cigaretteButts" />));
    expect(buildSpy).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="heatmap-segment"]')?.getAttribute("data-color")).toBe("#ea580c");

    act(() => root?.render(<ParisHeatmapPilotLayer visible mode="waste" />));
    expect(buildSpy).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="heatmap-segment"]')?.getAttribute("data-color")).toBe("#ca8a04");
  });

  it("does not replace unavailable street data with a mass of micro-points", () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<ParisHeatmapPilotLayer visible layer={{ ...layer, status: "unavailable", microPlaces: [] }} />));

    expect(host.textContent).toBe("");
  });
});
