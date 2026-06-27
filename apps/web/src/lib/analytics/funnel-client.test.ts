import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hasAnalyticsConsentMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsent: hasAnalyticsConsentMock,
}));

let trackFunnel: typeof import("./funnel-client").trackFunnel;

function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  };
}

function installBrowserMocks() {
  const sessionStorage = createSessionStorageMock();
  vi.stubGlobal("window", {
    sessionStorage,
    addEventListener: vi.fn(),
  } as unknown as Window);
  vi.stubGlobal("document", {
    addEventListener: vi.fn(),
    visibilityState: "visible",
  } as unknown as Document);
  vi.stubGlobal("crypto", {
    randomUUID: () => "uuid-123",
  } as Crypto);
  return sessionStorage;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  hasAnalyticsConsentMock.mockReset();
  ({ trackFunnel } = await import("./funnel-client"));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("trackFunnel", () => {
  it("does not send anything without analytics consent", async () => {
    const fetchMock = vi.fn();
    hasAnalyticsConsentMock.mockReturnValue(false);
    vi.stubGlobal("fetch", fetchMock);

    await trackFunnel("page_view", "complete", { pagePath: "/reports" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("batches pageviews before sending them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const sessionStorage = installBrowserMocks();
    hasAnalyticsConsentMock.mockReturnValue(true);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn(),
    } as unknown as Navigator);

    await trackFunnel("page_view", "complete", { pagePath: "/reports" });
    await trackFunnel("page_view", "complete", { pagePath: "/actions" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/analytics/funnel");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      }),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")) as {
      sessionId?: string;
      events?: Array<{ step: string; meta?: Record<string, unknown> }>;
    };

    expect(body.sessionId).toBe("uuid-123");
    expect(body.events).toHaveLength(2);
    expect(body.events?.[0]?.step).toBe("page_view");
    expect(body.events?.[0]?.meta).toMatchObject({ pagePath: "/reports" });
    expect(body.events?.[1]?.meta).toMatchObject({ pagePath: "/actions" });
  });

  it("sends conversion events immediately", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    installBrowserMocks();
    hasAnalyticsConsentMock.mockReturnValue(true);
    vi.stubGlobal("fetch", fetchMock);

    await trackFunnel("start_form", "complete", {
      source: "action_declaration_form",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")) as {
      step?: string;
      sessionId?: string;
      meta?: Record<string, unknown>;
    };

    expect(body.step).toBe("start_form");
    expect(body.sessionId).toBe("uuid-123");
    expect(body.meta).toMatchObject({ source: "action_declaration_form" });
  });
});
