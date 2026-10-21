import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const hasAnalyticsConsentMock = vi.hoisted(() => vi.fn());
const subscribeAnalyticsConsentMock = vi.hoisted(() => vi.fn(() => () => undefined));
const optionalAnalyticsEligibilityMock = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsent: hasAnalyticsConsentMock,
  subscribeAnalyticsConsent: subscribeAnalyticsConsentMock,
}));
vi.mock("@/components/posthog-provider", () => ({
  useOptionalAnalyticsEligibility: optionalAnalyticsEligibilityMock,
}));

import { ConditionalAnalytics } from "./conditional-analytics";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  hasAnalyticsConsentMock.mockReset();
  subscribeAnalyticsConsentMock.mockReset();
  optionalAnalyticsEligibilityMock.mockReset();
  optionalAnalyticsEligibilityMock.mockReturnValue(true);
});

describe("ConditionalAnalytics", () => {
  it("renders nothing when analytics consent is missing", () => {
    hasAnalyticsConsentMock.mockReturnValue(false);

    const html = renderToStaticMarkup(<ConditionalAnalytics />);

    expect(html).toBe("");
  });

  it("renders nothing when age eligibility is not available", () => {
    hasAnalyticsConsentMock.mockReturnValue(true);
    optionalAnalyticsEligibilityMock.mockReturnValue(false);

    expect(renderToStaticMarkup(<ConditionalAnalytics />)).toBe("");
  });
});
