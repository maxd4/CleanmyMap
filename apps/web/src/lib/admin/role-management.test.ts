import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getManagedRoleAccountById,
  listManagedRoleAccounts,
  searchManagedRoleAccounts,
} from "./role-management";

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
  in: ReturnType<typeof vi.fn>;
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

function createProfilesChain(options: {
  rows?: unknown[];
  single?: unknown;
  error?: { message: string } | null;
} = {}) {
  let queryField: string | null = null;
  let queryValue: string | null = null;
  const chain = {} as Partial<ProfilesChain>;

  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
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
  chain.limit = vi.fn(async () => ({ data: options.rows ?? [], error: options.error ?? null }));
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
    data: options.single === undefined ? resolveMatchingRow() : options.single,
    error: options.error ?? null,
  }));
  chain.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
    reject?: (reason?: unknown) => unknown,
    ) =>
    Promise.resolve({
      data: options.rows ?? (resolveMatchingRow() ? [resolveMatchingRow()] : []),
      error: options.error ?? null,
    }).then(resolve, reject);

  return chain as ProfilesChain;
}

describe("searchManagedRoleAccounts", () => {
  afterEach(() => {
    ilikeCalls.length = 0;
    orCalls.length = 0;
    fromMock.mockReset();
  });

  it("returns exact matches without falling back to fuzzy search", async () => {
    fromMock.mockImplementation(() => createProfilesChain());

    const results = await searchManagedRoleAccounts("user-1");

    expect(results).toHaveLength(1);
    expect(results[0]?.userId).toBe("user-1");
    expect(ilikeCalls).toHaveLength(0);
    expect(orCalls).toHaveLength(0);
  });

  it("escapes fuzzy filters, deduplicates exact matches, and normalizes account data", async () => {
    let call = 0;
    fromMock.mockImplementation(() => {
      call += 1;
      return createProfilesChain(call === 3 ? {
        rows: [
          { id: "user-2", display_name: " Bob ", handle: " bob ", avatar_url: " ", role_label: "unknown", paris_arrondissement: "12", updated_at: "2026-10-12" },
          { id: "user-2", display_name: "Bob duplicate", handle: "bob", avatar_url: null, role_label: "admin", paris_arrondissement: 12, updated_at: null },
        ],
      } : {});
    });

    const results = await searchManagedRoleAccounts("  50%_\\  ");

    expect(results).toEqual([expect.objectContaining({
      userId: "user-2",
      displayName: "Bob",
      handle: "bob",
      avatarUrl: null,
      roleLabel: "benevole",
      parisArrondissement: null,
    })]);
    expect(orCalls).toEqual(["handle.ilike.%50\\%\\_\\\\%,display_name.ilike.%50\\%\\_\\\\%"]);
  });

  it("returns an empty result without querying for blank input or dependency errors", async () => {
    fromMock.mockImplementation(() => createProfilesChain({ error: { message: "profile read failed" } }));

    await expect(searchManagedRoleAccounts("   ")).resolves.toEqual([]);
    await expect(listManagedRoleAccounts()).resolves.toEqual([]);
    await expect(getManagedRoleAccountById("user-9")).resolves.toBeNull();
  });

  it("lists normalized managed accounts and preserves a readable account lookup", async () => {
    fromMock.mockImplementation((table: string) => table === "profiles"
      ? createProfilesChain({
          rows: [{ id: "user-4", display_name: null, handle: null, avatar_url: "avatar", role_label: "elu", paris_arrondissement: 4, updated_at: "2026-10-12" }],
          single: { id: "user-4", display_name: "Eva", handle: "eva", avatar_url: null, role_label: "elu", paris_arrondissement: 4, updated_at: "2026-10-12" },
        })
      : createProfilesChain());

    await expect(listManagedRoleAccounts()).resolves.toEqual([expect.objectContaining({
      userId: "user-4",
      displayName: "Membre",
      roleLabel: "elu",
      parisArrondissement: 4,
    })]);
    await expect(getManagedRoleAccountById("user-4")).resolves.toEqual(expect.objectContaining({
      userId: "user-4",
      displayName: "Eva",
      roleLabel: "elu",
    }));
  });
});
