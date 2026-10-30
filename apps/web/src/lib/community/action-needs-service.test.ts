import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchActionRowsMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const loadCanonicalActionOrganizerIdsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store-queries", () => ({ fetchActionRows: fetchActionRowsMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: loadCanonicalActionOrganizerIdsMock }));

import { canManageActionNeed, listActionNeeds } from "./action-needs-service";

const actionId = "11111111-1111-4111-8111-111111111111";
const action = {
  id: actionId,
  created_by_clerk_id: "creator-1",
  action_date: "2099-10-30",
  event_start_time: null,
  action_phase: "pre_action",
  status: "pending",
  moderation_visibility: "visible",
  review_state: "approved",
  published_at: "2026-10-01T08:00:00.000Z",
  access_mode: "public",
  location_label: "Paris",
  preparation_data: { actionTitle: "Action publique" },
};

const openNeed = {
  id: "22222222-2222-4222-8222-222222222222",
  action_id: actionId,
  created_by_clerk_id: "creator-1",
  category: "materiel",
  title: "Gants",
  description: "Prévoir des gants.",
  quantity_label: null,
  expires_at: null,
  status: "open",
  fulfilled_at: null,
  created_at: "2026-10-30T08:00:00.000Z",
  updated_at: "2026-10-30T08:00:00.000Z",
};

function needsQuery(rows: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    then: vi.fn((resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve, reject)),
  };
  return chain;
}

function emptyLookupQuery() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: [], error: null })),
  };
  return chain;
}

function lookupQuery(data: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data, error: null })),
  };
  return chain;
}

describe("action needs service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActionRowsMock.mockResolvedValue([action]);
    loadCanonicalActionOrganizerIdsMock.mockResolvedValue([]);
  });

  it("keeps pending published actions public and filters cancelled needs from that projection", async () => {
    const cancelled = { ...openNeed, id: "33333333-3333-4333-8333-333333333333", status: "cancelled" };
    const client = { from: vi.fn((table: string) => table === "action_needs" ? needsQuery([openNeed, cancelled]) : emptyLookupQuery()) };

    const result = await listActionNeeds(client as never, null, { limit: 20, offset: 0 }, new Date("2026-10-30T10:00:00.000Z"));

    expect(result.items.map((item) => item.id)).toEqual([openNeed.id]);
    expect(result.items[0]?.canManage).toBe(false);
    expect(result.items[0]?.action.title).toBe("Action publique");
  });

  it("derives expiration and applies bounded offset pagination after visibility filtering", async () => {
    const expired = { ...openNeed, id: "33333333-3333-4333-8333-333333333333", expires_at: "2026-10-30T09:00:00.000Z" };
    const client = { from: vi.fn((table: string) => table === "action_needs" ? needsQuery([openNeed, expired]) : emptyLookupQuery()) };

    const expiredPage = await listActionNeeds(client as never, null, { effectiveStatus: "expired", limit: 10, offset: 0 }, new Date("2026-10-30T10:00:00.000Z"));
    expect(expiredPage.items.map((item) => item.id)).toEqual([expired.id]);
    expect(expiredPage.items[0]?.status).toBe("open");

    const secondPage = await listActionNeeds(client as never, null, { limit: 1, offset: 1 }, new Date("2026-10-30T08:00:00.000Z"));
    expect(secondPage.items.map((item) => item.id)).toEqual([expired.id]);
  });

  it("accepts only the creator or persisted canonical organizer", async () => {
    const managedAction = { id: actionId, created_by_clerk_id: "creator-1" };
    expect(await canManageActionNeed({} as never, "creator-1", managedAction)).toBe(true);
    expect(loadCanonicalActionOrganizerIdsMock).not.toHaveBeenCalled();

    loadCanonicalActionOrganizerIdsMock.mockResolvedValue(["coorganizer-1"]);
    expect(await canManageActionNeed({} as never, "coorganizer-1", managedAction)).toBe(true);
    expect(await canManageActionNeed({} as never, "coordinateur-1", managedAction)).toBe(false);
  });

  it("keeps a managed non-public action in the private manager projection", async () => {
    const hiddenAction = { ...action, moderation_visibility: "hidden" };
    fetchActionRowsMock.mockResolvedValue([]);
    loadActionByIdMock.mockResolvedValue(hiddenAction);
    const client = {
      from: vi.fn((table: string) => table === "actions"
        ? lookupQuery([{ id: actionId }])
        : table === "action_needs"
          ? needsQuery([openNeed])
          : emptyLookupQuery()),
    };

    const result = await listActionNeeds(client as never, "creator-1", { limit: 20, offset: 0 }, new Date("2026-10-30T10:00:00.000Z"));

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.canManage).toBe(true);
    expect(result.managerActions[0]?.id).toBe(actionId);
  });
});
