import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatUserRow } from "./user-search";

const getVerifiedNonE2EClerkUserIdsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/e2e-account-server", () => ({
  getVerifiedNonE2EClerkUserIds: getVerifiedNonE2EClerkUserIdsMock,
}));

function makeSupabase(rows: ChatUserRow[]) {
  const ranges: Array<[number, number]> = [];
  const supabase = {
    from: vi.fn(() => {
      const filters: Array<{ column: string; value: string; pattern?: boolean }> = [];
      let range: [number, number] = [0, 9];
      const query: Record<string, unknown> = {
        select: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn((from: number, to: number) => {
          range = [from, to];
          ranges.push(range);
          return query;
        }),
        eq: vi.fn((column: string, value: string) => {
          filters.push({ column, value });
          return query;
        }),
        ilike: vi.fn((column: string, value: string) => {
          filters.push({ column, value, pattern: true });
          return query;
        }),
        then: (resolve: (value: { data: ChatUserRow[]; error: null }) => unknown) => {
          const matchingRows = filters.some((filter) => filter.column === "id")
            ? []
            : rows;
          return Promise.resolve({
            data: matchingRows.slice(range[0], range[1] + 1),
            error: null,
          }).then(resolve);
        },
      };
      return query;
    }),
  };
  return { supabase, ranges };
}

describe("fetchCachedChatUsers bounded E2E filtering", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getVerifiedNonE2EClerkUserIdsMock.mockImplementation(async (ids: string[]) =>
      new Set(ids.filter((id) => !id.startsWith("e2e-"))),
    );
  });

  it("continues past ten consecutive E2E matches and returns sorted real accounts", async () => {
    const rows: ChatUserRow[] = [
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `e2e-${String(index).padStart(2, "0")}`,
        handle: `search-e2e-${String(index).padStart(2, "0")}`,
        display_name: `A Test ${String(index).padStart(2, "0")}`,
        avatar_url: null,
      })),
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `real-${String(index).padStart(2, "0")}`,
        handle: `search-real-${String(index).padStart(2, "0")}`,
        display_name: `B Real ${String(index).padStart(2, "0")}`,
        avatar_url: null,
      })),
    ];
    const { supabase, ranges } = makeSupabase(rows);
    const { fetchCachedChatUsers } = await import("./user-search");

    const result = await fetchCachedChatUsers("viewer", "search", supabase as never);

    expect(result.map((user) => user.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `real-${String(index).padStart(2, "0")}`),
    );
    expect(getVerifiedNonE2EClerkUserIdsMock).toHaveBeenCalledTimes(2);
    expect(getVerifiedNonE2EClerkUserIdsMock.mock.calls.map(([ids]) => ids)).toEqual([
      Array.from({ length: 10 }, (_, index) => `e2e-${String(index).padStart(2, "0")}`),
      Array.from({ length: 10 }, (_, index) => `real-${String(index).padStart(2, "0")}`),
    ]);
    expect(ranges).toContainEqual([10, 19]);
  });

  it("returns no unverified profiles when a grouped Clerk lookup fails", async () => {
    const { supabase } = makeSupabase([
      { id: "candidate", handle: "candidate", display_name: "Candidate", avatar_url: null },
    ]);
    getVerifiedNonE2EClerkUserIdsMock.mockRejectedValue(new Error("Clerk unavailable"));
    const { fetchCachedChatUsers } = await import("./user-search");

    await expect(fetchCachedChatUsers("viewer", "", supabase as never))
      .rejects.toThrow("Clerk unavailable");
  });
});
