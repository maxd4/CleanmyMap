import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import { useActionsMapViewport } from "./use-actions-map-viewport";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const resolveInitialPublicMapViewportMock = vi.hoisted(() => vi.fn());
vi.mock("./actions-map-initial-viewport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./actions-map-initial-viewport")>()),
  resolveInitialPublicMapViewport: resolveInitialPublicMapViewportMock,
}));

const fallback: MapViewportState = {
  center: [48.8566, 2.3522],
  zoom: 12,
  bounds: { south: 48.8, west: 2.2, north: 48.9, east: 2.4 },
};

const remote: MapViewportState = {
  center: [45.764, 4.8357],
  zoom: 11,
  bounds: { south: 45.7, west: 4.7, north: 45.9, east: 5 },
};

type ProbeProps = {
  onViewportChange?: (viewport: MapViewportState) => void;
  options?: Parameters<typeof useActionsMapViewport>[1];
};

function ViewportProbe({ onViewportChange, options }: ProbeProps) {
  const state = useActionsMapViewport(onViewportChange, options);
  return (
    <section>
      <output id="state">{JSON.stringify({
        viewport: state.viewport,
        request: state.viewportRequest,
        requestKey: state.viewportRequestKey,
        recenter: state.recenterViewport,
        resolved: state.isInitialViewportResolved,
        hasActions: state.hasInitialPublicActions,
        error: state.initialViewportError?.message ?? null,
      })}</output>
      <button type="button" onClick={state.handleManualViewportInteraction}>manual</button>
      <button type="button" onClick={() => state.handleViewportChange(remote)}>change</button>
      <button type="button" onClick={state.retryInitialViewport}>retry</button>
    </section>
  );
}

function readState(renderer: ReturnType<typeof create>) {
  return JSON.parse(String(renderer.root.findByType("output").children[0]));
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  resolveInitialPublicMapViewportMock.mockReset();
  vi.unstubAllGlobals();
});

describe("useActionsMapViewport behavior", () => {
  it("keeps an explicit fallback when geolocation is unavailable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ViewportProbe options={{ fallbackViewport: fallback, useRemoteFallback: false }} />);
    });
    await settle();

    expect(readState(renderer)).toMatchObject({ viewport: fallback, resolved: true, hasActions: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resolveInitialPublicMapViewportMock).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("resolves an empty public map without inventing a viewport", async () => {
    resolveInitialPublicMapViewportMock.mockResolvedValue({
      reference: null,
      viewport: null,
      selectedItem: null,
      cityLabel: null,
      cityItems: [],
      searchRadiiKm: [],
    });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ViewportProbe options={{ useRemoteFallback: false }} />); });
    await settle();

    expect(resolveInitialPublicMapViewportMock).toHaveBeenCalledWith({ reference: null });
    expect(readState(renderer)).toMatchObject({ viewport: null, resolved: true, hasActions: false, error: null });
    renderer.unmount();
  });

  it("exposes a retryable resolver failure", async () => {
    resolveInitialPublicMapViewportMock
      .mockRejectedValueOnce(new Error("resolver down"))
      .mockResolvedValueOnce({
        reference: null,
        viewport: remote,
        selectedItem: null,
        cityLabel: null,
        cityItems: [{ id: "action-1" }],
        searchRadiiKm: [],
      });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ViewportProbe options={{ useRemoteFallback: false }} />); });
    await settle();
    expect(readState(renderer)).toMatchObject({ resolved: true, hasActions: false, error: "resolver down" });

    await act(async () => { renderer.root.findAllByType("button")[2]?.props.onClick(); });
    await settle();
    expect(resolveInitialPublicMapViewportMock).toHaveBeenCalledTimes(2);
    expect(readState(renderer)).toMatchObject({ viewport: remote, resolved: true, hasActions: true, error: null });
    renderer.unmount();
  });

  it("does not let a late automatic response overwrite a manual viewport", async () => {
    let resolveViewport!: (value: unknown) => void;
    const pending = new Promise((resolve) => { resolveViewport = resolve; });
    resolveInitialPublicMapViewportMock.mockReturnValueOnce(pending);
    const onViewportChange = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ViewportProbe onViewportChange={onViewportChange} options={{ useRemoteFallback: false }} />); });

    await act(async () => { renderer.root.findAllByType("button")[0]?.props.onClick(); });
    await act(async () => { renderer.root.findAllByType("button")[1]?.props.onClick(); });
    expect(readState(renderer).viewport).toEqual(remote);
    resolveViewport({
      reference: null,
      viewport: fallback,
      selectedItem: null,
      cityLabel: null,
      cityItems: [{ id: "late-action" }],
      searchRadiiKm: [],
    });
    await settle();

    expect(readState(renderer).viewport).toEqual(remote);
    expect(readState(renderer).request).toBeNull();
    expect(onViewportChange).toHaveBeenCalledWith(remote);
    renderer.unmount();
  });

  it("ignores a resolver completion after unmount", async () => {
    let resolveViewport!: (value: unknown) => void;
    const pending = new Promise((resolve) => { resolveViewport = resolve; });
    resolveInitialPublicMapViewportMock.mockReturnValueOnce(pending);
    const onViewportChange = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ViewportProbe onViewportChange={onViewportChange} options={{ useRemoteFallback: false }} />); });
    renderer.unmount();
    resolveViewport({
      reference: null,
      viewport: remote,
      selectedItem: null,
      cityLabel: null,
      cityItems: [{ id: "late-action" }],
      searchRadiiKm: [],
    });
    await settle();
    expect(onViewportChange).not.toHaveBeenCalled();
  });
});
