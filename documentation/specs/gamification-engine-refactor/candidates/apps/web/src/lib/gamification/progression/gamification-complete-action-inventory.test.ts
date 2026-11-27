import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { loadActionRowsForUser } from "./progression-action-queries";

const spontaneous = appendActionMetadataToNotes("", { associationName: "Action spontanée" });
function fixture(missingRelated = false) {
  const owned = [
    { id: "owned", created_by_clerk_id: "user-1", notes: spontaneous },
    { id: "other-owner", created_by_clerk_id: "user-1", notes: "" },
  ];
  const organized = missingRelated ? [] : [{ id: "organized", created_by_clerk_id: "user-2", notes: "" }];
  const from = vi.fn((table: string) => {
    let related = false;
    const query = {
      select: () => query,
      eq: () => query,
      in: () => { related = true; return query; },
      order: () => query,
      range: async (offset: number) => {
        const rows = table === "action_organizers"
          ? [{ id: "relation", action_id: "organized" }]
          : related ? organized : owned;
        return { data: rows.slice(offset, offset + 1), error: null, count: rows.length };
      },
    };
    return query;
  });
  return { from };
}

describe("complete action inventory for reconstruction", () => {
  it("reads all rows even with a server cap of one and preserves CURRENT ownership", async () => {
    const result = await loadActionRowsForUser(fixture() as never, "user-1", { complete: true });
    expect(result.map((row) => row.id)).toEqual(["organized", "owned"]);
  });

  it("rejects a missing action behind an organizer relation", async () => {
    await expect(loadActionRowsForUser(fixture(true) as never, "user-1", { complete: true }))
      .rejects.toThrow("missing related action");
  });
});
