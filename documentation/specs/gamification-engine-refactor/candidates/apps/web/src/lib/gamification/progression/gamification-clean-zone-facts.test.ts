import { describe, expect, it, vi } from "vitest";
import { loadCleanZoneFacts } from "./gamification-clean-zone-facts";

describe("strict clean-zone reconstruction", () => {
  it("rejects a failed evidence query rather than returning an empty inventory", async () => {
    const query = {
      select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn(), or: vi.fn(), order: vi.fn(), range: vi.fn(),
    };
    for (const method of [query.select, query.eq, query.in, query.not, query.or, query.order]) method.mockReturnValue(query);
    query.range.mockResolvedValue({ data: null, error: { message: "clean zones unavailable" }, count: null });
    await expect(loadCleanZoneFacts({ from: () => query } as never, "user-1"))
      .rejects.toThrow("clean zones unavailable");
  });
});
