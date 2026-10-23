import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSWRMock = vi.hoisted(() => vi.fn());
vi.mock("swr/immutable", () => ({ default: useSWRMock }));

import { PLASTIC_ORIGINS_DATA_URL } from "./contract";
import { usePlasticOriginsData } from "./use-plastic-origins-data";

function Probe({ enabled }: { enabled: boolean }) {
  const state = usePlasticOriginsData(enabled);
  return React.createElement("output", {
    "data-loading": String(state.isLoading),
    "data-error": String(Boolean(state.error)),
    "data-count": String(state.data?.observations.length ?? 0),
  });
}

describe("Plastic Origins static layer loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSWRMock.mockReturnValue({ data: undefined, error: undefined, isLoading: false, mutate: vi.fn() });
  });

  it("does not request the external export until the full-map layer is activated", () => {
    renderToStaticMarkup(React.createElement(Probe, { enabled: false }));

    expect(useSWRMock).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object));
  });

  it("requests the static export with explicit no-focus refresh behavior when activated", () => {
    renderToStaticMarkup(React.createElement(Probe, { enabled: true }));
    const [key, fetcher, options] = useSWRMock.mock.calls[0] as [string, (url: string) => Promise<unknown>, Record<string, unknown>];

    expect(key).toBe(PLASTIC_ORIGINS_DATA_URL);
    expect(options.revalidateOnFocus).toBe(false);
    expect(options.revalidateOnReconnect).toBe(false);
    expect(options.shouldRetryOnError).toBe(false);
    expect(fetcher).toEqual(expect.any(Function));
  });

  it("shares one browser request for the immutable export", async () => {
    const payload = { schemaVersion: 1, observations: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);
    renderToStaticMarkup(React.createElement(Probe, { enabled: true }));
    const [, fetcher] = useSWRMock.mock.calls[0] as [string, (url: string) => Promise<unknown>];

    await Promise.all([fetcher(PLASTIC_ORIGINS_DATA_URL), fetcher(PLASTIC_ORIGINS_DATA_URL)]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(PLASTIC_ORIGINS_DATA_URL, { cache: "force-cache" });
    vi.unstubAllGlobals();
  });
});
