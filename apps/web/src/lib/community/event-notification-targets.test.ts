import { describe, expect, it, vi } from "vitest";
import {
  getCommunityEventNotificationTargets,
  loadCommunityEventNotificationProfiles,
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

  it("does not treat a non-Paris arrondissement label as Paris territory", () => {
    expect(getCommunityEventNotificationTargets("Lyon 2e")).toBeNull();
  });

  it("loads only targeted community profiles through the RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          id: "profile-1",
          paris_arrondissement: 15,
          metadata: { zoneName: "Vanves" },
        },
      ],
      error: null,
    }));
    const supabase = { rpc } as never;
    const targets = getCommunityEventNotificationTargets("15e arrondissement");

    const profiles = await loadCommunityEventNotificationProfiles(supabase, {
      excludedProfileId: "organizer-1",
      targets: targets!,
    });

    expect(rpc).toHaveBeenCalledWith(
      "load_community_event_notification_profiles",
      {
        p_excluded_profile_id: "organizer-1",
        p_arrondissement_ids: [15, 6, 7, 14, 16],
        p_zone_names: expect.arrayContaining([
          "Issy-les-Moulineaux",
          "Vanves",
          "Malakoff",
          "Boulogne-Billancourt",
        ]),
      },
    );
    expect(profiles).toEqual([
      {
        id: "profile-1",
        paris_arrondissement: 15,
        metadata: { zoneName: "Vanves" },
      },
    ]);
  });
});
