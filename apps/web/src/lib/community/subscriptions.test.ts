import { describe, expect, it } from "vitest";
import {
  COMMUNITY_SUBSCRIPTION_CADENCES,
  COMMUNITY_SUBSCRIPTION_KINDS,
  COMMUNITY_SUBSCRIPTION_TOPIC_IDS,
  normalizeCommunitySubscriptionTarget,
  normalizeCommunityTerritory,
} from "./subscriptions";

describe("community subscription targets", () => {
  it("keeps the subscription vocabulary closed and canonical", () => {
    expect(COMMUNITY_SUBSCRIPTION_KINDS).toEqual(["territory", "topic"]);
    expect(COMMUNITY_SUBSCRIPTION_TOPIC_IDS).toEqual(["future_actions", "needs", "results"]);
    expect(COMMUNITY_SUBSCRIPTION_CADENCES).toEqual(["daily", "weekly"]);
  });

  it("normalizes a canonical territory without inventing a second name", () => {
    expect(normalizeCommunityTerritory("  Paris 1ER ")).toBe("1er arrondissement");
    expect(normalizeCommunityTerritory("territoire imaginaire")).toBeNull();
  });

  it("requires exactly one valid target", () => {
    expect(normalizeCommunitySubscriptionTarget({
      kind: "territory",
      territoryZoneName: "Paris 1er",
      topicId: null,
    })).toEqual({ ok: true, kind: "territory", territoryZoneName: "1er arrondissement", topicId: null });
    expect(normalizeCommunitySubscriptionTarget({
      kind: "topic",
      topicId: "needs",
      territoryZoneName: null,
    })).toEqual({ ok: true, kind: "topic", territoryZoneName: null, topicId: "needs" });
    expect(normalizeCommunitySubscriptionTarget({
      kind: "territory",
      territoryZoneName: "1er arrondissement",
      topicId: "needs",
    })).toEqual({ ok: false, error: "invalid_target" });
    expect(normalizeCommunitySubscriptionTarget({
      kind: "topic",
      topicId: "needs",
      territoryZoneName: "1er arrondissement",
    })).toEqual({ ok: false, error: "invalid_target" });
  });
});
