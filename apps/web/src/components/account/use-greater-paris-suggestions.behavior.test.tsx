// @vitest-environment jsdom

import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import type { TerritoryLocationLevel } from "@/lib/user-location-preference";
import { useTerritorySuggestions } from "./use-greater-paris-suggestions";

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

function suggestion(label: string): GeoAddressSuggestion {
  return {
    label,
    subtitle: "Résultat de test",
    latitude: 48.85,
    longitude: 2.35,
    importance: null,
  };
}

function Probe({
  query,
  level = "commune",
  onValue,
}: {
  query: string;
  level?: TerritoryLocationLevel;
  onValue: (value: ReturnType<typeof useTerritorySuggestions>) => void;
}) {
  onValue(useTerritorySuggestions(query, level));
  return null;
}

function renderHook(query: string) {
  let current: ReturnType<typeof useTerritorySuggestions> | null = null;
  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = create(
      <Probe query={query} onValue={(value) => { current = value; }} />,
    );
  });

  return {
    render(nextQuery: string, nextLevel: TerritoryLocationLevel = "commune") {
      act(() => {
        renderer.update(
          <Probe query={nextQuery} level={nextLevel} onValue={(value) => { current = value; }} />,
        );
      });
    },
    get current() {
      if (!current) throw new Error("Suggestions hook was not rendered");
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

describe("useTerritorySuggestions request lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("debounces input and ignores a late response from an obsolete query", async () => {
    const requests = new Map<string, Deferred<Response>>();
    const fetchMock = vi.fn((url: string) => {
      const request = deferred<Response>();
      requests.set(new URL(url, "https://cleanmymap.test").searchParams.get("q") ?? "", request);
      return request.promise;
    });
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook("ancien lieu");
    await act(async () => { vi.advanceTimersByTime(179); });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    hook.render("nouveau lieu");
    expect(hook.current.suggestions).toEqual([]);
    await act(async () => { vi.advanceTimersByTime(180); });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      requests.get("ancien lieu")?.resolve(
        new Response(JSON.stringify({ items: [suggestion("Ancien lieu")] }), { status: 200 }),
      );
      await flushPromises();
    });
    expect(hook.current.suggestions).toEqual([]);

    await act(async () => {
      requests.get("nouveau lieu")?.resolve(
        new Response(JSON.stringify({ items: [suggestion("Nouveau lieu")] }), { status: 200 }),
      );
      await flushPromises();
    });
    expect(hook.current.suggestions.map((item) => item.label)).toEqual(["Nouveau lieu"]);
    hook.renderer.unmount();
  });

  it("reports a non-abort network rejection and clears loading", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook("requete indisponible");
    await act(async () => { vi.advanceTimersByTime(180); });
    await flushPromises();

    expect(hook.current.errorMessage).toBe("network down");
    expect(hook.current.isLoading).toBe(false);
    hook.renderer.unmount();
  });

  it("does not surface an aborted request as an error", async () => {
    const request = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(request.promise);
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook("requete abandonnee");
    await act(async () => { vi.advanceTimersByTime(180); });
    hook.render("", "country");

    await act(async () => {
      request.reject(new DOMException("aborted", "AbortError"));
      await flushPromises();
    });

    expect(hook.current.errorMessage).toBeNull();
    hook.renderer.unmount();
  });
});
