// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionDrawing } from "@/lib/actions/types";

type MockMap = {
  container: HTMLElement;
  layers: Set<unknown>;
  controls: Set<unknown>;
  handlers: Map<string, Set<(event: unknown) => void>>;
  addLayer: (layer: unknown) => MockMap;
  removeLayer: (layer: unknown) => MockMap;
  addControl: (control: unknown) => MockMap;
  removeControl: (control: unknown) => MockMap;
  on: (event: string, handler: (event: unknown) => void) => MockMap;
  off: (event: string, handler: (event: unknown) => void) => MockMap;
  fire: (event: string, payload: unknown) => MockMap;
  getContainer: () => HTMLElement;
};

const mapState = vi.hoisted(() => ({ map: null as MockMap | null }));

vi.mock("leaflet", () => {
  class LatLng {
    constructor(public lat: number, public lng: number) {}
  }

  class Polyline {
    private points: LatLng[];
    constructor(points: Array<LatLng | [number, number]>, public options: Record<string, unknown> = {}) {
      this.points = points.map((point) => point instanceof LatLng ? point : new LatLng(point[0], point[1]));
    }
    getLatLngs(): LatLng[] | LatLng[][] {
      return this.points;
    }
    setLatLngs(points: Array<LatLng | [number, number]>) {
      this.points = points.map((point) => point instanceof LatLng ? point : new LatLng(point[0], point[1]));
      return this;
    }
  }

  class Polygon extends Polyline {
    private polygonPoints: LatLng[];
    constructor(points: Array<LatLng | [number, number]>, public options: Record<string, unknown> = {}) {
      super(points, options);
      this.polygonPoints = points.map((point) => point instanceof LatLng ? point : new LatLng(point[0], point[1]));
    }
    getLatLngs(): LatLng[][] {
      return [this.polygonPoints];
    }
    setLatLngs(points: Array<LatLng | [number, number]>) {
      this.polygonPoints = points.map((point) => point instanceof LatLng ? point : new LatLng(point[0], point[1]));
      return this;
    }
  }

  class FeatureGroup {
    private layers: unknown[] = [];
    addLayer(layer: unknown) {
      this.layers.push(layer);
      return this;
    }
    clearLayers() {
      this.layers = [];
      return this;
    }
    getLayers() {
      return [...this.layers];
    }
  }

  class TestMap {
    container = document.createElement("div");
    layers = new Set<unknown>();
    controls = new Set<unknown>();
    handlers = new Map<string, Set<(event: unknown) => void>>();
    addLayer(layer: unknown) {
      this.layers.add(layer);
      return this;
    }
    removeLayer(layer: unknown) {
      this.layers.delete(layer);
      return this;
    }
    addControl(control: { onAdd?: () => HTMLElement; _container?: HTMLElement }) {
      this.controls.add(control);
      if (control.onAdd) {
        control._container = control.onAdd();
        this.container.append(control._container);
      }
      return this;
    }
    removeControl(control: { _container?: HTMLElement }) {
      this.controls.delete(control);
      control._container?.remove();
      return this;
    }
    on(event: string, handler: (payload: unknown) => void) {
      const handlers = this.handlers.get(event) ?? new Set();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }
    off(event: string, handler: (payload: unknown) => void) {
      this.handlers.get(event)?.delete(handler);
      return this;
    }
    fire(event: string, payload: unknown) {
      for (const handler of this.handlers.get(event) ?? []) {
        handler(payload);
      }
      return this;
    }
    getContainer() {
      return this.container;
    }
  }

  class DrawControl {
    _container?: HTMLElement;
    constructor(public options: Record<string, unknown>) {}
    onAdd() {
      const container = document.createElement("div");
      const addButton = (className: string) => {
        const button = document.createElement("a");
        button.className = className;
        container.append(button);
      };
      const drawOptions = this.options.draw as Record<string, unknown>;
      const editOptions = this.options.edit as Record<string, unknown>;
      if (drawOptions.polyline) addButton("leaflet-draw-draw-polyline");
      if (drawOptions.polygon) addButton("leaflet-draw-draw-polygon");
      if (editOptions.edit) addButton("leaflet-draw-edit-edit");
      if (editOptions.remove) addButton("leaflet-draw-edit-remove");
      return container;
    }
  }

  const control = {
    Draw: DrawControl,
    extend: (definition: { options?: Record<string, unknown>; onAdd: () => HTMLElement }) => class ExtendedControl {
      options = definition.options ?? {};
      onAdd = definition.onAdd;
      _container?: HTMLElement;
    },
  };

  const domUtil = {
    create: (tagName: string, className: string, container?: HTMLElement) => {
      const element = document.createElement(tagName);
      element.className = className;
      container?.append(element);
      return element;
    },
  };

  const domEvent = {
    on: (element: HTMLElement, event: string, handler: EventListener) => element.addEventListener(event, handler),
    stop: (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    },
  };

  const leaflet = {
    Map: TestMap,
    LatLng,
    Polyline,
    Polygon,
    FeatureGroup,
    Control: control,
    DomUtil: domUtil,
    DomEvent: domEvent,
    Draw: { Event: { CREATED: "draw:created", EDITED: "draw:edited", DELETED: "draw:deleted" } },
    latLng: (lat: number, lng: number) => new LatLng(lat, lng),
    polyline: (points: LatLng[], options?: Record<string, unknown>) => new Polyline(points, options),
    polygon: (points: LatLng[], options?: Record<string, unknown>) => new Polygon(points, options),
    latLngBounds: (bounds: unknown) => ({ bounds }),
  };

  return { default: leaflet, ...leaflet };
});

vi.mock("leaflet-draw", () => ({}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet-draw/dist/leaflet.draw.css", () => ({}));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => React.createElement("div", { "data-testid": "mock-map" }, children),
  TileLayer: () => null,
  useMap: () => mapState.map,
}));

import L from "leaflet";
import { ActionDrawingMap } from "./action-drawing-map";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type MockFeatureGroup = {
  addLayer: (layer: unknown) => MockFeatureGroup;
  clearLayers: () => MockFeatureGroup;
  getLayers: () => unknown[];
};

type MockLayer = {
  setLatLngs: (points: Array<[number, number]>) => MockLayer;
};

type MockLeafletRuntime = {
  Map: new () => MockMap;
  FeatureGroup: new () => MockFeatureGroup;
  Polyline: new (points: Array<[number, number]>) => MockLayer;
  Polygon: new (points: Array<[number, number]>) => MockLayer;
};

const mockL = L as unknown as MockLeafletRuntime;

const polylineValue: ActionDrawing = {
  kind: "polyline",
  coordinates: [[48.85, 2.35], [48.851, 2.351]],
};

const polygonValue: ActionDrawing = {
  kind: "polygon",
  coordinates: [[48.85, 2.35], [48.851, 2.351], [48.852, 2.35]],
};

describe("ActionDrawingMap Leaflet lifecycle", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;
  let isMobile = false;
  let mediaListeners = new Set<() => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    isMobile = false;
    mediaListeners = new Set();
    mapState.map = new mockL.Map();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: isMobile,
      media: "(max-width: 768px)",
      addEventListener: (_event: string, listener: () => void) => mediaListeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => mediaListeners.delete(listener),
    })));
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    host?.remove();
    root = null;
    host = null;
    mapState.map = null;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function mount(props: React.ComponentProps<typeof ActionDrawingMap> = {}) {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<ActionDrawingMap {...props} />));
  }

  async function settle() {
    await act(async () => {
      await vi.runAllTimersAsync();
    });
  }

  function group() {
    return [...(mapState.map?.layers ?? [])].find((layer) => layer instanceof mockL.FeatureGroup) as MockFeatureGroup;
  }

  it("initializes the map, FeatureGroup, controls, and accessible labels", async () => {
    mount({ onChange: vi.fn() });
    await settle();

    expect(mapState.map?.layers.size).toBe(1);
    expect(mapState.map?.controls.size).toBe(2);
    expect(mapState.map?.container.querySelector(".cmm-undo-btn")?.getAttribute("aria-label")).toBe("Effacer le tracé dessiné");
    expect(mapState.map?.container.querySelector(".leaflet-draw-draw-polyline")?.getAttribute("aria-label")).toBe("Dessiner un tracé");
    expect(mapState.map?.container.querySelector(".leaflet-draw-draw-polygon")?.getAttribute("aria-label")).toBe("Dessiner une zone");
    expect(mapState.map?.container.querySelector(".leaflet-draw-edit-edit")?.getAttribute("aria-label")).toBe("Modifier le tracé dessiné");
    expect(mapState.map?.handlers.has("draw:created")).toBe(true);
  });

  it("disables draw and undo controls in readOnly and on mobile", async () => {
    mount({ readOnly: true, onChange: vi.fn() });
    await settle();
    expect(mapState.map?.controls.size).toBe(0);
    expect(host?.textContent).not.toContain("Tracé désactivé sur mobile");
    act(() => root?.unmount());
    root = null;

    isMobile = true;
    mapState.map = new mockL.Map();
    mount({ onChange: vi.fn() });
    await settle();
    expect(host?.textContent).toContain("Tracé désactivé sur mobile");
    expect(mapState.map?.controls.size).toBe(0);
  });

  it("emits normalized manual polyline and polygon drawings without browser routing", async () => {
    const onChange = vi.fn();
    mount({ onChange });
    await settle();

    const polyline = new mockL.Polyline([[48.85, 2.35], [48.8510004, 2.3510004]]);
    mapState.map?.fire("draw:created", { layer: polyline });
    expect(group().getLayers()).toHaveLength(1);
    expect(onChange).toHaveBeenLastCalledWith(
      { kind: "polyline", coordinates: [[48.85, 2.35], [48.851, 2.351]] },
      "manual",
    );

    const polygon = new mockL.Polygon([[48.85, 2.35], [48.851, 2.351], [48.852, 2.35]]);
    mapState.map?.fire("draw:created", { layer: polygon });
    expect(onChange).toHaveBeenLastCalledWith(polygonValue, "manual");
    expect(group().getLayers()).toHaveLength(1);

    const invalid = new mockL.Polyline([[48.85, 2.35]]);
    mapState.map?.fire("draw:created", { layer: invalid });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("handles edits, an emptied edit group, deletion, and the undo control", async () => {
    const onChange = vi.fn();
    mount({ value: polylineValue, onChange });
    await settle();
    expect(group().getLayers()).toHaveLength(1);

    const layer = group().getLayers()[0] as MockLayer;
    layer.setLatLngs([[48.86, 2.36], [48.861, 2.361]]);
    mapState.map?.fire("draw:edited", {});
    expect(onChange).toHaveBeenLastCalledWith(
      { kind: "polyline", coordinates: [[48.86, 2.36], [48.861, 2.361]] },
      "manual",
    );

    group().clearLayers();
    mapState.map?.fire("draw:edited", {});
    expect(onChange).toHaveBeenLastCalledWith(null);

    group().addLayer(new mockL.Polyline([[48.85, 2.35], [48.851, 2.351]]));
    mapState.map?.fire("draw:deleted", {});
    expect(onChange).toHaveBeenLastCalledWith(null);

    group().addLayer(new mockL.Polyline([[48.85, 2.35], [48.851, 2.351]]));
    const undo = mapState.map?.container.querySelector<HTMLAnchorElement>(".cmm-undo-btn");
    expect(undo).not.toBeNull();
    act(() => undo?.click());
    expect(group().getLayers()).toHaveLength(0);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("loads, replaces, invalidates, and clears external values without duplicating layers", async () => {
    const onChange = vi.fn();
    mount({ value: polylineValue, onChange });
    await settle();
    expect(group().getLayers()).toHaveLength(1);

    act(() => root?.render(<ActionDrawingMap value={polygonValue} onChange={onChange} />));
    await settle();
    expect(group().getLayers()).toHaveLength(1);
    expect(group().getLayers()[0]).toBeInstanceOf(mockL.Polygon);

    const invalid: ActionDrawing = { kind: "polyline", coordinates: [[91, 181]] };
    act(() => root?.render(<ActionDrawingMap value={invalid} onChange={onChange} />));
    await settle();
    expect(group().getLayers()).toHaveLength(0);

    act(() => root?.render(<ActionDrawingMap value={null} onChange={onChange} />));
    await settle();
    expect(group().getLayers()).toHaveLength(0);
  });

  it("unsubscribes Leaflet events and removes controls and layers on unmount", async () => {
    const onChange = vi.fn();
    mount({ value: polylineValue, onChange });
    await settle();
    const activeMap = mapState.map as MockMap;
    expect(activeMap.layers.size).toBe(1);
    expect(activeMap.controls.size).toBe(2);
    expect([...activeMap.handlers.values()].every((handlers) => handlers.size > 0)).toBe(true);

    act(() => root?.unmount());
    root = null;
    expect(activeMap.layers.size).toBe(0);
    expect(activeMap.controls.size).toBe(0);
    expect([...activeMap.handlers.values()].every((handlers) => handlers.size === 0)).toBe(true);
  });
});
