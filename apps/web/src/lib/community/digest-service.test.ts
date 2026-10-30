import { describe, expect, it, vi } from "vitest";

const fetchActionRowsMock = vi.hoisted(() => vi.fn());
const isPublishedFuturePreActionMock = vi.hoisted(() => vi.fn());
const isPublicActionReferenceAvailableMock = vi.hoisted(() => vi.fn());
const resolveActionTerritoryDestinationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store-queries", () => ({ fetchActionRows: fetchActionRowsMock }));
vi.mock("@/lib/actions/temporal", () => ({ isPublishedFuturePreAction: isPublishedFuturePreActionMock }));
vi.mock("@/lib/chat/action-sharing", () => ({
  isPublicActionReferenceAvailable: isPublicActionReferenceAvailableMock,
  resolveActionTerritoryDestination: resolveActionTerritoryDestinationMock,
}));
vi.mock("@/lib/community/action-needs-service", () => ({
  ACTION_NEED_SELECT_FIELDS: "id, action_id, created_at",
}));

import {
  buildCommunityDigestItems,
  getDueCommunityDigestPeriods,
  loadPublicCommunityDigestReferences,
  type CommunityDigestReference,
} from "./digest-service";
import type { ActionRow } from "@/types/database";
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

function action(overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id: "action-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-15T12:00:00.000Z",
    created_by_clerk_id: "owner-1",
    action_date: "2026-01-20",
    location_label: "1er arrondissement",
    latitude: null,
    longitude: null,
    derived_geometry_kind: null,
    derived_geometry_geojson: null,
    geometry_confidence: null,
    waste_kg: null,
    cigarette_butts: null,
    volunteers_count: null,
    duration_minutes: 30,
    notes: null,
    status: "approved",
    published_at: "2026-01-08T10:00:00.000Z",
    moderation_visibility: "visible",
    access_mode: "public",
    action_phase: "pre_action",
    preparation_data: null,
    ...overrides,
  } as ActionRow;
}

function needsQuery(data: unknown[], error: { message: string } | null = null) {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => Promise.resolve({ data, error })),
  };
  return query;
}

function digestSupabase(needs: unknown[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "action_needs") throw new Error(`unexpected table ${table}`);
      return needsQuery(needs);
    }),
  } as never;
}

function prepareActionMocks(actions: ActionRow[]) {
  fetchActionRowsMock.mockResolvedValue(actions);
  isPublicActionReferenceAvailableMock.mockReturnValue(true);
  resolveActionTerritoryDestinationMock.mockReturnValue({ zoneName: "1er arrondissement" });
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

  it("uses the first result visibility instead of the older pre-action publication", async () => {
    const resultVisibleAt = "2026-01-15T12:00:00.000Z";
    prepareActionMocks([action({
      action_phase: "post_action_complete",
      published_at: "2026-01-08T10:00:00.000Z",
      results_published_at: resultVisibleAt,
    })]);
    isPublishedFuturePreActionMock.mockReturnValue(false);

    const references = await loadPublicCommunityDigestReferences(
      digestSupabase(),
      [subscription({ topic_id: "results" })],
      [period],
      new Date("2026-01-15T13:00:00.000Z"),
    );

    expect(references).toEqual([expect.objectContaining({ type: "results", visibleAt: resultVisibleAt })]);
  });

  it("does not infer a result novelty date from published_at alone", async () => {
    prepareActionMocks([action({
      action_phase: "post_action_complete",
      published_at: "2026-01-15T12:00:00.000Z",
      results_published_at: null,
    })]);
    isPublishedFuturePreActionMock.mockReturnValue(false);

    const references = await loadPublicCommunityDigestReferences(
      digestSupabase(),
      [subscription({ topic_id: "results" })],
      [period],
      new Date("2026-01-15T13:00:00.000Z"),
    );

    expect(references).toEqual([]);
  });

  it("uses the action's effective visibility for a need created before publication", async () => {
    const effectiveVisibleAt = "2026-01-15T12:00:00.000Z";
    prepareActionMocks([action({
      public_visibility_started_at: effectiveVisibleAt,
      published_at: "2026-01-08T10:00:00.000Z",
    })]);
    isPublishedFuturePreActionMock.mockReturnValue(true);

    const references = await loadPublicCommunityDigestReferences(
      digestSupabase([{
        id: "need-1",
        action_id: "action-1",
        title: "Gants",
        created_at: "2026-01-01T09:00:00.000Z",
        status: "open",
        expires_at: "2026-02-01T00:00:00.000Z",
      }]),
      [subscription({ topic_id: "needs" })],
      [period],
      new Date("2026-01-15T13:00:00.000Z"),
    );

    expect(references).toEqual([expect.objectContaining({ type: "needs", visibleAt: effectiveVisibleAt })]);
  });

  it("does not use updated_at, duplicate a refresh, or reappear outside the period", async () => {
    const approvedAt = "2026-01-15T12:00:00.000Z";
    const result = action({
      action_phase: "post_action_complete",
      published_at: "2026-01-08T10:00:00.000Z",
      results_published_at: approvedAt,
      updated_at: "2026-01-16T12:00:00.000Z",
    });
    prepareActionMocks([result]);
    isPublishedFuturePreActionMock.mockReturnValue(false);

    const firstRefresh = await loadPublicCommunityDigestReferences(
      digestSupabase(),
      [subscription({ topic_id: "results" })],
      [period],
      new Date("2026-01-15T13:00:00.000Z"),
    );
    const repeatedRefresh = await loadPublicCommunityDigestReferences(
      digestSupabase(),
      [subscription({ topic_id: "results" })],
      [period],
      new Date("2026-01-15T14:00:00.000Z"),
    );
    const laterRefresh = await loadPublicCommunityDigestReferences(
      digestSupabase(),
      [subscription({ topic_id: "results" })],
      [{ ...period, periodKey: "2026-01-16", start: new Date("2026-01-16T00:00:00.000Z"), end: new Date("2026-01-17T00:00:00.000Z") }],
      new Date("2026-01-16T13:00:00.000Z"),
    );

    expect(firstRefresh[0]?.visibleAt).toBe(approvedAt);
    expect(repeatedRefresh).toEqual(firstRefresh);
    expect(laterRefresh).toEqual([]);
  });

  it("filters a visible reference outside the digest period", () => {
    expect(buildCommunityDigestItems(
      [reference({ visibleAt: "2026-01-14T23:59:59.000Z" })],
      [subscription()],
      period,
    )).toEqual([]);
  });
});
