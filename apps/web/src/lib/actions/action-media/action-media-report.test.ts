import { describe, expect, it, vi } from "vitest";
import { loadActionMediaReportReadiness } from "./action-media-report";

function makeQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    eq: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

describe("action media report readiness", () => {
  it("reads only ready action ids and never exposes private media objects", async () => {
    const query = makeQuery({
      data: [
        { action_id: "a1", created_by_clerk_id: "user-1" },
        { action_id: "a1", created_by_clerk_id: "user-1" },
        { action_id: "a2", created_by_clerk_id: "user-1" },
      ],
      error: null,
    });
    const supabase = { from: vi.fn(() => query) };

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1", "a2", "a1"], "user-1");

    expect(supabase.from).toHaveBeenCalledWith("action_media");
    expect(query.select).toHaveBeenCalledWith("action_id, created_by_clerk_id");
    expect(query.in).toHaveBeenCalledWith("action_id", ["a1", "a2"]);
    expect(query.eq).toHaveBeenCalledWith("upload_state", "ready");
    expect(result.availability).toBe("available");
    expect(result.readyCountByActionId).toEqual(new Map([["a1", 2], ["a2", 1]]));
  });

  it("refuses to expose readiness when a ready row belongs to another reader", async () => {
    const query = makeQuery({
      data: [{ action_id: "third-party-action", created_by_clerk_id: "other-user" }],
      error: null,
    });

    const result = await loadActionMediaReportReadiness(
      { from: vi.fn(() => query) } as never,
      ["third-party-action"],
      "user-1",
    );

    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it("returns unavailable without turning pending or failed rows into evidence", async () => {
    const query = makeQuery({ data: null, error: new Error("RLS or source unavailable") });
    const result = await loadActionMediaReportReadiness(
      { from: vi.fn(() => query) } as never,
      ["a1"],
    );

    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });
});
