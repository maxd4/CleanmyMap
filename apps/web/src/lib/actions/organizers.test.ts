import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveActionOrganizers,
  resolveDefaultActionOrganizerIds,
} from "./organizers";

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
        creatorIsAdminLike: true,
      }),
    ).toEqual(["user-admin-1"]);
  });

  it("falls back to the first configured admin id", () => {
    expect(
      resolveDefaultActionOrganizerIds({
        creatorUserId: "user-creator",
        creatorIsAdminLike: false,
      }),
    ).toEqual(["user-admin-1"]);
  });
});
