// @vitest-environment jsdom

import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";
import { useWeatherLocationSuggestions } from "./use-weather-location-suggestions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function response(label: string) {
  return new Response(JSON.stringify({
    status: "ok",
    query: label,
    items: [{
      label,
      subtitle: "Résultat de test",
      latitude: 48.85,
      longitude: 2.35,
      importance: null,
    }],
  }), { status: 200 });
}

function Probe({
  query,
  onValue,
}: {
  query: string;
  onValue: (value: ReturnType<typeof useWeatherLocationSuggestions>) => void;
}) {
  onValue(useWeatherLocationSuggestions(query));
  return null;
}

function renderHook(query: string) {
  let current: ReturnType<typeof useWeatherLocationSuggestions> | null = null;
  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = create(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Probe query={query} onValue={(value) => { current = value; }} />
      </SWRConfig>,
    );
  });

  return {
    render(nextQuery: string) {
      act(() => {
        renderer.update(
          <SWRConfig value={{ provider: () => new Map() }}>
            <Probe query={nextQuery} onValue={(value) => { current = value; }} />
          </SWRConfig>,
        );
      });
    },
    get current() {
      if (!current) throw new Error("Weather suggestions hook was not rendered");
      return current;
    },
    renderer,
  };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useWeatherLocationSuggestions request lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("debounces input and keeps the newest response when searches finish in reverse order", async () => {
    const requests = new Map<string, Deferred<Response>>();
    const fetchMock = vi.fn((url: string) => {
      const query = new URL(url, "https://cleanmymap.test").searchParams.get("q") ?? "";
      const request = deferred<Response>();
      requests.set(query, request);
      return request.promise;
    });
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook("");
    hook.render("meteo ancien");
    await act(async () => { vi.advanceTimersByTime(219); });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    hook.render("meteo nouveau");
    await act(async () => { vi.advanceTimersByTime(220); });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      requests.get("meteo ancien")?.resolve(response("meteo ancien"));
      await flushPromises();
    });
    expect(hook.current.locationSuggestions.data?.items ?? []).toEqual([]);

    await act(async () => {
      requests.get("meteo nouveau")?.resolve(response("meteo nouveau"));
      await flushPromises();
    });
    expect(hook.current.locationSuggestions.data?.items.map((item) => item.label)).toEqual(["meteo nouveau"]);
    hook.renderer.unmount();
  });

  it("surfaces a rejected remote search only when no local fallback exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("weather search down")));
    const hook = renderHook("");
    hook.render("requete meteo unique");
    await act(async () => { vi.advanceTimersByTime(220); });
    await flushPromises();

    expect(hook.current.locationSuggestionsError).toBe("location_suggestions_unavailable");
    hook.renderer.unmount();
  });
});
