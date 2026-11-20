import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const clerkClientMock = vi.hoisted(() => vi.fn());
const clerkGetUserListMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { CLERK_IMU_OWNER_USER_ID: "" } }));

function createSupabaseMock(profileRows: Array<{ id: string; display_name: string; handle: string }>) {
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const supabase = {
    rpc: rpcMock,
    from: vi.fn((table: string) => {
      if (table !== "public_profiles") throw new Error(`Unexpected table ${table}`);
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn((field: string, value: string) => {
          if (field === "id" || field === "handle") {
            chain.maybeSingle = vi.fn().mockResolvedValue({
              data: profileRows.find((row) => (field === "id" ? row.id : row.handle) === value) ?? null,
              error: null,
            });
          }
          return chain;
        }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        ilike: vi.fn(() => chain),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      return chain;
    }),
  } as unknown as SupabaseClient;
  return { supabase, rpcMock };
}

describe("syncActionManualParticipants", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clerkGetUserListMock.mockReset().mockImplementation(async ({ userId }: { userId?: string[] }) => ({
      data: (userId ?? []).map((id) => ({
        id,
        username: null,
        firstName: null,
        lastName: null,
        publicMetadata: {},
        emailAddresses: [],
      })),
    }));
    clerkClientMock.mockResolvedValue({ users: { getUserList: clerkGetUserListMock } });
  });

  it("sends a fully resolved participant set through one atomic RPC", async () => {
    const { syncActionManualParticipants } = await import("./organizers");
    const { supabase, rpcMock } = createSupabaseMock([
      { id: "user-existing", display_name: "Membre conservé", handle: "conserve" },
    ]);

    const result = await syncActionManualParticipants({
      supabase,
      actionId: "action-1",
      creator: { userId: "creator-1", displayName: "Créateur" },
      participantAccounts: ["user-existing"],
      organizerIds: [],
    });

    expect(result.unresolvedTokens).toEqual([]);
    expect(result.participants.map((participant) => participant.userId)).toEqual(["user-existing"]);
    expect(rpcMock).toHaveBeenCalledWith("sync_action_manual_participants", {
      p_action_id: "action-1",
      p_participant_user_ids: ["user-existing"],
    });
  });

  it("does not call the mutation when account resolution is incomplete", async () => {
    const { syncActionManualParticipants } = await import("./organizers");
    const { supabase, rpcMock } = createSupabaseMock([]);

    const result = await syncActionManualParticipants({
      supabase,
      actionId: "action-1",
      creator: { userId: "creator-1", displayName: "Créateur" },
      participantAccounts: ["unknown-account"],
      organizerIds: [],
    });

    expect(result.unresolvedTokens).toEqual(["unknown-account"]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("does not persist a direct participant ID whose Clerk metadata marks it as E2E", async () => {
    clerkGetUserListMock.mockImplementationOnce(async ({ userId }: { userId?: string[] }) => ({
      data: (userId ?? []).map((id) => ({
        id,
        username: null,
        firstName: null,
        lastName: null,
        publicMetadata: { cleanmymapE2E: true },
        emailAddresses: [],
      })),
    }));
    const { syncActionManualParticipants } = await import("./organizers");
    const { supabase, rpcMock } = createSupabaseMock([
      { id: "e2e-user", display_name: "Test", handle: "test" },
    ]);

    const result = await syncActionManualParticipants({
      supabase,
      actionId: "action-1",
      creator: { userId: "creator-1", displayName: "Créateur" },
      participantAccounts: ["e2e-user"],
      organizerIds: [],
    });

    expect(result.participants).toEqual([]);
    expect(result.unresolvedTokens).toEqual(["e2e-user"]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("does not persist when Clerk cannot verify selected participants", async () => {
    clerkGetUserListMock.mockRejectedValueOnce(new Error("Clerk unavailable"));
    const { syncActionManualParticipants } = await import("./organizers");
    const { supabase, rpcMock } = createSupabaseMock([
      { id: "unverified-user", display_name: "Profil", handle: "profil" },
    ]);

    await expect(syncActionManualParticipants({
      supabase,
      actionId: "action-1",
      creator: { userId: "creator-1", displayName: "Créateur" },
      participantAccounts: ["unverified-user"],
      organizerIds: [],
    })).rejects.toThrow("Clerk unavailable");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("surfaces a recipient refusal as a validation error instead of reactivating it", async () => {
    const { persistManualParticipantDiff, ManualParticipantSyncValidationError } =
      await import("./manual-participant-sync");
    const { supabase, rpcMock } = createSupabaseMock([]);
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "manual invitation was rejected by recipient: user-1" },
    });

    await expect(persistManualParticipantDiff({
      supabase,
      actionId: "action-1",
      participants: [{ userId: "user-1" }],
    })).rejects.toBeInstanceOf(ManualParticipantSyncValidationError);
  });

  it("keeps accepted registrations under an ordinary save", async () => {
    const { supabase, rpcMock } = createSupabaseMock([]);
    const { persistManualParticipantDiff } = await import("./manual-participant-sync");

    await persistManualParticipantDiff({
      supabase,
      actionId: "action-1",
      participants: [],
    });

    expect(rpcMock).toHaveBeenCalledWith("sync_action_manual_participants", {
      p_action_id: "action-1",
      p_participant_user_ids: [],
    });
  });
});
