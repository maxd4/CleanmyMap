import { describe, expect, it } from "vitest";
import {
  getCommunityEventNotificationTargets,
  isProfileEligibleForCommunityEvent,
} from "./event-notification-targets";

describe("event-notification-targets", () => {
  it("returns nearby arrondissements and suburbs for a border district", () => {
    const targets = getCommunityEventNotificationTargets("15e arrondissement");
    expect(targets?.arrondissementIds).toEqual([15, 6, 7, 14, 16]);
    expect(targets?.zoneNames).toEqual(
      expect.arrayContaining([
        "Issy-les-Moulineaux",
        "Vanves",
        "Malakoff",
        "Boulogne-Billancourt",
      ]),
    );
  });

  it("matches nearby commune profiles by zone name", () => {
    const targets = getCommunityEventNotificationTargets("15e arrondissement");
    expect(
      isProfileEligibleForCommunityEvent(
        { paris_arrondissement: null, metadata: { zoneName: "Vanves" } },
        targets!,
      ),
    ).toBe(true);
  });

  it("matches arrondissement profiles for commune events when neighbor arrondissements exist", () => {
    const targets = getCommunityEventNotificationTargets("Boulogne-Billancourt");
    expect(targets?.arrondissementIds).toEqual(
      expect.arrayContaining([15, 16]),
    );
    expect(
      isProfileEligibleForCommunityEvent(
        { paris_arrondissement: 16, metadata: null },
        targets!,
      ),
    ).toBe(true);
  });
});
