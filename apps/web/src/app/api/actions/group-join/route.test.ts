import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/gamification/progression-tracking", () => ({
  refreshProgressionProfile: refreshProgressionProfileMock,
}));

type ActionRow = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  action_phase?: "pre_action" | "post_action_draft" | "post_action_complete";
  notes?: string | null;
};

type ParticipantRow = {
  id: string;
  created_at: string;
  updated_at?: string;
  action_id: string;
  user_id: string;
  joined_at?: string;
  participation_status?: "pending" | "confirmed" | "cancelled";
  participation_source?: "group_form" | "admin" | "import";
};

type ManyResult<T> = {
  data: T[];
  error: null;
};

type SingleResult<T> = {
  data: T | null;
  error: null;
};

type ActionsChain = {
  select: (columns: string) => ActionsChain;
  eq: (field: string, value: string) => ActionsChain;
  in: (field: string, values: string[]) => ActionsChain;
  order: (field: string, options?: { ascending?: boolean }) => ActionsChain;
  limit: (value: number) => Promise<ManyResult<ActionRow>>;
  maybeSingle: () => Promise<SingleResult<ActionRow>>;
  then: (
    resolve: (value: ManyResult<ActionRow>) => void,
    reject: (reason: unknown) => void,
  ) => Promise<void>;
};

type ParticipantsChain = {
  select: (columns: string, options?: { count?: string; head?: boolean }) => ParticipantsChain;
  update: (values: Record<string, unknown>) => ParticipantsChain;
  eq: (field: string, value: string) => ParticipantsChain;
  in: (field: string, values: string[]) => ParticipantsChain;
  order: (field: string, options?: { ascending?: boolean }) => ParticipantsChain;
  limit: (value: number) => Promise<ManyResult<ParticipantRow>>;
  maybeSingle: () => Promise<SingleResult<ParticipantRow>>;
  single: () => Promise<SingleResult<ParticipantRow>>;
  insert: (values: {
    action_id: string;
    user_id: string;
    joined_at?: string;
    participation_status?: "pending" | "confirmed" | "cancelled";
    participation_source?: "group_form" | "admin" | "import";
  }) => ParticipantsChain;
  then: (
    resolve: (value: {
      data: ParticipantRow[] | null;
      count?: number;
      error: null;
    }) => void,
    reject: (reason: unknown) => void,
  ) => Promise<void>;
};

type ProgressionEventsChain = {
  select: (columns: string) => {
    delete: () => Promise<{ error: null }>;
  };
};

function createActionsChain(actions: ActionRow[]): ActionsChain {
  const state: {
    filters: Record<string, string>;
    inFilters: Record<string, string[]>;
    limitValue: number | null;
  } = {
    filters: {},
    inFilters: {},
    limitValue: null,
  };
  const chain: ActionsChain = {
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
      const filtered = actions.filter((action) => {
        if (state.filters.id && action.id !== state.filters.id) {
          return false;
        }
        if (state.filters.status && action.status !== state.filters.status) {
          return false;
        }
        const allowedActionIds = state.inFilters.id;
        if (allowedActionIds && !allowedActionIds.includes(action.id)) {
          return false;
        }
        return true;
      });
      return {
        data: state.limitValue ? filtered.slice(0, state.limitValue) : filtered,
        error: null,
      };
    }),
    maybeSingle: vi.fn(async () => {
      const filtered = actions.filter((action) => {
        if (state.filters.id && action.id !== state.filters.id) {
          return false;
        }
        if (state.filters.status && action.status !== state.filters.status) {
          return false;
        }
        const allowedActionIds = state.inFilters.id;
        if (allowedActionIds && !allowedActionIds.includes(action.id)) {
          return false;
        }
        return true;
      });
      return {
        data: filtered[0] ?? null,
        error: null,
      };
    }),
    then: (resolve: (value: ManyResult<ActionRow>) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({
        data: actions.filter((action) => {
          if (state.filters.id && action.id !== state.filters.id) {
            return false;
          }
          if (state.filters.status && action.status !== state.filters.status) {
            return false;
          }
          const allowedActionIds = state.inFilters.id;
          if (allowedActionIds && !allowedActionIds.includes(action.id)) {
            return false;
          }
          return true;
        }),
        error: null,
      }).then(resolve, reject),
  };

  return chain;
}

function createParticipantsChain(participants: ParticipantRow[]): ParticipantsChain {
  const state: {
    filters: Record<string, string>;
    inFilters: Record<string, string[]>;
    headCount: boolean;
    limitValue: number | null;
    inserting?: ParticipantRow;
    pendingUpdate?: Record<string, unknown>;
  } = {
    filters: {},
    inFilters: {},
    headCount: false,
    limitValue: null,
  };

  const getParticipationStatus = (row: ParticipantRow) => row.participation_status ?? "confirmed";
  const getJoinedAt = (row: ParticipantRow) => row.joined_at ?? row.created_at;
  const normalizeRow = (row: ParticipantRow): ParticipantRow => ({
    ...row,
    joined_at: row.joined_at ?? row.created_at,
    participation_status: row.participation_status ?? "confirmed",
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
        getParticipationStatus(normalized) !== state.filters.participation_status
      ) {
        return false;
      }
      const allowedActionIds = state.inFilters.action_id;
      if (allowedActionIds && !allowedActionIds.includes(normalized.action_id)) {
        return false;
      }
      return true;
    });

  const chain: ParticipantsChain = {
    select: vi.fn((_: string, options?: { count?: string; head?: boolean }) => {
      state.headCount = Boolean(options?.head);
      return chain;
    }),
    update: vi.fn((values: Record<string, unknown>) => {
      state.pendingUpdate = values;
      return chain;
    }),
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
          Object.assign(original!, state.pendingUpdate, {
            updated_at: "2026-06-04T12:00:00Z",
            joined_at:
              typeof state.pendingUpdate.joined_at === "string"
                ? state.pendingUpdate.joined_at
                : getJoinedAt(original),
          });
        }
        state.pendingUpdate = undefined;
        return {
          data: original ? normalizeRow(original) : null,
          error: null,
        };
      }

      const inserted = state.inserting;
      if (inserted) {
        participants.push(inserted);
      }
      state.inserting = undefined;
      return {
        data: inserted ?? null,
        error: null,
      };
    }),
    insert: vi.fn(
      (values: {
        action_id: string;
        user_id: string;
        joined_at?: string;
        participation_status?: "pending" | "confirmed" | "cancelled";
        participation_source?: "group_form" | "admin" | "import";
      }) => {
        const joinedAt = values.joined_at ?? "2026-06-04T12:00:00Z";
        state.inserting = {
          id: `participant-${participants.length + 1}`,
          created_at: joinedAt,
          joined_at: joinedAt,
          participation_status: values.participation_status ?? "confirmed",
          participation_source: values.participation_source ?? "group_form",
          action_id: values.action_id,
          user_id: values.user_id,
        };
        return chain;
      },
    ),
    then: (
      resolve: (value: {
        data: ParticipantRow[] | null;
        count?: number;
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) => {
      const filtered = buildFiltered();
      return Promise.resolve({
        data: state.headCount
          ? null
          : filtered
              .slice(0, state.limitValue ?? filtered.length)
              .map((row) => normalizeRow(row)),
        count: filtered.length,
        error: null,
      }).then(resolve, reject);
    },
  };

  return chain;
}

function createSupabaseMock(params: {
  actions: ActionRow[];
  participants: ParticipantRow[];
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "actions") {
        return createActionsChain(params.actions);
      }
      if (table === "action_participants") {
        return createParticipantsChain(params.participants);
      }
      if (table === "progression_events") {
        return {
          select: vi.fn(() => ({
            delete: vi.fn(async () => ({ error: null })),
          })),
        } as ProgressionEventsChain;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("GET /api/actions/group-join", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("returns approved actions with participation state", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        },
        {
          id: "action-2",
          created_at: "2026-05-02T10:00:00Z",
          action_date: "2026-05-11",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "pending",
        },
      ],
      participants: [
        {
          id: "participant-1",
          created_at: "2026-05-03T10:00:00Z",
          action_id: "action-1",
          user_id: "user-1",
        },
        {
          id: "participant-2",
          created_at: "2026-05-03T11:00:00Z",
          action_id: "action-1",
          user_id: "user-2",
        },
      ],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6"));
    const body = (await response.json()) as {
      authenticated?: boolean;
      count?: number;
      items?: Array<{ id: string; participantsCount: number; joined: boolean }>;
    };

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(body.count).toBe(1);
    expect(body.items?.[0]).toMatchObject({
      id: "action-1",
      participantsCount: 2,
      joined: true,
    });
  }, 15000);

  it("keeps the list available when Clerk auth cannot resolve the session", async () => {
    authMock.mockRejectedValueOnce(new Error("Clerk auth unavailable"));

    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6"));
    const body = (await response.json()) as {
      authenticated?: boolean;
      count?: number;
      items?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(false);
    expect(body.count).toBe(1);
    expect(body.items?.[0]?.id).toBe("action-1");
  }, 15000);

  it("includes approved actions even when the organizer has not opened participation", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-open",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
        {
          id: "action-closed",
          created_at: "2026-05-02T10:00:00Z",
          action_date: "2026-05-09",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "approved",
          notes: appendActionMetadataToNotes("Fermée", { groupJoinEnabled: false }),
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6"));
    const body = (await response.json()) as {
      count?: number;
      items?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.count).toBe(2);
    expect(body.items?.[0]?.id).toBe("action-open");
    expect(body.items?.some((item) => item.id === "action-closed")).toBe(true);
  }, 15000);

  it("prioritizes a requested approved action even when it is outside the default slice", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        },
        {
          id: "action-2",
          created_at: "2026-05-02T10:00:00Z",
          action_date: "2026-05-09",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "approved",
        },
        {
          id: "action-3",
          created_at: "2026-05-03T10:00:00Z",
          action_date: "2026-05-08",
          location_label: "Place Sud",
          volunteers_count: 6,
          duration_minutes: 25,
          status: "approved",
        },
        {
          id: "action-4",
          created_at: "2026-05-04T10:00:00Z",
          action_date: "2026-05-07",
          location_label: "Bois Ouest",
          volunteers_count: 5,
          duration_minutes: 35,
          status: "approved",
        },
        {
          id: "action-5",
          created_at: "2026-05-05T10:00:00Z",
          action_date: "2026-05-06",
          location_label: "Canal",
          volunteers_count: 10,
          duration_minutes: 40,
          status: "approved",
        },
        {
          id: "action-6",
          created_at: "2026-05-06T10:00:00Z",
          action_date: "2026-05-05",
          location_label: "Rive",
          volunteers_count: 9,
          duration_minutes: 20,
          status: "approved",
        },
        {
          id: "action-7",
          created_at: "2026-04-01T10:00:00Z",
          action_date: "2026-04-02",
          location_label: "Zone ciblée",
          volunteers_count: 4,
          duration_minutes: 15,
          status: "approved",
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/group-join?limit=6&actionId=action-7"),
    );
    const body = (await response.json()) as {
      count?: number;
      items?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.count).toBe(6);
    expect(body.items?.[0]?.id).toBe("action-7");
    expect(body.items?.map((item) => item.id)).toContain("action-7");
  }, 15000);

  it("returns a personal history of joined actions for the authenticated user", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-open",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-14",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
        {
          id: "action-closed",
          created_at: "2026-04-01T10:00:00Z",
          action_date: "2026-04-11",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "approved",
          notes: appendActionMetadataToNotes("Fermée", { groupJoinEnabled: false }),
        },
      ],
      participants: [
        {
          id: "participant-1",
          created_at: "2026-05-03T10:00:00Z",
          action_id: "action-open",
          user_id: "user-1",
        },
        {
          id: "participant-2",
          created_at: "2026-04-03T10:00:00Z",
          action_id: "action-closed",
          user_id: "user-1",
        },
      ],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6&historyLimit=8"));
    const body = (await response.json()) as {
      history?: Array<{ id: string; joined: boolean; joinedAt: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.history).toHaveLength(2);
    expect(body.history?.[0]?.id).toBe("action-open");
    expect(body.history?.[0]?.joined).toBe(true);
    expect(body.history?.[1]?.id).toBe("action-closed");
  }, 15000);
});

describe("POST /api/actions/group-join", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("creates a pending request for an approved action form", async () => {
    const participants: ParticipantRow[] = [];
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        },
      ],
      participants,
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-1" }),
      }),
    );
    const body = (await response.json()) as {
      alreadyJoined?: boolean;
      participationStatus?: string;
      participantsCount?: number;
      joinedAt?: string;
    };

    expect(response.status).toBe(200);
    expect(body.alreadyJoined).toBe(false);
    expect(body.participationStatus).toBe("pending");
    expect(body.participantsCount).toBe(0);
    expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

  it("creates a pending request for a pre-action form", async () => {
    const participants: ParticipantRow[] = [];
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-pre",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Préparation",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "pending",
          action_phase: "pre_action",
        },
      ],
      participants,
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-pre" }),
      }),
    );
    const body = (await response.json()) as {
      alreadyJoined?: boolean;
      participationStatus?: string;
      participantsCount?: number;
      joinedAt?: string;
    };

    expect(response.status).toBe(200);
    expect(body.alreadyJoined).toBe(false);
    expect(body.participationStatus).toBe("pending");
    expect(body.participantsCount).toBe(0);
    expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

  it("re-enters a cancelled participation into the waitlist", async () => {
    const participants: ParticipantRow[] = [
      {
        id: "participant-1",
        created_at: "2026-05-03T10:00:00Z",
        joined_at: "2026-05-03T10:00:00Z",
        updated_at: "2026-05-20T10:00:00Z",
        participation_status: "cancelled",
        participation_source: "admin",
        action_id: "action-1",
        user_id: "user-1",
      },
    ];
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        },
      ],
      participants,
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-1" }),
      }),
    );
    const body = (await response.json()) as {
      alreadyJoined?: boolean;
      participationStatus?: string;
      participationSource?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.alreadyJoined).toBe(false);
    expect(body.participationStatus).toBe("pending");
    expect(body.participationSource).toBe("group_form");
    expect(body.participantsCount).toBe(0);
    expect(participants[0]?.participation_status).toBe("pending");
    expect(participants[0]?.participation_source).toBe("group_form");
  });

  it("confirms immediately for admin-like users", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "admin",
    });

    const participants: ParticipantRow[] = [];
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-4",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        },
      ],
      participants,
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-4" }),
      }),
    );

    const body = (await response.json()) as {
      participationStatus?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.participationStatus).toBe("confirmed");
    expect(body.participantsCount).toBe(1);
    expect(refreshProgressionProfileMock).toHaveBeenCalledWith(supabase, "user-1");
  });

  it("rejects joining a pending action", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-2",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "pending",
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-2" }),
      }),
    );

    const body = (await response.json()) as { details?: { actionId?: string[] } };
    expect(response.status).toBe(422);
    expect(body.details?.actionId?.[0]).toContain("validée par un admin");
  });

  it("rejects joining an approved action that is closed by the organizer", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-3",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
          notes: appendActionMetadataToNotes("Fermée", { groupJoinEnabled: false }),
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-3" }),
      }),
    );

    const body = (await response.json()) as { details?: { actionId?: string[] } };
    expect(response.status).toBe(422);
    expect(body.details?.actionId?.[0]).toContain("n'a pas ouvert");
  });

  it("rejects unauthenticated users", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-1" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects Clerk auth failures on POST", async () => {
    authMock.mockRejectedValueOnce(new Error("Clerk auth unavailable"));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-1" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
