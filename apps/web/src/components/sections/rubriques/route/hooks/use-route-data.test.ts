import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const swrMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({ default: swrMock }));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

import { useRouteData } from "./use-route-data";

function renderHarness(action: "none" | "calculate-then-edit") {
  function Harness() {
    const route = useRouteData();
    const step = React.useRef(0);

    if (action === "calculate-then-edit" && step.current === 0) {
      step.current = 1;
      route.requestRecommendation();
    } else if (action === "calculate-then-edit" && step.current === 1) {
      step.current = 2;
      route.setOptions((previous) => ({
        ...previous,
        priorityVsDistance: 20,
      }));
    }

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
    renderHarness("none");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("POSTs once for a click and does not POST again for a subsequent edit", () => {
    renderHarness("calculate-then-edit");

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "/api/route/recommend",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"priorityVsDistance":65'),
      }),
    );
  });
});
