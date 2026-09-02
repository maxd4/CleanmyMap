import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const swrMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({ default: swrMock }));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
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

describe("useRouteData explicit request gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("does not POST while the draft is only being edited", () => {
    renderHarness();

    expect(fetch).not.toHaveBeenCalled();
  });
});
