import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const loadActionRegistrationIdsForActionMock = vi.hoisted(() => vi.fn());
const loadManualRegistrationIdsForActionMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/env", () => ({ env: { CLERK_ADMIN_USER_IDS: "" } }));
vi.mock("./registration-records", () => ({
  loadActionRegistrationIdsForAction: loadActionRegistrationIdsForActionMock,
  loadManualRegistrationIdsForAction: loadManualRegistrationIdsForActionMock,
}));

function createSupabaseMock(profileRows: Array<{ id: string; display_name: string; handle: string }>) {
  const deleteMock = vi.fn();
  const insertMock = vi.fn();
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn((field: string, value: string) => {
            if (field === "id") {
              chain.maybeSingle = vi.fn().mockResolvedValue({
                data: profileRows.find((row) => row.id === value) ?? null,
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
      }
      if (table === "action_registrations") {
        const chain = {
          delete: deleteMock.mockImplementation(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn(() => Promise.resolve({ error: null })),
          insert: insertMock.mockResolvedValue({ error: null }),
        };
        return chain;
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;
  return { supabase, deleteMock, insertMock };
}

describe("syncActionManualParticipants", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clerkClientMock.mockResolvedValue({
      users: { getUserList: vi.fn().mockResolvedValue({ data: [] }) },
    });
    loadActionRegistrationIdsForActionMock.mockResolvedValue(["user-existing"]);
    loadManualRegistrationIdsForActionMock.mockResolvedValue(["user-existing"]);
  });

  it("keeps a selected existing manual registration", async () => {
    const { syncActionManualParticipants } = await import("./organizers");
    const { supabase, deleteMock, insertMock } = createSupabaseMock([
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
    expect(deleteMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("does not remove preserved registrations after incomplete resolution", async () => {
    const { syncActionManualParticipants } = await import("./organizers");
    const { supabase, deleteMock, insertMock } = createSupabaseMock([]);

    const result = await syncActionManualParticipants({
      supabase,
      actionId: "action-1",
      creator: { userId: "creator-1", displayName: "Créateur" },
      participantAccounts: ["unknown-account"],
      organizerIds: [],
    });

    expect(result.unresolvedTokens).toEqual(["unknown-account"]);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("deletes a manual registration only when it is explicitly removed", async () => {
    const { syncActionManualParticipants } = await import("./organizers");
    const { supabase, deleteMock } = createSupabaseMock([]);

    await syncActionManualParticipants({
      supabase,
      actionId: "action-1",
      creator: { userId: "creator-1", displayName: "Créateur" },
      participantAccounts: [],
      organizerIds: [],
    });

    expect(deleteMock).toHaveBeenCalled();
  });
});
