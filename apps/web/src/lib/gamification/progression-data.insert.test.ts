import { describe, expect, it, vi } from "vitest";
import { insertProgressionEvent } from "./progression-data";

describe("insertProgressionEvent", () => {
  it("returns false on duplicate writes and does not throw", async () => {
    const insert = vi.fn(async () => ({
      error: { code: "23505", message: "duplicate key" },
    }));

    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };

    const inserted = await insertProgressionEvent(supabase, {
      userId: "user-1",
      eventType: "action_declare_validation",
      sourceTable: "actions",
      sourceId: "action-1",
      statusPhase: "validated",
      weight: 1,
      xpBase: 1,
      xpAwarded: 1,
      occurredOn: "2026-01-01",
      metadata: { source: "test" },
    });

    expect(inserted).toBe(false);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
