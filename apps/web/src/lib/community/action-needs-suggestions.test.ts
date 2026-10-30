import { beforeEach, describe, expect, it, vi } from "vitest";

const loadContextsMock = vi.hoisted(() => vi.fn());
const toItemMock = vi.hoisted(() => vi.fn());

vi.mock("./action-needs-service", () => ({
  ACTION_NEED_SELECT_FIELDS: "action-needs",
  loadActionContexts: loadContextsMock,
  toActionNeedItemForContext: toItemMock,
}));

import { listSuggestedActionNeeds } from "./action-needs-suggestions";

const action = (id: string, locationLabel: string, actionDate: string) => ({
  id,
  location_label: locationLabel,
  action_date: actionDate,
});

const item = (id: string, actionId: string, locationLabel: string, category = "materiel", effectiveStatus = "open") => ({
  id,
  actionId,
  category,
  effectiveStatus,
  status: "open",
  createdAt: "2026-10-30T10:00:00.000Z",
  action: { id: actionId, title: id, actionDate: "2099-10-30", eventStartTime: null, locationLabel },
});

function query(rows: unknown[]) {
  let currentRows = rows as Array<Record<string, unknown>>;
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => chain),
    in: vi.fn((column: string, values: unknown[]) => {
      currentRows = currentRows.filter((row) => values.includes(row[column]));
      return chain;
    }),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    then: vi.fn((resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: currentRows, error: null }).then(resolve, reject)),
  };
  return chain;
}

describe("community need suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadContextsMock.mockResolvedValue({
      contexts: new Map([
        ["action-home", { action: action("action-home", "Paris 10e", "2099-10-30"), canManage: false }],
        ["action-neighbor", { action: action("action-neighbor", "Paris 11e", "2099-10-31"), canManage: false }],
        ["action-other", { action: action("action-other", "Paris 16e", "2099-11-01"), canManage: false }],
      ]),
    });
    toItemMock.mockImplementation((need: { id: string; action_id: string; category: string }, actionValue: { location_label: string }) =>
      item(need.id, need.action_id, actionValue.location_label, need.category));
  });

  it("matches selected categories and orders exact territory, neighbors, then fallback territories", async () => {
    const rows = [
      { id: "need-other", action_id: "action-other", category: "materiel" },
      { id: "need-neighbor", action_id: "action-neighbor", category: "materiel" },
      { id: "need-home", action_id: "action-home", category: "materiel" },
      { id: "need-wrong-category", action_id: "action-home", category: "transport" },
      { id: "need-hidden", action_id: "action-hidden", category: "materiel" },
    ];
    const actionNeeds = query(rows);
    const result = await listSuggestedActionNeeds(
      { from: vi.fn().mockReturnValue(actionNeeds) } as never,
      ["materiel"],
      "Paris 10e",
      10,
      new Date("2026-10-30T12:00:00.000Z"),
    );

    expect(actionNeeds.in).toHaveBeenCalledWith("category", ["materiel"]);
    expect(result.map((entry) => entry.id)).toEqual(["need-home", "need-neighbor", "need-other"]);
  });

  it("uses all matching territories when no preferred territory is available and drops expired projections", async () => {
    toItemMock.mockImplementation((need: { id: string; action_id: string; category: string }, actionValue: { location_label: string }) =>
      item(need.id, need.action_id, actionValue.location_label, need.category, need.id === "expired" ? "expired" : "open"));
    const actionNeeds = query([
      { id: "expired", action_id: "action-home", category: "materiel" },
      { id: "fallback", action_id: "action-other", category: "materiel" },
    ]);

    const result = await listSuggestedActionNeeds(
      { from: vi.fn().mockReturnValue(actionNeeds) } as never,
      ["materiel"],
      null,
      1,
    );

    expect(result.map((entry) => entry.id)).toEqual(["fallback"]);
  });

  it("does not query needs when no skill is selected", async () => {
    const from = vi.fn();

    expect(await listSuggestedActionNeeds({ from } as never, [], null, 20)).toEqual([]);
    expect(loadContextsMock).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
