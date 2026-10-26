import { describe, expect, it } from "vitest";
import {
  broadcastGamificationAnnouncement,
  resolveGamificationAnnouncement,
} from "./announcements";

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

  it("covers each CURRENT typed announcement and its deterministic dedupe key", () => {
    const cases = [
      [
        { type: "participant_tier_unlocked", tierId: "participant-10", xpAwarded: "2" },
        { tone: "actions", dedupeKey: "participant_tier_unlocked:participant-10", message: "participant-10 est débloqué côté participation. +2 XP." },
      ],
      [
        { type: "form_tier_unlocked", tierId: "form-10", xp: -1 },
        { tone: "forms", dedupeKey: "form_tier_unlocked:form-10", message: "form-10 est débloqué pour les formulaires. -1 XP." },
      ],
      [
        { type: "clean_zone_task_awarded", sourceTable: "clean_zones", sourceId: "zone-1", xp: 4 },
        { tone: "clean-zones", dedupeKey: "clean_zone_task_awarded:clean_zones:zone-1", message: "+4 XP" },
      ],
      [
        { type: "first_trace_utile_unlocked", badgeId: "trace-1", xpAwarded: 3 },
        { tone: "actions", dedupeKey: "first_trace_utile_unlocked:trace-1", message: "trace-1 est désormais visible. +3 XP." },
      ],
      [
        { type: "level_up", userId: "user-1", newLevel: "4" },
        { tone: "generic", dedupeKey: "level_up:user-1:4", message: "Vous avez atteint le niveau 4." },
      ],
      [
        { type: "referral_invite_awarded", userId: "user-1", xp: 2 },
        { tone: "generic", dedupeKey: "referral_invite_awarded:user-1", message: "+2 XP" },
      ],
      [
        { type: "xp_awarded", userId: "user-1", sourceId: "event-1", xpAwarded: "5" },
        { tone: "generic", dedupeKey: "xp_awarded:user-1:event-1", message: "+5 XP" },
      ],
    ] as const;

    for (const [input, expected] of cases) {
      expect(resolveGamificationAnnouncement(input)).toEqual(expect.objectContaining(expected));
    }
  });

  it("keeps fallbacks safe for incomplete, unknown and malformed events", () => {
    expect(resolveGamificationAnnouncement(null)).toBeNull();
    expect(resolveGamificationAnnouncement({})).toBeNull();
    expect(resolveGamificationAnnouncement({ type: "unknown", title: "Titre", message: "Message" }))
      .toEqual(expect.objectContaining({ title: "Titre", message: "Message", tone: "generic" }));
    expect(resolveGamificationAnnouncement({ type: "unknown" })).toBeNull();
    expect(resolveGamificationAnnouncement({ type: "level_up", userId: "user-1", newLevel: "nope" }))
      .toEqual(expect.objectContaining({ dedupeKey: "level_up", message: "Vous avez atteint le niveau suivant." }));
    expect(resolveGamificationAnnouncement({ type: "xp_awarded", xp: "invalid" }))
      .toEqual(expect.objectContaining({ dedupeKey: "xp_awarded", message: "Des points d'expérience ont été attribués." }));
  });

  it("preserves explicit presentation fields while deriving source and dedupe fallbacks", () => {
    expect(resolveGamificationAnnouncement({
      type: "tier_unlocked",
      tierId: "tier-1",
      title: "Titre personnalisé",
      message: "Message personnalisé",
      icon: "custom-icon",
      source: "server",
      dedupeKey: "ignored-by-typed-key",
    })).toEqual(expect.objectContaining({
      title: "Titre personnalisé",
      message: "Message personnalisé",
      icon: "custom-icon",
      source: "server",
      dedupeKey: "tier_unlocked:tier-1",
    }));
    expect(resolveGamificationAnnouncement({ title: "Titre", message: "Message", dedupeKey: "custom" }))
      .toEqual(expect.objectContaining({ dedupeKey: "custom", source: "realtime" }));
  });

  it("returns the delivery outcome for the realtime broadcast RPC", async () => {
    const success = { rpc: async () => ({ error: null }) };
    const failure = { rpc: async () => ({ error: { message: "down" } }) };
    const thrown = { rpc: async () => { throw new Error("network"); } };

    await expect(broadcastGamificationAnnouncement(success as never, { type: "xp_awarded" })).resolves.toBe(true);
    await expect(broadcastGamificationAnnouncement(failure as never, { type: "xp_awarded" })).resolves.toBe(false);
    await expect(broadcastGamificationAnnouncement(thrown as never, { type: "xp_awarded" })).resolves.toBe(false);
  });
});
