import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchActions } from "./store";

function makeRow(index: number) {
  return {
    id: `capped-action-${index}`,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: null,
    created_by_clerk_id: "user-1",
    actor_name: "Test",
    action_date: "2026-01-02",
    location_label: "Parc",
    latitude: null,
    longitude: null,
    waste_kg: 1,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 30,
    notes: null,
    status: "approved",
    published_at: "2026-01-03T00:00:00.000Z",
    moderation_visibility: "visible",
    action_phase: "post_action_complete",
    preparation_data: {},
  };
}

describe("large action source queries", () => {
  it("does not infer completeness from a short page when the server cap is lower than requested", async () => {
    const rangeCalls: unknown[][] = [];
    const pages = [
      Array.from({ length: 500 }, (_, index) => makeRow(index)),
      Array.from({ length: 500 }, (_, index) => makeRow(index + 500)),
      Array.from({ length: 500 }, (_, index) => makeRow(index + 1000)),
      Array.from({ length: 500 }, (_, index) => makeRow(index + 1500)),
      [makeRow(2000)],
    ];
    let pageIndex = 0;
    const query = {
      select: () => query,
      order: () => query,
      range: (...args: unknown[]) => {
        rangeCalls.push(args);
        return query;
      },
      limit: () => query,
      eq: () => query,
      or: () => query,
      gte: () => query,
      lt: () => query,
      not: () => query,
      then: (resolve: (value: unknown) => void) =>
        resolve({ data: pages[pageIndex++] ?? [], error: null }),
    };

    const rows = await fetchActions({ from: () => query } as never, {
      limit: 2001,
      status: "approved",
      requireCoordinates: false,
    });

    expect(rows).toHaveLength(2001);
    expect(rangeCalls).toEqual([
      [0, 999],
      [500, 1499],
      [1000, 1999],
      [1500, 2000],
      [2000, 2000],
    ]);
  });

  it("applies the exclusive action-date upper boundary", async () => {
    const gteCalls: unknown[][] = [];
    const ltCalls: unknown[][] = [];
    const query = {
      select: () => query,
      order: () => query,
      limit: () => query,
      eq: () => query,
      or: () => query,
      gte: (...args: unknown[]) => {
        gteCalls.push(args);
        return query;
      },
      lt: (...args: unknown[]) => {
        ltCalls.push(args);
        return query;
      },
      not: () => query,
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    };

    await fetchActions({ from: () => query } as never, {
      limit: 10,
      status: null,
      floorDate: "2026-05-01",
      ceilingDate: "2026-06-01",
      requireCoordinates: false,
    });

    expect(gteCalls).toContainEqual(["action_date", "2026-05-01"]);
    expect(ltCalls).toContainEqual(["action_date", "2026-06-01"]);
  });
});
