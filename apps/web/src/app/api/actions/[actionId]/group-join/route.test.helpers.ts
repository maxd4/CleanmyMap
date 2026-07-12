import { vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());
const appendActionModerationAuditMock = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/actions/moderation-audit", () => ({
  appendActionModerationAudit: appendActionModerationAuditMock,
  normalizeModerationReason: (value: unknown, options?: { required?: boolean }) => {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim();
    if (!normalized || (options?.required && normalized.length < 5)) {
      return null;
    }
    return normalized;
  },
}));

export type GroupJoinActionRow = {
  id: string;
  created_by_clerk_id: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
};

export type GroupJoinParticipantRow = {
  id: string;
  created_at: string;
  updated_at?: string;
  action_id: string;
  user_id: string;
  joined_at?: string;
  participation_status?: "pending" | "confirmed" | "cancelled";
  participation_source?: "group_form" | "admin" | "admin_override" | "import";
};

export type GroupJoinProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

export const groupJoinMocks = {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  loadActionOrganizerIdsForActionMock,
  refreshProgressionProfileMock,
  appendActionModerationAuditMock,
};

export function createGroupJoinAction(params: {
  id?: string;
  createdByClerkId?: string | null;
  status?: GroupJoinActionRow["status"];
  notes?: string | null;
  groupJoinEnabled?: boolean;
}) {
  return {
    id: params.id ?? "action-1",
    created_by_clerk_id: params.createdByClerkId ?? "user-1",
    status: params.status ?? "approved",
    notes:
      params.notes ??
      appendActionMetadataToNotes("Observation", {
        groupJoinEnabled: params.groupJoinEnabled ?? true,
      }),
  };
}

export function createGroupJoinParticipant(params: {
  id?: string;
  created_at: string;
  updated_at?: string;
  action_id: string;
  user_id: string;
  joined_at?: string;
  participation_status?: "pending" | "confirmed" | "cancelled";
  participation_source?: "group_form" | "admin" | "admin_override" | "import";
}): GroupJoinParticipantRow {
  return {
    id: params.id ?? `participant-${params.user_id}`,
    created_at: params.created_at,
    updated_at: params.updated_at,
    action_id: params.action_id,
    user_id: params.user_id,
    joined_at: params.joined_at,
    participation_status: params.participation_status,
    participation_source: params.participation_source,
  };
}

export function createGroupJoinProfile(params: {
  id: string;
  display_name: string | null;
  handle: string | null;
}): GroupJoinProfileRow {
  return {
    id: params.id,
    display_name: params.display_name,
    handle: params.handle,
  };
}

export function createGroupJoinSupabaseMock(params: {
  action: GroupJoinActionRow;
  participants?: GroupJoinParticipantRow[];
  profiles?: GroupJoinProfileRow[];
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

export function seedGroupJoinTestDefaults() {
  vi.resetModules();
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "user-1" });
  getCurrentUserIdentityMock.mockResolvedValue(null);
  loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
  refreshProgressionProfileMock.mockResolvedValue(undefined);
}

function createActionsChain(action: GroupJoinActionRow) {
  const state = {
    notes: action.notes,
  };

  type SingleResult<T> = {
    data: T | null;
    error: null;
  };

  type ActionChain = {
    select: (columns: string) => ActionChain;
    eq: (field: string, value: string) => ActionChain;
    maybeSingle: () => Promise<SingleResult<{
      id: string;
      created_by_clerk_id: string | null;
      status: "pending" | "approved" | "rejected";
      notes: string | null;
    }>>;
    update: (payload: { notes: string | null }) => ActionChain;
    single: () => Promise<SingleResult<{
      id: string;
      notes: string | null;
    }>>;
  };

  const chain: ActionChain = {
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

function createParticipantsChain(participants: GroupJoinParticipantRow[]) {
  const state: {
    filters: Record<string, string>;
    inFilters: Record<string, string[]>;
    countRequested: boolean;
    limitValue: number | null;
    inserting?: GroupJoinParticipantRow;
    pendingUpdate?: Record<string, unknown>;
  } = {
    filters: {},
    inFilters: {},
    countRequested: false,
    limitValue: null,
  };

  const normalizeRow = (row: GroupJoinParticipantRow) => ({
    ...row,
    joined_at: row.joined_at ?? row.created_at,
    participation_status: row.participation_status ?? "pending",
    participation_source: row.participation_source ?? "group_form",
  });

  const buildFiltered = () =>
    participants.filter((row) => {
      const normalized = normalizeRow(row);
      if (state.filters["action_id"] && normalized["action_id"] !== state.filters["action_id"]) {
        return false;
      }
      if (state.filters["user_id"] && normalized["user_id"] !== state.filters["user_id"]) {
        return false;
      }
      if (
        state.filters["participation_status"] &&
        normalized["participation_status"] !== state.filters["participation_status"]
      ) {
        return false;
      }
      const allowedStatuses = state.inFilters["participation_status"];
      if (allowedStatuses && !allowedStatuses.includes(normalized["participation_status"])) {
        return false;
      }
      const allowedActionIds = state.inFilters["action_id"];
      if (allowedActionIds && !allowedActionIds.includes(normalized["action_id"])) {
        return false;
      }
      const allowedUserIds = state.inFilters["user_id"];
      if (allowedUserIds && !allowedUserIds.includes(normalized["user_id"])) {
        return false;
      }
      return true;
    });

  type ManyResult<T> = {
    data: T[];
    error: null;
  };

  type SingleResult<T> = {
    data: T | null;
    error: null;
  };

  type ParticipantChain = {
    select: (columns: string, options?: { count?: string; head?: boolean }) => ParticipantChain;
    eq: (field: string, value: string) => ParticipantChain;
    in: (field: string, values: string[]) => ParticipantChain;
    order: (field: string, options?: { ascending?: boolean }) => ParticipantChain;
    limit: (limit: number) => Promise<ManyResult<GroupJoinParticipantRow>>;
    maybeSingle: () => Promise<SingleResult<GroupJoinParticipantRow>>;
    update: (values: Record<string, unknown>) => ParticipantChain;
    single: () => Promise<SingleResult<GroupJoinParticipantRow>>;
    insert: (values: {
      action_id: string;
      user_id: string;
      joined_at?: string;
      participation_status?: "pending" | "confirmed" | "cancelled";
      participation_source?: "group_form" | "admin" | "admin_override" | "import";
    }) => ParticipantChain;
    then: (
      resolve: (value: {
        data: GroupJoinParticipantRow[] | null;
        count?: number;
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) => Promise<void>;
  };

  const chain: ParticipantChain = {
    select: vi.fn((_: string, options?: { count?: string; head?: boolean }) => {
      state.countRequested = Boolean(options?.count || options?.head);
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
    update: vi.fn((values: Record<string, unknown>) => {
      state.pendingUpdate = values;
      return chain;
    }),
    single: vi.fn(async () => {
        if (state.pendingUpdate) {
          const original =
            participants.find((row) => {
              const normalized = normalizeRow(row);
              if (state.filters["action_id"] && normalized["action_id"] !== state.filters["action_id"]) {
                return false;
              }
              if (state.filters["user_id"] && normalized["user_id"] !== state.filters["user_id"]) {
                return false;
              }
              return true;
            }) ?? null;
        if (original) {
          Object.assign(original, state.pendingUpdate, {
            updated_at: "2026-06-04T12:00:00Z",
            joined_at:
              typeof state.pendingUpdate["joined_at"] === "string"
                ? state.pendingUpdate["joined_at"]
                : original["joined_at"] ?? original["created_at"],
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
    insert: vi.fn(
      (values: {
        action_id: string;
        user_id: string;
        joined_at?: string;
        participation_status?: "pending" | "confirmed" | "cancelled";
        participation_source?: "group_form" | "admin" | "admin_override" | "import";
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
        participants.push(state.inserting as GroupJoinParticipantRow);
        return chain;
      },
    ),
    then: (
      resolve: (value: {
        data: GroupJoinParticipantRow[] | null;
        count?: number;
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve({
        data: state.countRequested
          ? null
          : buildFiltered()
              .slice(0, state.limitValue ?? undefined)
              .map((row) => normalizeRow(row)),
        count: buildFiltered().length,
        error: null,
      }).then(resolve, reject),
  };

  return chain;
}

function createProfilesChain(profiles: GroupJoinProfileRow[]) {
  const state: {
    eqFilters: Record<string, string>;
    inFilters: Record<string, string[]>;
    orExpression: string | null;
  } = {
    eqFilters: {},
    inFilters: {},
    orExpression: null,
  };

  type ProfilesChain = {
    select: (columns: string) => ProfilesChain;
    eq: (field: string, value: string) => ProfilesChain;
    in: (field: string, values: string[]) => ProfilesChain;
    or: (expression: string) => ProfilesChain;
    limit: (limit: number) => Promise<{
      data: GroupJoinProfileRow[];
      error: null;
    }>;
    then: (
      resolve: (value: {
        data: GroupJoinProfileRow[];
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) => Promise<void>;
  };

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: string) => {
      state.eqFilters[field] = value;
      return chain;
    }),
    in: vi.fn((field: string, values: string[]) => {
      state.inFilters[field] = values;
      return chain;
    }),
    or: vi.fn((expression: string) => {
      state.orExpression = expression;
      return chain;
    }),
    limit: vi.fn(async (limit: number) => ({
      data: profiles
        .filter((profile) => {
          if (state.eqFilters["id"] && profile["id"] !== state.eqFilters["id"]) {
            return false;
          }
          if (state.eqFilters["handle"] && profile["handle"] !== state.eqFilters["handle"]) {
            return false;
          }
          const allowedIds = state.inFilters["id"];
          if (allowedIds && !allowedIds.includes(profile["id"])) {
            return false;
          }
          if (state.orExpression) {
            const needle = state.orExpression.match(/%([^%]+)%/)?.[1]?.toLowerCase() ?? "";
            const display = (profile["display_name"] ?? "").toLowerCase();
            const handle = (profile["handle"] ?? "").toLowerCase();
            if (!display.includes(needle) && !handle.includes(needle)) {
              return false;
            }
          }
          return true;
        })
        .slice(0, limit),
      error: null,
    })),
    then: (
      resolve: (value: {
        data: GroupJoinProfileRow[];
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve({
        data: profiles.filter((profile) => {
          if (state.eqFilters["id"] && profile["id"] !== state.eqFilters["id"]) {
            return false;
          }
          if (state.eqFilters["handle"] && profile["handle"] !== state.eqFilters["handle"]) {
            return false;
          }
          const allowedIds = state.inFilters["id"];
          if (allowedIds && !allowedIds.includes(profile["id"])) {
            return false;
          }
          if (state.orExpression) {
            const needle = state.orExpression.match(/%([^%]+)%/)?.[1]?.toLowerCase() ?? "";
            const display = (profile["display_name"] ?? "").toLowerCase();
            const handle = (profile["handle"] ?? "").toLowerCase();
            if (!display.includes(needle) && !handle.includes(needle)) {
              return false;
            }
          }
          return true;
        }),
        error: null,
      }).then(resolve, reject),
  } as ProfilesChain;

  return chain;
}
