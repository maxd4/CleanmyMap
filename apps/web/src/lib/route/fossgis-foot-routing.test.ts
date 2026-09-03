import { beforeEach, describe, expect, it, vi } from "vitest";

const getRedisClientMock = vi.hoisted(() => vi.fn());
const quotaLimitMock = vi.hoisted(() => vi.fn());
const fixedWindowMock = vi.hoisted(() => vi.fn(() => "fixed-window"));
const FakeRatelimit = vi.hoisted(
  () =>
    class {
      static fixedWindow = fixedWindowMock;
      limit = quotaLimitMock;
    },
);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/services/upstash", () => ({
  getRedisClient: getRedisClientMock,
}));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: FakeRatelimit }));

import {
  FOSSGIS_FOOT_BASE_URL,
  FOSSGIS_FOOT_PROFILE,
  FOSSGIS_FOOT_PROVIDER,
  FOSSGIS_FOOT_REFERER,
  FOSSGIS_FOOT_USER_AGENT,
  routePolylineThroughFossgisFoot,
} from "./fossgis-foot-routing";

const stops: [number, number][] = [
  [48.8566, 2.3522],
  [48.8576, 2.3532],
];

const networkPayload = {
  code: "Ok",
  routes: [
    {
      distance: 1200,
      duration: 720,
      geometry: {
        coordinates: [
          [2.3522, 48.8566],
          [2.3532, 48.8576],
        ],
      },
      legs: [{ distance: 1200, duration: 720 }],
    },
  ],
};

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function configuredTransport() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    void init;
    return response(networkPayload);
  });
}

describe("FOSSGIS pedestrian routing provider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getRedisClientMock.mockReturnValue({});
    quotaLimitMock.mockResolvedValue({ success: true });
  });

  it("uses the routed-foot driving endpoint and exposes the foot semantics", async () => {
    const transport = configuredTransport();

    const result = await routePolylineThroughFossgisFoot(stops, { transport });

    expect(String(transport.mock.calls[0]?.[0])).toBe(
      `${FOSSGIS_FOOT_BASE_URL}/route/v1/driving/2.352200,48.856600;2.353200,48.857600?geometries=geojson&overview=full&steps=true`,
    );
    expect(result).toMatchObject({
      provider: FOSSGIS_FOOT_PROVIDER,
      profile: FOSSGIS_FOOT_PROFILE,
      mode: "network",
      estimated: false,
    });
    expect(quotaLimitMock).toHaveBeenCalledWith("global");
    expect(fixedWindowMock).toHaveBeenCalledWith(1, "1 s");
  });

  it("sends an identifiable User-Agent and the CleanMyMap Referer", async () => {
    const transport = configuredTransport();

    await routePolylineThroughFossgisFoot(stops, { transport });

    const init = transport.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("User-Agent")).toBe(FOSSGIS_FOOT_USER_AGENT);
    expect(headers.get("Referer")).toBe(FOSSGIS_FOOT_REFERER);
  });

  it("calls FOSSGIS exactly once when the distributed quota grants the slot", async () => {
    const transport = configuredTransport();

    await routePolylineThroughFossgisFoot(stops, { transport });

    expect(transport).toHaveBeenCalledTimes(1);
    expect(quotaLimitMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["refused", { success: false }],
    ["timed out", { success: true, reason: "timeout" }],
  ])("returns a fallback without a provider call when the quota is %s", async (_label, quota) => {
    quotaLimitMock.mockResolvedValueOnce(quota);
    const transport = configuredTransport();

    const result = await routePolylineThroughFossgisFoot(stops, { transport });

    expect(result).toMatchObject({ provider: "none", mode: "fallback", estimated: true });
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    ["absent", null],
    ["unavailable", new Error("Redis unavailable")],
  ])("fails closed when Redis is %s", async (_label, redisState) => {
    if (redisState instanceof Error) {
      getRedisClientMock.mockImplementationOnce(() => {
        throw redisState;
      });
    } else {
      getRedisClientMock.mockReturnValueOnce(redisState);
    }
    const transport = configuredTransport();

    const result = await routePolylineThroughFossgisFoot(stops, { transport });

    expect(result.mode).toBe("fallback");
    expect(transport).not.toHaveBeenCalled();
    expect(quotaLimitMock).not.toHaveBeenCalled();
  });

  it("fails closed when the Redis quota call rejects", async () => {
    quotaLimitMock.mockRejectedValueOnce(new Error("Redis timeout"));
    const transport = configuredTransport();

    const result = await routePolylineThroughFossgisFoot(stops, { transport });

    expect(result.mode).toBe("fallback");
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    ["provider error", async () => { throw new Error("FOSSGIS offline"); }],
    ["invalid payload", async () => response({ code: "NoRoute", routes: [] })],
  ])("returns a fallback for a FOSSGIS %s", async (_label, implementation) => {
    const transport = vi.fn(implementation);

    const result = await routePolylineThroughFossgisFoot(stops, { transport });

    expect(result).toMatchObject({ provider: "none", mode: "fallback", estimated: true });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("aborts a slow FOSSGIS request and does not retry it", async () => {
    const transport = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const result = await routePolylineThroughFossgisFoot(stops, {
      transport,
      timeoutMs: 1,
    });

    expect(result.mode).toBe("fallback");
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
