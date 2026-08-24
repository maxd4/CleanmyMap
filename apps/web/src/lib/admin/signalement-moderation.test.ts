import { describe, expect, it, vi } from "vitest";
import {
  listModeratableSignalements,
  moderateSignalement,
  readSignalementForModeration,
} from "./signalement-moderation";

type Row = Record<string, unknown>;

function makeSupabase(canonicalRows: Row[], legacyRows: Row[]) {
  const rowsByTable = {
    trash_spotter_spots: canonicalRows,
    spots: legacyRows,
  };
  const updateCalls: Array<{ table: string; updates: Row }> = [];
  const fromCalls: string[] = [];
  const insertMocks = {
    trash_spotter_spots: vi.fn(),
    spots: vi.fn(),
  };

  const from = vi.fn((table: keyof typeof rowsByTable) => {
    fromCalls.push(table);
    const rows = rowsByTable[table];
    return {
      select: vi.fn(() => {
        let filtered = rows;
        const query = {
          eq: vi.fn((column: string, value: unknown) => {
            filtered = filtered.filter((row) => row[column] === value);
            return query;
          }),
          order: vi.fn(() => query),
          limit: vi.fn((value: number) => {
            filtered = filtered.slice(0, value);
            return query;
          }),
          maybeSingle: vi.fn(async () => ({
            data: filtered[0] ?? null,
            error: null,
          })),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(
              resolve({ data: filtered, count: rows.length, error: null }),
            ),
        };
        return query;
      }),
      update: vi.fn((updates: Row) => {
        updateCalls.push({ table, updates });
        const query = {
          eq: vi.fn((_column: string, id: unknown) => {
            const row = rows.find((candidate) => candidate.id === id);
            if (row) {
              Object.assign(row, updates);
            }
            return query;
          }),
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: rows[0] ?? null,
              error: null,
            })),
          })),
        };
        return query;
      }),
      insert: insertMocks[table],
    };
  });

  return {
    supabase: { from },
    updateCalls,
    fromCalls,
    insertMocks,
  };
}

function canonicalRow(overrides: Row = {}): Row {
  return {
    id: "canonical-1",
    created_at: "2026-08-25T10:00:00Z",
    created_by_clerk_id: "user-1",
    label: "Nouveau signalement",
    spot_type: "spot",
    latitude: 48.85,
    longitude: 2.35,
    status: "new",
    notes: "note canonique",
    validated_at: null,
    cleaned_at: null,
    ...overrides,
  };
}

function legacyRow(overrides: Row = {}): Row {
  return {
    id: "legacy-1",
    created_at: "2026-08-24T10:00:00Z",
    created_by_clerk_id: "user-2",
    label: "Ancien signalement",
    waste_type: "clean_place",
    latitude: 48.86,
    longitude: 2.36,
    status: "new",
    notes: "note legacy",
    ...overrides,
  };
}

describe("signalement moderation capability", () => {
  it("exposes canonical records in the admin queue before legacy records", async () => {
    const { supabase } = makeSupabase(
      [canonicalRow()],
      [legacyRow({ created_at: "2026-08-23T10:00:00Z" })],
    );

    const result = await listModeratableSignalements(supabase as never, {
      status: "new",
      limit: 6,
    });

    expect(result.count).toBe(2);
    expect(result.items.map((item) => [item.id, item.sourceTable])).toEqual([
      ["canonical-1", "trash_spotter_spots"],
      ["legacy-1", "spots"],
    ]);
    expect(result.items[0]?.spot_type).toBe("spot");
    expect(result.items[0]?.waste_type).toBeNull();
  });

  it("updates canonical status timestamps without confusing spot_type and waste_type", async () => {
    const { supabase, updateCalls } = makeSupabase([canonicalRow()], []);

    const validated = await moderateSignalement(supabase as never, {
      id: "canonical-1",
      status: "validated",
      edits: { label: "Corrige", wasteType: "legacy-value" },
    });

    expect(validated.sourceTable).toBe("trash_spotter_spots");
    expect(updateCalls[0]?.updates).toMatchObject({
      status: "validated",
      label: "Corrige",
      cleaned_at: null,
    });
    expect(updateCalls[0]?.updates.validated_at).toEqual(expect.any(String));
    expect(updateCalls[0]?.updates).not.toHaveProperty("waste_type");
    expect(updateCalls[0]?.updates).not.toHaveProperty("spot_type");

    const cleaned = await moderateSignalement(supabase as never, {
      id: "canonical-1",
      status: "cleaned",
    });
    expect(cleaned.signalement?.status).toBe("cleaned");
    expect(cleaned.signalement?.validated_at).toEqual(expect.any(String));
    expect(cleaned.signalement?.cleaned_at).toEqual(expect.any(String));
  });

  it("falls back explicitly to legacy spots and keeps waste_type on that path", async () => {
    const { supabase, updateCalls, fromCalls, insertMocks } = makeSupabase(
      [],
      [legacyRow()],
    );

    const result = await moderateSignalement(supabase as never, {
      id: "legacy-1",
      status: "validated",
      edits: { wasteType: "spot" },
    });

    expect(result.sourceTable).toBe("spots");
    expect(updateCalls[0]?.table).toBe("spots");
    expect(updateCalls[0]?.updates).toMatchObject({
      status: "validated",
      waste_type: "spot",
    });
    expect(updateCalls[0]?.updates).not.toHaveProperty("spot_type");
    expect(fromCalls).toEqual(["trash_spotter_spots", "spots", "spots"]);
    expect(insertMocks.spots).not.toHaveBeenCalled();
  });

  it("allows an explicit legacy source without probing the canonical record", async () => {
    const { supabase, fromCalls } = makeSupabase([], [legacyRow()]);

    const result = await readSignalementForModeration(
      supabase as never,
      "legacy-1",
      "spots",
    );

    expect(result?.sourceTable).toBe("spots");
    expect(fromCalls).toEqual(["spots"]);
  });
});
