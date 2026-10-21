import { beforeEach, describe, expect, it, vi } from "vitest";

const getPostHogKeyMock = vi.hoisted(() => vi.fn<() => string | null>());
const getPostHogHostMock = vi.hoisted(() => vi.fn<() => string>());
const getPostHogDeprecatedEnvWarningsMock = vi.hoisted(() => vi.fn<() => string[]>());

const captureMock = vi.hoisted(() => vi.fn());
const shutdownMock = vi.hoisted(() => vi.fn(async () => {}));
const postHogCtorMock = vi.hoisted(() =>
  vi.fn(
    class MockPostHog {
      capture = captureMock;
      shutdown = shutdownMock;
    },
  ),
);

vi.mock("@/lib/posthog/config", () => ({
  getPostHogKey: getPostHogKeyMock,
  getPostHogHost: getPostHogHostMock,
  getPostHogDeprecatedEnvWarnings: getPostHogDeprecatedEnvWarningsMock,
}));

vi.mock("posthog-node", () => ({
  PostHog: postHogCtorMock,
}));

describe("posthog server integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPostHogKeyMock.mockReturnValue("phc_test_key");
    getPostHogHostMock.mockReturnValue("https://eu.i.posthog.com");
    getPostHogDeprecatedEnvWarningsMock.mockReturnValue([]);
  });

  it("captures a server event and flushes immediately", async () => {
    const { trackServerEvent } = await import("./server");

    const result = await trackServerEvent("user_123", "spot_created", {
      location: "France",
      email: "personne@example.com",
      has_spot_label: true,
    }, {
      consentGranted: true,
    });

    expect(result).toBe(true);
    expect(postHogCtorMock).toHaveBeenCalledWith("phc_test_key", {
      host: "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "user_123",
      event: "spot_created",
        properties: expect.objectContaining({ has_spot_label: true }),
      }),
    );
    expect(captureMock.mock.calls[0]?.[0]?.properties).not.toHaveProperty(
      "location",
    );
    expect(captureMock.mock.calls[0]?.[0]?.properties).not.toHaveProperty(
      "email",
    );
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when PostHog is not configured", async () => {
    getPostHogKeyMock.mockReturnValue(null);
    const { trackServerEvent } = await import("./server");

    const result = await trackServerEvent("user_123", "spot_created", {
      location: "France",
    }, {
      consentGranted: true,
    });

    expect(result).toBe(false);
    expect(postHogCtorMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("is a safe no-op when analytics consent is missing", async () => {
    const { trackServerEvent } = await import("./server");

    const result = await trackServerEvent("user_123", "spot_created", {
      location: "France",
    });

    expect(result).toBe(false);
    expect(postHogCtorMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("does not send events outside the explicit server allowlist", async () => {
    const { trackServerEvent } = await import("./server");

    const result = await trackServerEvent(
      "user_123",
      "arbitrary_event",
      {},
      { consentGranted: true },
    );

    expect(result).toBe(false);
    expect(postHogCtorMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });
});
