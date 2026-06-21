import { describe, expect, it } from "vitest";
import { resolveGamificationAnnouncement } from "./announcements";

describe("gamification announcements", () => {
  it("normalizes explorer tier unlocks into a celebration payload", () => {
    const payload = resolveGamificationAnnouncement({
      type: "tier_unlocked",
      userId: "user-1",
      tierId: "explorer-sentinelle",
      title: "Sentinelle",
    });

    expect(payload).toEqual(
      expect.objectContaining({
        title: "Sentinelle",
        message: "Le palier Sentinelle est débloqué.",
        tone: "explorer",
        icon: "✨",
        source: "realtime",
        dedupeKey: "tier_unlocked:explorer-sentinelle",
      }),
    );
  });

  it("normalizes bonus unlocks with the amount included in the message", () => {
    const payload = resolveGamificationAnnouncement({
      type: "form_bonus_unlocked",
      userId: "user-1",
      bonus: 10,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        title: "Bonus de formulaires débloqué",
        message: "+10 XP",
        tone: "forms",
        icon: "✨",
        dedupeKey: "form_bonus_unlocked:10",
      }),
    );
  });

  it("passes through custom title and message when the payload is already human readable", () => {
    const payload = resolveGamificationAnnouncement({
      title: "Gain XP",
      message: "Vous avez gagné 3 XP.",
      source: "custom",
    });

    expect(payload).toEqual(
      expect.objectContaining({
        title: "Gain XP",
        message: "Vous avez gagné 3 XP.",
        source: "custom",
      }),
    );
  });
});
