import { afterEach, beforeEach, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccessMock: vi.fn(),
  getCurrentUserIdentityMock: vi.fn(),
  getSupabaseServerClientMock: vi.fn(),
  refreshProgressionProfileMock: vi.fn(),
}));

export const requireAuthenticatedAccessMock = mocks.requireAuthenticatedAccessMock;
export const getCurrentUserIdentityMock = mocks.getCurrentUserIdentityMock;
export const getSupabaseServerClientMock = mocks.getSupabaseServerClientMock;
export const refreshProgressionProfileMock = mocks.refreshProgressionProfileMock;

beforeEach(() => vi.useFakeTimers({ now: new Date("2026-05-01T09:00:00.000Z") }));
afterEach(() => vi.useRealTimers());

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentityMock,
  requireAuthenticatedAccess: mocks.requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClientMock,
}));

vi.mock("@/lib/gamification/progression-tracking", () => ({
  refreshProgressionProfile: mocks.refreshProgressionProfileMock,
}));

export type ActionRow = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  moderation_visibility?: "visible" | "hidden";
  action_phase?: "pre_action" | "post_action_draft" | "post_action_complete";
  published_at?: string | null; notes?: string | null;
};

export type ParticipantRow = {
  id: string;
  created_at: string;
  updated_at?: string;
  action_id: string;
  user_id: string;
  joined_at?: string;
  participation_status?: "pending" | "confirmed" | "cancelled";
  participation_source?: "group_form" | "admin" | "admin_override" | "import";
  registered_at?: string;
  registration_status?: "pending" | "confirmed" | "cancelled";
  registration_source?: "group_form" | "admin" | "admin_override" | "import";
};

export type ManyResult<T> = { data: T[]; error: null };

export type SingleResult<T> = { data: T | null; error: null };

export type ActionsChain = {
  select: (columns: string) => ActionsChain;
  eq: (field: string, value: string) => ActionsChain;
  in: (field: string, values: string[]) => ActionsChain;
  not: (field: string, operator: string, value: unknown) => ActionsChain; gte: (field: string, value: string) => ActionsChain;
  order: (field: string, options?: { ascending?: boolean }) => ActionsChain;
  limit: (value: number) => Promise<ManyResult<ActionRow>>;
  maybeSingle: () => Promise<SingleResult<ActionRow>>;
  then: (
    resolve: (value: ManyResult<ActionRow>) => void,
    reject: (reason: unknown) => void,
  ) => Promise<void>;
};

export type ParticipantsChain = {
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
    participation_source?: "group_form" | "admin" | "admin_override" | "import";
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

export type ProgressionEventsChain = {
  select: (columns: string) => {
    delete: () => Promise<{ error: null }>;
  };
};

export function createActionsChain(actions: ActionRow[]): ActionsChain {
  const sourceActions = actions.map((action) => ({
    ...action,
    action_phase: action.action_phase ?? "post_action_complete",
    published_at: action.published_at ?? "2026-01-01T00:00:00.000Z",
  }));
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
    not: vi.fn(() => chain), gte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async (limit: number) => {
      state.limitValue = limit;
      const filtered = sourceActions.filter((action) => {
        if (state.filters["id"] && action["id"] !== state.filters["id"]) {
          return false;
        }
        if (state.filters["status"] && action["status"] !== state.filters["status"]) {
          return false;
        }
        if (
          state.filters["moderation_visibility"] &&
          (action["moderation_visibility"] ?? "visible") !== state.filters["moderation_visibility"]
        ) {
          return false;
        }
        const allowedActionIds = state.inFilters["id"];
        if (allowedActionIds && !allowedActionIds.includes(action["id"])) {
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
      const filtered = sourceActions.filter((action) => {
        if (state.filters["id"] && action["id"] !== state.filters["id"]) {
          return false;
        }
        if (state.filters["status"] && action["status"] !== state.filters["status"]) {
          return false;
        }
        if (
          state.filters["moderation_visibility"] &&
          (action["moderation_visibility"] ?? "visible") !== state.filters["moderation_visibility"]
        ) {
          return false;
        }
        const allowedActionIds = state.inFilters["id"];
        if (allowedActionIds && !allowedActionIds.includes(action["id"])) {
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
        data: sourceActions.filter((action) => {
          if (state.filters["id"] && action["id"] !== state.filters["id"]) {
            return false;
          }
          if (state.filters["status"] && action["status"] !== state.filters["status"]) {
            return false;
          }
          if (
            state.filters["moderation_visibility"] &&
            (action["moderation_visibility"] ?? "visible") !== state.filters["moderation_visibility"]
          ) {
            return false;
          }
          const allowedActionIds = state.inFilters["id"];
          if (allowedActionIds && !allowedActionIds.includes(action["id"])) {
            return false;
          }
          return true;
        }),
        error: null,
      }).then(resolve, reject),
  };

  return chain;
}

export function createParticipantsChain(
  participants: ParticipantRow[],
  table: "participants" | "registrations" = "participants",
): ParticipantsChain {
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

  const getParticipationStatus = (row: ParticipantRow) =>
    table === "registrations"
      ? row.registration_status ?? row.participation_status ?? "confirmed"
      : row.participation_status ?? "confirmed";
  const getJoinedAt = (row: ParticipantRow) => row.joined_at ?? row.created_at;
  const normalizeRow = (row: ParticipantRow): ParticipantRow => ({
    ...row,
    joined_at: row.joined_at ?? row.created_at,
    participation_status: row.participation_status ?? "confirmed",
    participation_source: row.participation_source ?? "group_form",
    registered_at: row.registered_at ?? row.joined_at ?? row.created_at,
    registration_status: row.registration_status ?? row.participation_status ?? "confirmed",
    registration_source: row.registration_source ?? row.participation_source ?? "group_form",
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
      if (state.filters[table === "registrations" ? "registration_status" : "participation_status"] &&
        getParticipationStatus(normalized) !==
          state.filters[table === "registrations" ? "registration_status" : "participation_status"]) {
        return false;
      }
      const allowedActionIds = state.inFilters["action_id"];
      if (allowedActionIds && !allowedActionIds.includes(normalized["action_id"])) {
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
          if (state.filters["action_id"] && normalized["action_id"] !== state.filters["action_id"]) {
            return false;
          }
          if (state.filters["user_id"] && normalized["user_id"] !== state.filters["user_id"]) {
            return false;
          }
          return true;
        }) ?? null;
        if (original) {
          Object.assign(original!, state.pendingUpdate, {
            updated_at: "2026-06-04T12:00:00Z",
            joined_at:
              typeof state.pendingUpdate["joined_at"] === "string"
                ? state.pendingUpdate["joined_at"]
                : getJoinedAt(original),
          });
          if ("registration_status" in state.pendingUpdate) {
            original.participation_status = state.pendingUpdate["registration_status"] as ParticipantRow["participation_status"];
          }
          if ("registration_source" in state.pendingUpdate) {
            original.participation_source = state.pendingUpdate["registration_source"] as ParticipantRow["participation_source"];
          }
          if ("registered_at" in state.pendingUpdate) {
            original.joined_at = state.pendingUpdate["registered_at"] as string;
          }
          if ("participation_status" in state.pendingUpdate) {
            original.registration_status = state.pendingUpdate["participation_status"] as ParticipantRow["registration_status"];
          }
          if ("participation_source" in state.pendingUpdate) {
            original.registration_source = state.pendingUpdate["participation_source"] as ParticipantRow["registration_source"];
          }
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
        participation_source?: "group_form" | "admin" | "admin_override" | "import";
        registered_at?: string;
        registration_status?: "pending" | "confirmed" | "cancelled";
        registration_source?: "group_form" | "admin" | "admin_override" | "import";
      }) => {
        const joinedAt = values.joined_at ?? values.registered_at ?? "2026-06-04T12:00:00Z";
        const status = values.participation_status ?? values.registration_status ?? "confirmed";
        const source = values.participation_source ?? values.registration_source ?? "group_form";
        state.inserting = {
          id: `participant-${participants.length + 1}`,
          created_at: joinedAt,
          joined_at: joinedAt,
          participation_status: status,
          participation_source: source,
          registered_at: joinedAt,
          registration_status: status,
          registration_source: source,
          action_id: values["action_id"],
          user_id: values["user_id"],
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

export function createSupabaseMock(params: {
  actions: ActionRow[];
  participants: ParticipantRow[];
}) {
  return {
    rpc: vi.fn(async () => ({ data: "conversation-test", error: null })),
    from: vi.fn((table: string) => {
      if (table === "actions") {
        return createActionsChain(params.actions);
      }
      if (table === "action_participants") {
        return createParticipantsChain(params.participants, "participants");
      }
      if (table === "action_registrations") {
        return createParticipantsChain(params.participants, "registrations");
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

export function makeVisibleGroupAction(action: ActionRow): ActionRow {
  return {
    ...action,
    moderation_visibility: action.moderation_visibility ?? "visible",
    action_phase: "pre_action",
    notes: appendActionMetadataToNotes(action.notes ?? undefined, { groupJoinEnabled: true }),
  };
}
