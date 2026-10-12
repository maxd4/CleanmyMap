import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadPublishedSpogomiGalleryForAction } from "./photo-gallery-service";

function createSupabase(action: Record<string, unknown>) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: action, error: null });
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle,
  };
  return { from: vi.fn(() => query) } as never;
}

describe("SPOGOMI gallery publication service", () => {
  it("requires the associated action to be publicly published", async () => {
    const supabase = createSupabase({
      id: "action-1",
      status: "pending",
      published_at: null,
      moderation_visibility: "visible",
      preparation_data: { spogomiGallery: [] },
    });
    await expect(loadPublishedSpogomiGalleryForAction({ supabase, actionId: "action-1" })).resolves.toEqual([]);
  });
});
