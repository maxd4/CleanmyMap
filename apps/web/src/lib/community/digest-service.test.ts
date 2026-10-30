import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/store-queries", () => ({ fetchActionRows: vi.fn() }));
vi.mock("@/lib/actions/temporal", () => ({ isPublishedFuturePreAction: vi.fn() }));
vi.mock("@/lib/chat/action-sharing", () => ({
  isPublicActionReferenceAvailable: vi.fn(),
  resolveActionTerritoryDestination: vi.fn(),
}));
vi.mock("@/lib/community/action-needs-service", () => ({
  ACTION_NEED_SELECT_FIELDS: "id, action_id, created_at",
}));

import {
  buildCommunityDigestItems,
  getDueCommunityDigestPeriods,
  type CommunityDigestReference,
} from "./digest-service";
import type { CommunitySubscriptionRow } from "./subscriptions";

const period = {
  cadence: "daily" as const,
  periodKey: "2026-01-15",
  start: new Date("2026-01-15T00:00:00.000Z"),
  end: new Date("2026-01-16T00:00:00.000Z"),
};

function subscription(
  overrides: Partial<CommunitySubscriptionRow> = {},
): CommunitySubscriptionRow {
  return {
    id: "subscription-1",
    user_id: "user-1",
    kind: "topic",
    territory_zone_name: null,
    topic_id: "future_actions",
    cadence: "daily",
    enabled: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function reference(overrides: Partial<CommunityDigestReference> = {}): CommunityDigestReference {
  return {
    type: "future_actions",
    id: "action-1",
    actionId: "action-1",
    title: "Action publique",
    actionDate: "2026-01-20",
    locationLabel: "1er arrondissement",
    territoryZoneName: "1er arrondissement",
    visibleAt: "2026-01-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("community digest selection", () => {
  it("matches topics without adding an implicit territorial restriction", () => {
    const items = buildCommunityDigestItems(
      [reference({ territoryZoneName: null }), reference({ id: "action-2", locationLabel: "Lyon" })],
      [subscription({ topic_id: "future_actions" })],
      period,
    );
    expect(items.map((item) => item.id)).toEqual(["action-1", "action-2"]);
  });

  it("matches a territory and its canonical neighbors", () => {
    const items = buildCommunityDigestItems(
      [reference({ id: "local", territoryZoneName: "1er arrondissement" }), reference({ id: "neighbor", territoryZoneName: "2e arrondissement" }), reference({ id: "other", territoryZoneName: "Rueil-Malmaison" })],
      [subscription({ kind: "territory", topic_id: null, territory_zone_name: "1er arrondissement" })],
      period,
    );
    expect(items.map((item) => item.id)).toEqual(["local", "neighbor"]);
  });

  it("deduplicates references across subscriptions and caps the payload at ten", () => {
    const references = Array.from({ length: 11 }, (_, index) => reference({ id: `action-${index}`, visibleAt: `2026-01-15T12:${String(index).padStart(2, "0")}:00.000Z` }));
    const items = buildCommunityDigestItems(
      [references[0], ...references],
      [subscription(), subscription({ id: "subscription-2", topic_id: "future_actions" })],
      period,
    );
    expect(items).toHaveLength(10);
    expect(new Set(items.map((item) => `${item.type}:${item.id}`)).size).toBe(10);
  });

  it("only creates due periods for enabled cadences", () => {
    const periods = getDueCommunityDigestPeriods([
      subscription({ cadence: "weekly" }),
      subscription({ id: "disabled", enabled: false, cadence: "daily" }),
    ], new Date("2026-01-15T12:00:00.000Z"));
    expect(periods.map((item) => item.cadence)).toEqual(["weekly"]);
  });
});
