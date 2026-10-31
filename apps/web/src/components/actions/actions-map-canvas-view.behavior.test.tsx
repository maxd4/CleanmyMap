// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionsMapCanvasView } from "./actions-map-canvas-view";

const reloadMock = vi.hoisted(() => vi.fn());
const toggleLayerMock = vi.hoisted(() => vi.fn());
const setBasemapModeMock = vi.hoisted(() => vi.fn());

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, ...props }: { children: React.ReactNode; center: unknown }) => <div data-testid="map-container" data-center={JSON.stringify(props.center)}>{children}</div>,
  LayerGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="layer-group">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
}));
vi.mock("./map/controls/map-controls", () => ({
  MapControls: () => <div data-testid="map-controls" />,
}));
vi.mock("./map/controls/map-score-scope-control", () => ({
  MapScoreScopeControl: () => <div data-testid="score-scope-control" />,
}));
vi.mock("./map/selection/action-selection-panel", () => ({
  ActionSelectionPanel: () => <div data-testid="selection-panel" />,
}));
vi.mock("./map/layers/map-geometry-legend", () => ({
  MapGeometryLegend: () => <div data-testid="geometry-legend" />,
}));
vi.mock("./map/filters/actions-map-filter-controls", () => ({
  ActionsMapFilterControls: () => <div data-testid="filter-controls" />,
}));
vi.mock("./map/layers/map-layers", () => ({
  SignalementMarkers: () => <div data-testid="signalement-markers" />,
  ShapeLayers: () => <div data-testid="shape-layers" />,
  InfrastructureMarkers: () => <div data-testid="infrastructure-markers" />,
  TrashSpotterMarkers: () => <div data-testid="trash-spotter-markers" />,
  PlasticOriginsLayer: () => <div data-testid="plastic-origins-layer" />,
}));
vi.mock("./actions-map-canvas-styles", () => ({ ActionsMapCanvasStyles: () => null }));
vi.mock("./actions-map-canvas-viewport", () => ({ ActionsMapCanvasViewport: () => null }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const baseProps = {
  isHomepagePreview: false,
  isMinimalPreview: false,
  mapCenter: [48.85, 2.35] as [number, number],
  mapZoom: 12,
  fullViewport: false,
  mapShellClasses: "shell",
  mapCanvasClass: "canvas",
  activePanel: "display" as const,
  setActivePanel: vi.fn(),
  controls: {
    categoryCounts: {},
    scoreScope: "global" as const,
    onScoreScopeChange: vi.fn(),
    displayMode: "observed" as const,
    onDisplayModeChange: vi.fn(),
    visibleLayers: {
      points: true,
      shapes: true,
      infrastructure: true,
      trashSpotter: true,
      plasticOrigins: true,
    },
    toggleLayer: toggleLayerMock,
    layerButtonClasses: { active: "active", inactive: "inactive" },
    basemapMode: "light" as const,
    setBasemapMode: setBasemapModeMock,
    plasticOriginsData: { data: null, error: new Error("offline"), isLoading: false, reload: reloadMock },
  },
  logicalRecenterViewport: {
    center: [48.85, 2.35] as [number, number],
    zoom: 12,
    bounds: { south: 48.8, west: 2.2, north: 48.9, east: 2.4 },
  },
  tone: "sky" as const,
  viewportRequest: null,
  viewportRequestKey: 0,
  basemapMode: "light" as const,
  mainItems: [],
  trashSpotterItems: [],
  visibleLayers: {
    points: true,
    shapes: true,
    infrastructure: true,
    trashSpotter: true,
    plasticOrigins: true,
  },
  selectedActionId: null,
  currentPlaceStateViews: [],
  selectedItem: null,
  frameSelectedActionId: null,
  displayMode: "observed" as const,
  scoreScope: "global" as const,
  isEmerald: false,
  plasticOriginsData: { data: null, error: new Error("offline"), isLoading: false, reload: reloadMock },
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(props: Record<string, unknown> = {}) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<ActionsMapCanvasView {...baseProps} {...props} />));
  return host;
}

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.clearAllMocks();
});

describe("ActionsMapCanvasView behavior", () => {
  it("keeps historical observations opt-in and exposes retry/empty states in the display panel", () => {
    const mounted = mount();
    expect(mounted.textContent).toContain("Le calque Plastic Origins est temporairement indisponible");
    const retry = [...mounted.querySelectorAll("button")].find((button) => button.textContent?.includes("Réessayer"));
    expect(retry).toBeTruthy();
    act(() => retry?.click());
    expect(reloadMock).toHaveBeenCalledTimes(1);
    const plasticLayerButton = [...mounted.querySelectorAll("button")].find((button) => button.textContent?.includes("Plastic Origins"));
    act(() => plasticLayerButton?.click());
    expect(toggleLayerMock).toHaveBeenCalledWith("plasticOrigins");
  });

  it("removes interactive overlays and optional layers from minimal previews", () => {
    const mounted = mount({ isMinimalPreview: true, activePanel: "display" });
    expect(mounted.querySelector('[role="toolbar"]')).toBeNull();
    expect(mounted.querySelector('[data-testid="plastic-origins-layer"]')).toBeNull();
    expect(mounted.querySelector('[data-testid="map-container"]')).not.toBeNull();
  });
});
