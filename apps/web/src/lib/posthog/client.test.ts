import { beforeEach, describe, expect, it, vi } from "vitest";

const hasAnalyticsConsentMock = vi.hoisted(() => vi.fn<() => boolean>());
const getPostHogKeyMock = vi.hoisted(() => vi.fn<() => string | null>());
const getPostHogHostMock = vi.hoisted(() => vi.fn<() => string>());
const getPostHogDeprecatedEnvWarningsMock = vi.hoisted(() => vi.fn<() => string[]>());
const posthogInitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsent: hasAnalyticsConsentMock,
}));

vi.mock("@/lib/posthog/config", () => ({
  getPostHogKey: getPostHogKeyMock,
  getPostHogHost: getPostHogHostMock,
  getPostHogDeprecatedEnvWarnings: getPostHogDeprecatedEnvWarningsMock,
}));

vi.mock("posthog-js", () => ({
  default: {
    init: posthogInitMock,
  },
}));

describe("posthog client integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hasAnalyticsConsentMock.mockReturnValue(false);
    getPostHogKeyMock.mockReturnValue("phc_test_key");
    getPostHogHostMock.mockReturnValue("https://eu.i.posthog.com");
    getPostHogDeprecatedEnvWarningsMock.mockReturnValue([]);
  });

  it("does not initialize without analytics consent", async () => {
    const { initPostHogClient } = await import("./client");

    const result = await initPostHogClient();

    expect(result).toBeNull();
    expect(posthogInitMock).not.toHaveBeenCalled();
  });

  it("initializes when consent is present", async () => {
    hasAnalyticsConsentMock.mockReturnValue(true);
    const { initPostHogClient } = await import("./client");

    const result = await initPostHogClient();

    expect(result).toBeDefined();
    expect(posthogInitMock).toHaveBeenCalledTimes(1);
    expect(posthogInitMock).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({
        api_host: "https://eu.i.posthog.com",
        capture_pageview: true,
        capture_pageleave: true,
        respect_dnt: true,
      }),
    );
  });
});
