import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hasAnalyticsConsentMock = vi.hoisted(() => vi.fn<() => boolean>());
const getPostHogKeyMock = vi.hoisted(() => vi.fn<() => string | null>());
const getPostHogHostMock = vi.hoisted(() => vi.fn<() => string>());
const getPostHogDeprecatedEnvWarningsMock = vi.hoisted(() => vi.fn<() => string[]>());
const posthogInitMock = vi.hoisted(() => vi.fn());
const posthogOptInMock = vi.hoisted(() => vi.fn());
const posthogOptOutMock = vi.hoisted(() => vi.fn());
const posthogResetMock = vi.hoisted(() => vi.fn());

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
    opt_in_capturing: posthogOptInMock,
    opt_out_capturing: posthogOptOutMock,
    reset: posthogResetMock,
  },
}));

describe("posthog client integration", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.resetModules();
    vi.clearAllMocks();
    hasAnalyticsConsentMock.mockReturnValue(false);
    getPostHogKeyMock.mockReturnValue("phc_test_key");
    getPostHogHostMock.mockReturnValue("https://eu.i.posthog.com");
    getPostHogDeprecatedEnvWarningsMock.mockReturnValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
        respect_dnt: true,
      }),
    );
    expect(posthogOptInMock).toHaveBeenCalledWith({ captureEventName: false });
  });

  it("stops capture and resets identity when consent is withdrawn", async () => {
    hasAnalyticsConsentMock.mockReturnValue(true);
    const { disablePostHogClient, initPostHogClient } = await import("./client");

    await initPostHogClient();
    hasAnalyticsConsentMock.mockReturnValue(false);
    await disablePostHogClient();

    expect(posthogResetMock).toHaveBeenCalledWith(true);
    expect(posthogOptOutMock).toHaveBeenCalledTimes(1);
  });

  it("re-enables capture after a new consent", async () => {
    hasAnalyticsConsentMock.mockReturnValue(true);
    const { disablePostHogClient, initPostHogClient } = await import("./client");

    await initPostHogClient();
    hasAnalyticsConsentMock.mockReturnValue(false);
    await disablePostHogClient();
    hasAnalyticsConsentMock.mockReturnValue(true);
    await initPostHogClient();

    expect(posthogOptInMock).toHaveBeenCalledTimes(2);
  });
});
