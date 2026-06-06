import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));

function createActionsChain(action: {
  id: string;
  created_by_clerk_id: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
}) {
  const state = {
    notes: action.notes,
  };

  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: action.id,
        created_by_clerk_id: action.created_by_clerk_id,
        status: action.status,
        notes: state.notes,
      },
      error: null,
    })),
    update: vi.fn((payload: { notes: string | null }) => {
      state.notes = payload.notes;
      return chain;
    }),
    single: vi.fn(async () => ({
      data: {
        id: action.id,
        notes: state.notes,
      },
      error: null,
    })),
  };

  return chain;
}

function createSupabaseMock(action: {
  id: string;
  created_by_clerk_id: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "actions") {
        return createActionsChain(action);
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("PATCH /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    getSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        id: "action-1",
        created_by_clerk_id: "user-1",
        status: "approved",
        notes: appendActionMetadataToNotes("Observation", {
          groupJoinEnabled: true,
        }),
      }),
    );
  });

  it("lets the organizer close the group form after publication", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      groupJoinEnabled?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.groupJoinEnabled).toBe(false);
  }, 15000);

  it("lets the organizer reopen the group form", async () => {
    getSupabaseServerClientMock.mockReturnValueOnce(
      createSupabaseMock({
        id: "action-1",
        created_by_clerk_id: "user-1",
        status: "approved",
        notes: appendActionMetadataToNotes("Observation", {
          groupJoinEnabled: false,
        }),
      }),
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: true }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      groupJoinEnabled?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.groupJoinEnabled).toBe(true);
  }, 15000);

  it("rejects users that are not organizers", async () => {
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce(["user-2"]);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(403);
  }, 15000);

  it("rejects updates on pending actions", async () => {
    getSupabaseServerClientMock.mockReturnValueOnce(
      createSupabaseMock({
        id: "action-2",
        created_by_clerk_id: "user-1",
        status: "pending",
        notes: appendActionMetadataToNotes("Observation", {
          groupJoinEnabled: true,
        }),
      }),
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-2/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-2" }) },
    );

    expect(response.status).toBe(422);
  }, 15000);
});
