import { describe, expect, it, vi } from "vitest";
import {
  listModeratableSignalements,
  moderateSignalement,
  readSignalementForModeration,
} from "./signalement-moderation";

type Row = Record<string, unknown>;

function makeSupabase(canonicalRows: Row[]) {
  const updateCalls: Array<{ table: string; updates: Row }> = [];
  const fromCalls: string[] = [];

  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const rows = table === "trash_spotter_spots" ? canonicalRows : [];
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
    };
  });

  return { supabase: { from }, updateCalls, fromCalls };
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

describe("signalement moderation capability", () => {
  it("lists canonical records once and never probes public.spots", async () => {
    const { supabase, fromCalls } = makeSupabase([canonicalRow()]);

    const result = await listModeratableSignalements(supabase as never, {
      status: "new",
      limit: 6,
    });

    expect(result.count).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "canonical-1",
      sourceTable: "trash_spotter_spots",
      spot_type: "spot",
    });
    expect(fromCalls).toEqual(["trash_spotter_spots"]);
  });

  it("updates canonical status timestamps without a legacy waste_type", async () => {
    const { supabase, updateCalls } = makeSupabase([canonicalRow()]);

    const validated = await moderateSignalement(supabase as never, {
      id: "canonical-1",
      status: "validated",
      edits: { label: "Corrige", spotType: "clean_place" },
    });

    expect(validated.sourceTable).toBe("trash_spotter_spots");
    expect(updateCalls[0]?.table).toBe("trash_spotter_spots");
    expect(updateCalls[0]?.updates).toMatchObject({
      status: "validated",
      label: "Corrige",
      cleaned_at: null,
    });
    expect(updateCalls[0]?.updates.validated_at).toEqual(expect.any(String));
    expect(updateCalls[0]?.updates).not.toHaveProperty("waste_type");
    expect(updateCalls[0]?.updates).toHaveProperty("spot_type", "clean_place");

    const cleaned = await moderateSignalement(supabase as never, {
      id: "canonical-1",
      status: "cleaned",
    });
    expect(cleaned.signalement?.status).toBe("cleaned");
    expect(cleaned.signalement?.validated_at).toEqual(expect.any(String));
    expect(cleaned.signalement?.cleaned_at).toEqual(expect.any(String));
  });

  it("reads only the canonical table for a moderation lookup", async () => {
    const { supabase, fromCalls } = makeSupabase([canonicalRow()]);

    const result = await readSignalementForModeration(
      supabase as never,
      "canonical-1",
    );

    expect(result?.sourceTable).toBe("trash_spotter_spots");
    expect(fromCalls).toEqual(["trash_spotter_spots"]);
  });
});
