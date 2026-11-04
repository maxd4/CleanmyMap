// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ROUTE_OPTIONS,
  ROUTE_DRAFT_STORAGE_KEY,
  writeRouteDraftOptions,
} from "../route-draft-storage";
import { buildBoundedRouteStartZone } from "@/lib/route/route-start-location";
import type { RouteOptions } from "../route-types";

const swrMock = vi.hoisted(() => vi.fn());
const browserOriginMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({ default: swrMock }));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));
vi.mock("../route-geolocation", () => ({
  resolveBrowserRouteOrigin: browserOriginMock,
}));

import { useRouteData } from "./use-route-data";

function renderHarness() {
  function Harness() {
    const route = useRouteData();
    void route;

    return null;
  }

  renderToStaticMarkup(React.createElement(Harness));
}

let latestRoute: ReturnType<typeof useRouteData> | undefined;
let root: Root | undefined;
let host: HTMLDivElement | undefined;

function renderClientHarness() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root?.render(React.createElement(() => {
    latestRoute = useRouteData();
    return null;
  })));
}

describe("useRouteData explicit request gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    latestRoute = undefined;
    browserOriginMock.mockResolvedValue({
      latitude: 48.861,
      longitude: 2.361,
      source: "browser",
    });
    let previousKey: string | null = null;
    swrMock.mockImplementation((key: unknown, fetcher: (key: unknown) => unknown) => {
      const serializedKey = key === null ? null : JSON.stringify(key);
      if (serializedKey !== null && serializedKey !== previousKey) {
        previousKey = serializedKey;
        void fetcher(key);
      }

      return {
        data: undefined,
        isLoading: serializedKey !== null,
        error: undefined,
      };
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );
  });

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = undefined;
    host = undefined;
  });

  it("does not POST while the draft is only being edited", () => {
    renderHarness();

    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["address", {
      ...DEFAULT_ROUTE_OPTIONS,
      startLocation: {
        mode: "precise" as const,
        label: "Adresse enregistrée",
        origin: { latitude: 48.8566, longitude: 2.3522, source: "address" as const },
      },
    }],
    ["gps", {
      ...DEFAULT_ROUTE_OPTIONS,
      startLocation: {
        mode: "precise" as const,
        label: "GPS 48.856600, 2.352200",
        origin: { latitude: 48.8566, longitude: 2.3522, source: "gps" as const },
      },
    }],
  ] as const)("sends the browser origin after replacing a previous %s selection", async (_source, selectedOptions) => {
    renderClientHarness();

    await act(async () => {
      latestRoute?.setOptions(selectedOptions);
    });
    await act(async () => {
      latestRoute?.setOriginMode(_source);
    });
    await act(async () => {
      latestRoute?.setOriginMode("browser");
    });
    await act(async () => {
      await latestRoute?.requestRecommendation();
    });

    const payload = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string);
    expect(payload).not.toHaveProperty("startLocation");
    expect(payload.origin).toEqual({ latitude: 48.861, longitude: 2.361, source: "browser" });
    expect(browserOriginMock).toHaveBeenCalledOnce();
  });

  it("restores the effective Zone mode and map selection from a current draft", async () => {
    const zoneOptions: RouteOptions = {
      ...DEFAULT_ROUTE_OPTIONS,
      startLocation: {
        mode: "zone",
        label: "Quartier test",
        zone: { ...buildBoundedRouteStartZone("Quartier test", { latitude: 48.857, longitude: 2.351 }, 2), confirmed: true },
      },
    };
    writeRouteDraftOptions(sessionStorage, zoneOptions);

    renderClientHarness();

    await act(async () => undefined);
    expect(latestRoute?.originMode).toBe("zone");
    expect(latestRoute?.options.startLocation?.mode).toBe("zone");

    const mapOptions: RouteOptions = {
      ...DEFAULT_ROUTE_OPTIONS,
      startLocation: {
        mode: "precise",
        label: "Point choisi sur la carte",
        origin: { latitude: 48.857, longitude: 2.351, source: "map" },
      },
    };
    writeRouteDraftOptions(sessionStorage, mapOptions);
    const storageEvent = new Event("storage");
    Object.defineProperty(storageEvent, "key", { value: ROUTE_DRAFT_STORAGE_KEY });
    window.dispatchEvent(storageEvent);
    await act(async () => undefined);

    expect(latestRoute?.originMode).toBe("map");
    expect(latestRoute?.mapOrigin).toEqual(mapOptions.startLocation?.mode === "precise" ? mapOptions.startLocation.origin : null);
  });

  it("clears an invalidated map selection while retaining map mode", async () => {
    const mapOptions: RouteOptions = {
      ...DEFAULT_ROUTE_OPTIONS,
      startLocation: {
        mode: "precise",
        label: "Point choisi sur la carte",
        origin: { latitude: 48.857, longitude: 2.351, source: "map" },
      },
    };
    renderClientHarness();

    await act(async () => {
      latestRoute?.setOptions(mapOptions);
    });
    await act(async () => {
      latestRoute?.setOriginMode("map");
    });
    await act(async () => {
      latestRoute?.clearMapOrigin();
    });

    expect(latestRoute?.originMode).toBe("map");
    expect(latestRoute?.mapOrigin).toBeNull();
    expect(latestRoute?.options.startLocation).toBeUndefined();
  });

  it("reuses the current constraints while asking the server for a relevance-first alternative", async () => {
    renderClientHarness();

    await act(async () => {
      await latestRoute?.requestNearestRelevantRoute();
    });

    const payload = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string);
    expect(payload.priorityVsTravel).toBe(DEFAULT_ROUTE_OPTIONS.priorityVsTravel);
    expect(payload.searchMode).toBe("nearest_relevant");
    expect(payload.travelBudgetMinutes).toBe(DEFAULT_ROUTE_OPTIONS.travelBudgetMinutes);
    expect(payload.pickupPreference).toBe(DEFAULT_ROUTE_OPTIONS.pickupPreference);
  });

  it("cancels a pending alternative when the user changes the request and accepts a new standard request", async () => {
    const seenKeys = new Set<string>();
    let releaseAlternative: (() => void) | undefined;
    let swrCalls = 0;
    swrMock.mockImplementation((
      key: unknown,
      fetcher: (key: unknown) => Promise<unknown>,
      config: { onSuccess?: (value: unknown) => void },
    ) => {
      const serializedKey = key === null ? null : JSON.stringify(key);
      if (serializedKey !== null && !seenKeys.has(serializedKey)) {
        seenKeys.add(serializedKey);
        swrCalls += 1;
        const request = swrCalls === 1
          ? new Promise<void>((resolve) => { releaseAlternative = resolve; }).then(() => fetcher(key))
          : fetcher(key);
        void request.then((value) => config.onSuccess?.(value));
      }
      return {
        data: undefined,
        isLoading: serializedKey !== null,
        error: undefined,
      };
    });

    renderClientHarness();
    await act(async () => { await latestRoute?.requestNearestRelevantRoute(); });
    await act(async () => {
      latestRoute?.setOptions({ ...DEFAULT_ROUTE_OPTIONS, travelBudgetMinutes: 45 });
    });
    await act(async () => { await latestRoute?.requestRecommendation(); });

    releaseAlternative?.();
    await act(async () => { await Promise.resolve(); });
    const payloads = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init?.body as string));
    expect(payloads.some((payload) => payload.searchMode === "nearest_relevant")).toBe(true);
    expect(payloads.some((payload) => !payload.searchMode && payload.travelBudgetMinutes === 45)).toBe(true);
  });
});
