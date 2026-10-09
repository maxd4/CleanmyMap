import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadCanonicalActionOrganizerIdsForAction,
  resolveActionOrganizers,
  resolveDefaultActionOrganizerIds,
} from "./organizers";
import { syncActionOrganizers } from "./organizer-sync";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    CLERK_ADMIN_USER_IDS: "user-admin-1,user-admin-2",
  },
}));

function createSupabaseMock(profileRows: Array<{ id: string; display_name: string | null; handle: string | null }>) {
  const state: { eq: Record<string, string> } = { eq: {} };

  type ProfilesChain = {
    select: (columns: string) => ProfilesChain;
    eq: (field: string, value: string) => ProfilesChain;
    ilike: (field: string, value: string) => ProfilesChain;
    maybeSingle: () => Promise<{
      data: { id: string; display_name: string | null; handle: string | null } | null;
      error: null;
    }>;
  };

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: string) => {
      state.eq[field] = value;
      return chain;
    }),
    ilike: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => {
      const id = state.eq["id"];
      if (id) {
        const row = profileRows.find((profile) => profile.id === id);
        return { data: row ?? null, error: null };
      }
      const handle = state.eq["handle"];
      if (handle) {
        const row = profileRows.find((profile) => profile.handle === handle);
        return { data: row ?? null, error: null };
      }
      return { data: null, error: null };
    }),
  } as ProfilesChain;

  return {
    from: vi.fn((table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table ${table}`);
      }
      state.eq = {};
      return chain;
    }),
  } as unknown as SupabaseClient;
}

describe("resolveActionOrganizers", () => {
  it("does not add the creator automatically for non-spontaneous actions", async () => {
    const supabase = createSupabaseMock([
      {
        id: "user-organizer",
        display_name: "Organisateur explicite",
        handle: "orga",
      },
    ]);

    const result = await resolveActionOrganizers({
      supabase,
      creator: {
        userId: "user-creator",
        displayName: "Déclarant",
        handle: "declarant",
        username: "declarant",
        email: "declarant@example.org",
      },
      organizerAccounts: ["user-organizer"],
      includeCreatorAsPrimary: false,
    });

    expect(result.unresolvedTokens).toEqual([]);
    expect(result.organizers).toHaveLength(1);
    expect(result.organizers[0]).toMatchObject({
      userId: "user-organizer",
      displayName: "Organisateur explicite",
      isPrimary: true,
    });
  });

  it("adds the creator automatically for spontaneous actions", async () => {
    const supabase = createSupabaseMock([]);

    const result = await resolveActionOrganizers({
      supabase,
      creator: {
        userId: "user-creator",
        displayName: "Déclarant",
        handle: "declarant",
        username: "declarant",
        email: "declarant@example.org",
      },
      organizerAccounts: [],
      includeCreatorAsPrimary: true,
    });

    expect(result.unresolvedTokens).toEqual([]);
    expect(result.organizers).toHaveLength(1);
    expect(result.organizers[0]).toMatchObject({
      userId: "user-creator",
      displayName: "Déclarant",
      isPrimary: true,
    });
  });
});

describe("resolveDefaultActionOrganizerIds", () => {
  it("uses the current creator when they are admin-like", () => {
    expect(
      resolveDefaultActionOrganizerIds({
        creatorUserId: "user-admin-1",
        creatorIsGlobalAdmin: true,
      }),
    ).toEqual(["user-admin-1"]);
  });

  it("falls back to the first configured admin id", () => {
    expect(
      resolveDefaultActionOrganizerIds({
        creatorUserId: "user-creator",
        creatorIsGlobalAdmin: false,
      }),
    ).toEqual(["user-admin-1"]);
  });
});

describe("loadCanonicalActionOrganizerIdsForAction", () => {
  function createOrganizerRelationQuery(
    data: Array<{ organizer_clerk_id: string }>,
  ) {
    const relationQuery = {
      select: vi.fn(() => relationQuery),
      eq: vi.fn(() => relationQuery),
      order: vi
        .fn()
        .mockImplementationOnce(() => relationQuery)
        .mockResolvedValueOnce({ data, error: null }),
    };
    return relationQuery;
  }

  it("returns only persisted organizer relations, even when an admin allowlist exists", async () => {
    const relationQuery = createOrganizerRelationQuery([
      { organizer_clerk_id: " organizer-1 " },
      { organizer_clerk_id: "organizer-1" },
    ]);
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe("action_organizers");
        return relationQuery;
      }),
    } as unknown as SupabaseClient;

    await expect(
      loadCanonicalActionOrganizerIdsForAction(supabase, "action-1"),
    ).resolves.toEqual(["organizer-1"]);
  });

  it("preserves an absent relation instead of inventing an admin or creator organizer", async () => {
    const relationQuery = createOrganizerRelationQuery([]);
    const supabase = {
      from: vi.fn(() => relationQuery),
    } as unknown as SupabaseClient;

    await expect(
      loadCanonicalActionOrganizerIdsForAction(supabase, "action-without-organizer"),
    ).resolves.toEqual([]);
  });
});

describe("syncActionOrganizers", () => {
  it("persists the selected CleanMyMap account ids by canonical id", async () => {
    const insertedRows: Array<Record<string, unknown>> = [];
    const currentRows = [
      {
        action_id: "action-1",
        organizer_clerk_id: "user-old",
        organizer_label: "Ancien organisateur",
        organizer_handle: "ancien",
        is_primary: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          const profileChain = {
            select: vi.fn(() => profileChain),
            eq: vi.fn((field: string, value: string) => {
              if (field === "id") {
                profileChain.maybeSingle = vi.fn().mockResolvedValue({
                  data: value === "user-new"
                    ? { id: "user-new", display_name: "Nouvel organisateur", handle: "nouveau" }
                    : null,
                  error: null,
                });
              }
              return profileChain;
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            ilike: vi.fn(() => profileChain),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
          return profileChain;
        }
        if (table === "action_organizers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn()
                  .mockImplementationOnce(() => ({
                    order: vi.fn().mockResolvedValue({ data: currentRows, error: null }),
                  })),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
            insert: vi.fn((rows: Array<Record<string, unknown>>) => {
              insertedRows.push(...rows);
              return Promise.resolve({ error: null });
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    } as unknown as SupabaseClient;

    const result = await syncActionOrganizers({
      supabase,
      actionId: "action-1",
      creator: {
        userId: "user-creator",
        displayName: "Déclarant",
        handle: "declarant",
        username: "declarant",
        email: "declarant@example.org",
      },
      organizerAccounts: ["@user-new", "user-new"],
    });

    expect(result.unresolvedTokens).toEqual([]);
    expect(result.organizers.map((organizer) => organizer.userId)).toEqual(["user-new"]);
    expect(insertedRows).toEqual([
      expect.objectContaining({
        action_id: "action-1",
        organizer_clerk_id: "user-new",
        organizer_label: "Nouvel organisateur",
        is_primary: true,
      }),
    ]);
  });
});
