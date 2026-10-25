// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WeatherLocationSuggestion } from "./weather-types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(),
  useUser: vi.fn(),
  useSuggestions: vi.fn(),
}));

vi.mock("swr", () => ({ default: mocks.useSWR }));
vi.mock("@clerk/nextjs", () => ({ useUser: mocks.useUser }));
vi.mock("./use-weather-location-suggestions", () => ({
  useWeatherLocationSuggestions: mocks.useSuggestions,
}));

import { useWeatherData } from "./use-weather-data";

type WeatherDraftContext = NonNullable<Parameters<typeof useWeatherData>[0]>;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function renderHook(context: WeatherDraftContext) {
  let current: ReturnType<typeof useWeatherData> | null = null;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const render = (nextContext: WeatherDraftContext) => {
    act(() => {
      root?.render(
        React.createElement(() => {
          current = useWeatherData(nextContext);
          return null;
        }),
      );
    });
  };

  render(context);
  return {
    render,
    get current() {
      if (!current) throw new Error("Weather hook was not rendered");
      return current;
    },
  };
}

function suggestion(label: string, latitude: number): WeatherLocationSuggestion {
  return {
    label,
    subtitle: "Localisation résolue",
    latitude,
    longitude: 2.35,
    importance: null,
  };
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useUser.mockReturnValue({ isLoaded: true, user: null });
  mocks.useSuggestions.mockReturnValue({
    locationSuggestions: { data: { items: [] }, isLoading: false },
    locationSuggestionsError: null,
  });
  mocks.useSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });
});

describe("useWeatherData asynchronous location lifecycle", () => {
  it("keeps a newer draft location when the previous resolution returns late", async () => {
    const requests = new Map<string, Deferred<Response>>();
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      const label = new URL(url, window.location.origin).searchParams.get("q") ?? "";
      const request = deferred<Response>();
      requests.set(label, request);
      return request.promise;
    }));

    const hook = renderHook({ locationLabel: "Ancien lieu", contextReady: true });
    hook.render({ locationLabel: "Nouveau lieu", contextReady: true });

    await act(async () => {
      requests.get("Ancien lieu")?.resolve(new Response(JSON.stringify({ items: [suggestion("Ancien lieu", 48.8)] }), { status: 200 }));
      requests.get("Nouveau lieu")?.resolve(new Response(JSON.stringify({ items: [suggestion("Nouveau lieu", 48.9)] }), { status: 200 }));
      await Promise.resolve();
    });

    expect(hook.current.selectedLocation.label).toBe("Nouveau lieu");
    expect(hook.current.selectedLocation.latitude).toBe(48.9);
  });

  it("keeps an explicit manual selection when an automatic resolution returns late", async () => {
    const request = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => request.promise));
    const hook = renderHook({ locationLabel: "Lieu automatique", contextReady: true });

    act(() => {
      hook.current.selectLocation(suggestion("Lieu manuel", 43.3));
    });
    await act(async () => {
      request.resolve(new Response(JSON.stringify({ items: [suggestion("Lieu automatique", 48.8)] }), { status: 200 }));
      await Promise.resolve();
    });

    expect(hook.current.selectedLocation.label).toBe("Lieu manuel");
    expect(hook.current.selectedLocation.latitude).toBe(43.3);
  });

  it("honours a geolocation refusal as a silent fallback", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
      error?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    const hook = renderHook({});
    await act(async () => {
      await Promise.resolve();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(hook.current.selectedLocation.label).toBe("France");
    expect(hook.current.weatherStatus).toBe("empty");
  });

  it("applies an authorised geolocation only when reverse resolution succeeds", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 43.3, longitude: 5.4 } as GeolocationCoordinates,
        timestamp: Date.now(),
      } as GeolocationPosition);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        location: {
          ...suggestion("Marseille", 43.3),
          resolution: "resolved",
        },
      }), { status: 200 }),
    ));

    const hook = renderHook({});
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(hook.current.selectedLocation.label).toBe("Marseille");
    expect(hook.current.selectedLocation.latitude).toBe(43.3);
  });
});
