import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const hasAnalyticsConsentMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsent: hasAnalyticsConsentMock,
}));

import { ConditionalAnalytics } from "./conditional-analytics";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  hasAnalyticsConsentMock.mockReset();
});

describe("ConditionalAnalytics", () => {
  it("renders nothing when analytics consent is missing", () => {
    hasAnalyticsConsentMock.mockReturnValue(false);

    const html = renderToStaticMarkup(<ConditionalAnalytics />);

    expect(html).toBe("");
  });
});
