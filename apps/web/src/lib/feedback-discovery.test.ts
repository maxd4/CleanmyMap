import { describe, expect, it } from "vitest";

import {
  FEEDBACK_DISCOVERY_INTERVAL_MS,
  isFeedbackDiscoveryPathEligible,
  resolveFeedbackDiscoveryVisibility,
  type FeedbackDiscoveryState,
} from "./feedback-discovery";

const NOW = Date.parse("2026-10-16T12:00:00.000Z");

describe("feedback discovery policy", () => {
  it("shows the initial presentation only on an eligible page", () => {
    expect(resolveFeedbackDiscoveryVisibility(null, NOW)).toBe("initial");
    expect(isFeedbackDiscoveryPathEligible("/profil")).toBe(true);
    expect(isFeedbackDiscoveryPathEligible("/onboarding")).toBe(false);
    expect(isFeedbackDiscoveryPathEligible("/sections/feedback?type=bug")).toBe(false);
  });

  it("waits seven days between reminders", () => {
    const state: FeedbackDiscoveryState = {
      firstShownAt: new Date(NOW - FEEDBACK_DISCOVERY_INTERVAL_MS).toISOString(),
      lastShownAt: new Date(NOW - FEEDBACK_DISCOVERY_INTERVAL_MS).toISOString(),
    };

    expect(resolveFeedbackDiscoveryVisibility(state, NOW - 1)).toBe(null);
    expect(resolveFeedbackDiscoveryVisibility(state, NOW)).toBe("reminder");
  });

  it("honors voluntary deactivation", () => {
    expect(
      resolveFeedbackDiscoveryVisibility(
        { firstShownAt: new Date(NOW - FEEDBACK_DISCOVERY_INTERVAL_MS * 2).toISOString(), disabled: true },
        NOW,
      ),
    ).toBe(null);
  });
});
