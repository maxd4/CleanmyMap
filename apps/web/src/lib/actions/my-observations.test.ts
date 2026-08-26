import { describe, expect, it, vi } from "vitest";
import {
  clampMyObservationsLimit,
  listMyObservations,
  MY_OBSERVATIONS_DEFAULT_LIMIT,
  MY_OBSERVATIONS_MAX_LIMIT,
} from "./my-observations";

function makeQuery(rows: unknown[]) {
  const query = {
    select: vi.fn((columns?: string) => {
      void columns;
      return query;
    }),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve, reject),
  };
  return query;
}

function makeSupabase(rows: unknown[]) {
  const query = makeQuery(rows);
  return { from: vi.fn(() => query), query };
}

const rows = [
  {
    id: "spot-1",
    created_at: "2026-08-26T10:00:00Z",
    spot_type: "spot",
    label: "Quai de Seine",
    status: "new",
    latitude: 48.85,
    longitude: 2.35,
    validated_at: null,
    cleaned_at: null,
    notes: "internal note must not be returned",
  },
  {
    id: "clean-1",
    created_at: "2026-08-25T10:00:00Z",
    spot_type: "clean_place",
    label: "Place propre",
    status: "cleaned",
    latitude: 48.86,
    longitude: 2.36,
    validated_at: "2026-08-25T11:00:00Z",
    cleaned_at: "2026-08-26T09:00:00Z",
  },
];

describe("my observations owner read", () => {
  it("bounds the default and requested limits", () => {
    expect(clampMyObservationsLimit(undefined)).toBe(MY_OBSERVATIONS_DEFAULT_LIMIT);
    expect(clampMyObservationsLimit(999)).toBe(MY_OBSERVATIONS_MAX_LIMIT);
    expect(clampMyObservationsLimit(0)).toBe(1);
    expect(clampMyObservationsLimit(Number.NaN)).toBe(MY_OBSERVATIONS_DEFAULT_LIMIT);
  });

  it("queries only the authenticated owner and canonical Trash Spotter states", async () => {
    const supabase = makeSupabase(rows);
    const items = await listMyObservations(supabase as never, { userId: " owner-1 " });
    const query = supabase.query;

    expect(supabase.from).toHaveBeenCalledWith("trash_spotter_spots");
    expect(query.eq).toHaveBeenCalledWith("created_by_clerk_id", "owner-1");
    expect(query.in).toHaveBeenCalledWith("spot_type", ["spot", "clean_place"]);
    expect(query.in).toHaveBeenCalledWith("status", ["new", "validated", "cleaned"]);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(MY_OBSERVATIONS_DEFAULT_LIMIT);
    expect(query.select.mock.calls[0]?.[0]).not.toContain("notes");
    expect(items).toEqual([
      {
        id: "spot-1",
        createdAt: "2026-08-26T10:00:00Z",
        type: "spot",
        label: "Quai de Seine",
        status: "new",
        latitude: 48.85,
        longitude: 2.35,
        validatedAt: null,
        cleanedAt: null,
      },
      {
        id: "clean-1",
        createdAt: "2026-08-25T10:00:00Z",
        type: "clean_place",
        label: "Place propre",
        status: "cleaned",
        latitude: 48.86,
        longitude: 2.36,
        validatedAt: "2026-08-25T11:00:00Z",
        cleanedAt: "2026-08-26T09:00:00Z",
      },
    ]);
  });

  it("applies the bounded maximum without widening the owner filter", async () => {
    const supabase = makeSupabase([]);
    await listMyObservations(supabase as never, { userId: "owner-1", limit: 500 });

    expect(supabase.query.limit).toHaveBeenCalledWith(MY_OBSERVATIONS_MAX_LIMIT);
    expect(supabase.query.eq).toHaveBeenCalledWith("created_by_clerk_id", "owner-1");
  });
});
