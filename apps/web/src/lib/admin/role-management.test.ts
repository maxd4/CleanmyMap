import { describe, expect, it, vi } from "vitest";
import { searchManagedRoleAccounts } from "./role-management";

const fromMock = vi.hoisted(() => vi.fn());
const ilikeCalls = vi.hoisted(() => [] as Array<{ field: string; value: string }>);
const orCalls = vi.hoisted(() => [] as string[]);

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    from: fromMock,
  }),
}));

type ProfilesChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
    reject?: (reason?: unknown) => unknown,
  ) => Promise<unknown>;
};

function createProfilesChain() {
  let queryField: string | null = null;
  let queryValue: string | null = null;
  const chain = {} as Partial<ProfilesChain>;

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn((field: string, value: string) => {
    queryField = field;
    queryValue = value;
    return chain;
  });
  chain.ilike = vi.fn((field: string, value: string) => {
    queryField = field;
    queryValue = value;
    ilikeCalls.push({ field, value });
    return chain;
  });
  chain.or = vi.fn((value: string) => {
    orCalls.push(value);
    return chain;
  });
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(async () => ({ data: [], error: null }));
  const resolveMatchingRow = () =>
    queryField === "id" && queryValue === "user-1"
      ? {
          id: "user-1",
          display_name: "Alice",
          handle: "alice",
          avatar_url: null,
          role_label: "admin",
          paris_arrondissement: null,
          updated_at: null,
        }
      : null;
  chain.maybeSingle = vi.fn(async () => ({
    data: resolveMatchingRow(),
    error: null,
  }));
  chain.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
    reject?: (reason?: unknown) => unknown,
    ) =>
    Promise.resolve({
      data: resolveMatchingRow() ? [resolveMatchingRow()] : [],
      error: null,
    }).then(resolve, reject);

  return chain as ProfilesChain;
}

describe("searchManagedRoleAccounts", () => {
  it("returns exact matches without falling back to fuzzy search", async () => {
    fromMock.mockImplementation(() => createProfilesChain());

    const results = await searchManagedRoleAccounts("user-1");

    expect(results).toHaveLength(1);
    expect(results[0]?.userId).toBe("user-1");
    expect(ilikeCalls).toHaveLength(0);
    expect(orCalls).toHaveLength(0);
  });
});
