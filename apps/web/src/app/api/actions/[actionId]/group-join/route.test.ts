import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));

vi.mock("@/lib/gamification/progression-tracking", () => ({
  refreshProgressionProfile: refreshProgressionProfileMock,
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

function createParticipantsChain(participants: {
  id: string;
  created_at: string;
  updated_at?: string;
  action_id: string;
  user_id: string;
  joined_at?: string;
  participation_status?: "pending" | "confirmed" | "cancelled";
  participation_source?: "group_form" | "admin" | "import";
}[]) {
  const state: {
    filters: Record<string, string>;
    inFilters: Record<string, string[]>;
    limitValue: number | null;
    pendingUpdate?: Record<string, unknown>;
  } = {
    filters: {},
    inFilters: {},
    limitValue: null,
  };

  const normalizeRow = (row: (typeof participants)[number]) => ({
    ...row,
    joined_at: row.joined_at ?? row.created_at,
    participation_status: row.participation_status ?? "pending",
    participation_source: row.participation_source ?? "group_form",
  });

  const buildFiltered = () =>
    participants.filter((row) => {
      const normalized = normalizeRow(row);
      if (state.filters.action_id && normalized.action_id !== state.filters.action_id) {
        return false;
      }
      if (state.filters.user_id && normalized.user_id !== state.filters.user_id) {
        return false;
      }
      if (
        state.filters.participation_status &&
        normalized.participation_status !== state.filters.participation_status
      ) {
        return false;
      }
      const allowedActionIds = state.inFilters.action_id;
      if (allowedActionIds && !allowedActionIds.includes(normalized.action_id)) {
        return false;
      }
      const allowedUserIds = state.inFilters.user_id;
      if (allowedUserIds && !allowedUserIds.includes(normalized.user_id)) {
        return false;
      }
      return true;
    });

  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: string) => {
      state.filters[field] = value;
      return chain;
    }),
    in: vi.fn((field: string, values: string[]) => {
      state.inFilters[field] = values;
      return chain;
    }),
    order: vi.fn(() => chain),
    limit: vi.fn(async (limit: number) => {
      state.limitValue = limit;
      const filtered = buildFiltered();
      return {
        data: filtered.slice(0, limit).map((row) => normalizeRow(row)),
        error: null,
      };
    }),
    maybeSingle: vi.fn(async () => {
      const filtered = buildFiltered();
      return {
        data: filtered[0] ? normalizeRow(filtered[0]) : null,
        error: null,
      };
    }),
    update: vi.fn((values: Record<string, unknown>) => {
      state.pendingUpdate = values;
      return chain;
    }),
    single: vi.fn(async () => {
      if (state.pendingUpdate) {
        const original = participants.find((row) => {
          const normalized = normalizeRow(row);
          if (state.filters.action_id && normalized.action_id !== state.filters.action_id) {
            return false;
          }
          if (state.filters.user_id && normalized.user_id !== state.filters.user_id) {
            return false;
          }
          return true;
        }) ?? null;
        if (original) {
          Object.assign(original, state.pendingUpdate, {
            updated_at: "2026-06-04T12:00:00Z",
            joined_at:
              typeof state.pendingUpdate.joined_at === "string"
                ? state.pendingUpdate.joined_at
                : original.joined_at ?? original.created_at,
          });
        }
        state.pendingUpdate = undefined;
        return {
          data: original ? normalizeRow(original) : null,
          error: null,
        };
      }

      const filtered = buildFiltered();
      return {
        data: filtered[0] ? normalizeRow(filtered[0]) : null,
        error: null,
      };
    }),
    then: (resolve: (value: any) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({
        data: buildFiltered()
          .slice(0, state.limitValue ?? undefined)
          .map((row) => normalizeRow(row)),
        error: null,
      }).then(resolve, reject),
  };

  return chain;
}

function createProfilesChain(profiles: { id: string; display_name: string | null; handle: string | null }[]) {
  const state: {
    inFilters: Record<string, string[]>;
  } = {
    inFilters: {},
  };

  const chain: any = {
    select: vi.fn(() => chain),
    in: vi.fn((field: string, values: string[]) => {
      state.inFilters[field] = values;
      return chain;
    }),
    then: (resolve: (value: any) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({
        data: profiles.filter((profile) => {
          const allowedIds = state.inFilters.id;
          if (allowedIds && !allowedIds.includes(profile.id)) {
            return false;
          }
          return true;
        }),
        error: null,
      }).then(resolve, reject),
  };

  return chain;
}

function createSupabaseMock(params: {
  action: {
    id: string;
    created_by_clerk_id: string | null;
    status: "pending" | "approved" | "rejected";
    notes: string | null;
  };
  participants?: {
    id: string;
    created_at: string;
    updated_at?: string;
    action_id: string;
    user_id: string;
    joined_at?: string;
    participation_status?: "pending" | "confirmed" | "cancelled";
    participation_source?: "group_form" | "admin" | "import";
  }[];
  profiles?: { id: string; display_name: string | null; handle: string | null }[];
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "actions") {
        return createActionsChain(params.action);
      }
      if (table === "action_participants") {
        return createParticipantsChain(params.participants ?? []);
      }
      if (table === "profiles") {
        return createProfilesChain(params.profiles ?? []);
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
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    getSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        action: {
          id: "action-1",
          created_by_clerk_id: "user-1",
          status: "approved",
          notes: appendActionMetadataToNotes("Observation", {
            groupJoinEnabled: true,
          }),
        },
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
        action: {
          id: "action-1",
          created_by_clerk_id: "user-1",
          status: "approved",
          notes: appendActionMetadataToNotes("Observation", {
            groupJoinEnabled: false,
          }),
        },
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

  it("lets an admin close an older group form even without organizer rows", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    getSupabaseServerClientMock.mockReturnValueOnce(
      createSupabaseMock({
        action: {
          id: "action-old",
          created_by_clerk_id: "system:google_sheet_sync",
          status: "approved",
          notes: appendActionMetadataToNotes("Historique", {
            groupJoinEnabled: true,
          }),
        },
      }),
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-old/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-old" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      groupJoinEnabled?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.groupJoinEnabled).toBe(false);
    expect(loadActionOrganizerIdsForActionMock).not.toHaveBeenCalled();
  }, 15000);

  it("rejects users that are not organizers", async () => {
    authMock.mockResolvedValueOnce({ userId: "user-3" });
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
        action: {
          id: "action-2",
          created_by_clerk_id: "user-1",
          status: "pending",
          notes: appendActionMetadataToNotes("Observation", {
            groupJoinEnabled: true,
          }),
        },
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

describe("GET /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("returns pending requests for the creator", async () => {
    const participants = [
      {
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        participation_status: "pending" as const,
        participation_source: "group_form" as const,
        action_id: "action-1",
        user_id: "user-2",
      },
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        action: {
          id: "action-1",
          created_by_clerk_id: "user-1",
          status: "approved",
          notes: appendActionMetadataToNotes("Observation", {
            groupJoinEnabled: true,
          }),
        },
        participants,
        profiles: [
          {
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          },
        ],
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/action-1/group-join"),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      count?: number;
      pendingRequests?: Array<{ id?: string; displayName?: string }>;
      canReview?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.count).toBe(1);
    expect(body.canReview).toBe(true);
    expect(body.pendingRequests?.[0]?.id).toBe("participant-1");
    expect(body.pendingRequests?.[0]?.displayName).toBe("Alice");
  });

  it("returns public pending requests even for anonymous visitors", async () => {
    authMock.mockResolvedValue({ userId: null });
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    getSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        action: {
          id: "action-1",
          created_by_clerk_id: "user-1",
          status: "approved",
          notes: appendActionMetadataToNotes("Observation", {
            groupJoinEnabled: true,
          }),
        },
        participants: [
          {
            id: "participant-1",
            created_at: "2026-06-01T10:00:00Z",
            joined_at: "2026-06-01T10:00:00Z",
            participation_status: "pending" as const,
            participation_source: "group_form" as const,
            action_id: "action-1",
            user_id: "user-2",
          },
        ],
        profiles: [
          {
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          },
        ],
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/action-1/group-join"),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      count?: number;
      pendingRequests?: Array<{ id?: string; displayName?: string }>;
      canReview?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.count).toBe(1);
    expect(body.canReview).toBe(false);
    expect(body.pendingRequests?.[0]?.id).toBe("participant-1");
    expect(body.pendingRequests?.[0]?.displayName).toBe("Alice");
  });
});

describe("POST /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("accepts a pending request", async () => {
    const participants = [
      {
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        participation_status: "pending" as const,
        participation_source: "group_form" as const,
        action_id: "action-1",
        user_id: "user-2",
      },
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        action: {
          id: "action-1",
          created_by_clerk_id: "user-1",
          status: "approved",
          notes: appendActionMetadataToNotes("Observation", {
            groupJoinEnabled: true,
          }),
        },
        participants,
        profiles: [
          {
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          },
        ],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantId: "participant-1",
          decision: "accept",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      participationStatus?: string;
      participationSource?: string;
      participantId?: string;
    };

    expect(response.status).toBe(200);
    expect(body.participantId).toBe("participant-1");
    expect(body.participationStatus).toBe("confirmed");
    expect(body.participationSource).toBe("group_form");
    expect(participants[0]?.participation_status).toBe("confirmed");
    expect(refreshProgressionProfileMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-2",
    );
  });
});
