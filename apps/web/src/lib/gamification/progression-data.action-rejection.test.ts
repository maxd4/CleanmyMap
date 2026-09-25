import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { syncUserActionProgression } from "./progression-data";

type ActionRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  actor_name: string | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number;
  cigarette_butts: number;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
};

function buildAction(status: "pending" | "approved" | "rejected"): ActionRow {
  return {
    id: "action-1",
    created_at: "2026-01-01",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-01-01",
    location_label: "Parc A",
    latitude: null,
    longitude: null,
    waste_kg: 2,
    cigarette_butts: 10,
    volunteers_count: 2,
    duration_minutes: 45,
    status,
    notes: appendActionMetadataToNotes("Action", {
      associationName: "Action spontanée",
    }),
  };
}

const ORGANIZER_ROWS = [
  {
    action_id: "action-1",
    organizer_clerk_id: "user-1",
    organizer_label: "Alice",
    organizer_handle: "alice",
    is_primary: true,
    created_at: "2026-01-01",
  },
  {
    action_id: "action-1",
    organizer_clerk_id: "user-2",
    organizer_label: "Bob",
    organizer_handle: "bob",
    is_primary: false,
    created_at: "2026-01-01",
  },
] as const;

function createActionQuery(getRows: () => ActionRow[]) {
  const state = {
    eq: {} as Record<string, string>,
  };
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: string) => {
      state.eq[field] = value;
      return chain;
    }),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({
      data: getRows().filter((row) => {
        const createdBy = state.eq["created_by_clerk_id"];
        if (createdBy && row.created_by_clerk_id !== createdBy) {
          return false;
        }
        return true;
      }),
      error: null,
    })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  return chain;
}

function createOrganizerChain() {
  type OrganizerChain = {
    select: (columns: string) => OrganizerChain;
    eq: (field: string, value: string) => OrganizerChain;
    order: (field: string, options?: { ascending?: boolean }) => OrganizerChain;
    limit: (value: number) => OrganizerChain;
    then: (
      resolve: (value: {
        data: Array<{
          action_id: string;
          organizer_clerk_id: string;
          organizer_label: string;
          organizer_handle: string;
          is_primary: boolean;
          created_at: string;
        }>;
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) => Promise<void>;
  };

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (
      resolve: (value: {
        data: Array<{
          action_id: string;
          organizer_clerk_id: string;
          organizer_label: string;
          organizer_handle: string;
          is_primary: boolean;
          created_at: string;
        }>;
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve({
        data: [...ORGANIZER_ROWS],
        error: null,
      }).then(resolve, reject),
  } as OrganizerChain;

  return chain;
}

function createFormsQuery() {
  type FormsQueryChain = {
    select: (columns: string) => FormsQueryChain;
    in: (field: string, values: string[]) => FormsQueryChain;
    neq: (field: string, value: string) => FormsQueryChain;
    eq: (field: string, value: string) => FormsQueryChain;
    is: (field: string, value: boolean | null) => FormsQueryChain;
    order: (field: string, options?: { ascending?: boolean }) => Promise<{
      data: Array<{
        action_id: string;
        group_id: string;
        status: string;
        created_at: string;
        validated_by_admin: boolean;
        is_duplicate: boolean;
        is_deleted: boolean;
        is_test: boolean;
      }>;
      error: null;
    }>;
  };

  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(async () => ({
      data: [
        {
          action_id: "action-1",
          group_id: "g1",
          status: "validated",
          created_at: "2026-01-02",
          validated_by_admin: true,
          is_duplicate: false,
          is_deleted: false,
          is_test: false,
        },
      ],
      error: null,
    })),
  } as FormsQueryChain;
  return chain;
}

function createDeleteChain() {
  type DeleteChain = {
    error: null;
    eq: (field: string, value: string) => DeleteChain;
    delete: () => DeleteChain;
    select: (columns: string) => DeleteChain;
  };

  const chain = {} as DeleteChain;
  chain.error = null;
  chain.eq = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  return chain;
}

describe("syncUserActionProgression action rejection", () => {
  it("removes the validation award when an action is rejected a posteriori", async () => {
    const actions = [buildAction("approved")];
    const insertedEvents: Array<Record<string, unknown>> = [];

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionQuery(() => actions);
        }
        if (table === "action_organizers") {
          return createOrganizerChain();
        }
        if (table === "forms") {
          return createFormsQuery();
        }
        if (table === "progression_events") {
          return {
            delete: () => createDeleteChain(),
            insert: vi.fn(async (row: Record<string, unknown>) => {
              insertedEvents.push(row);
              return { error: null };
            }),
          };
        }
        if (table === "points_ledger" || table === "xp_audit") {
          return {
            insert: vi.fn(async () => ({ error: null })),
            select: vi.fn(() => createDeleteChain()),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const syncOptions = {
      sensitiveAreas: [],
      projectionState: { qualifications: [], milestoneThresholds: [] },
    };
    const firstPass = await syncUserActionProgression(supabase, "user-1", syncOptions);
    const firstValidationEvents = insertedEvents.filter(
      (row) => row["event_type"] === "action_declare_validation",
    );

    expect(firstPass).toBe(1);
    expect(firstValidationEvents).toHaveLength(1);
    expect(firstValidationEvents[0]).toMatchObject({
      xp_awarded: 0.5,
      metadata: expect.objectContaining({
        hasValidatedForm: true,
        organizerCount: 2,
      }),
    });

    actions[0] = buildAction("rejected");
    insertedEvents.length = 0;

    const secondPass = await syncUserActionProgression(supabase, "user-1", syncOptions);
    const secondValidationEvents = insertedEvents.filter(
      (row) => row["event_type"] === "action_declare_validation",
    );

    expect(secondPass).toBe(0);
    expect(secondValidationEvents).toHaveLength(0);
  });

  it("writes one historical qualification and one gem milestone, then keeps them on replay", async () => {
    const actions = [
      {
        ...buildAction("approved"),
        location_label: "Lyon 10e - Rue sensible",
      },
    ];
    const insertedEvents: Array<Record<string, unknown>> = [];

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionQuery(() => actions);
        }
        if (table === "action_organizers") {
          return createOrganizerChain();
        }
        if (table === "forms") {
          return createFormsQuery();
        }
        if (table === "progression_events") {
          return {
            delete: () => createDeleteChain(),
            insert: vi.fn(async (row: Record<string, unknown>) => {
              insertedEvents.push(row);
              return { error: null };
            }),
          };
        }
        if (table === "points_ledger" || table === "xp_audit") {
          return {
            insert: vi.fn(async () => ({ error: null })),
            select: vi.fn(() => createDeleteChain()),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const firstOptions = {
      sensitiveAreas: ["10e"],
      projectionState: { qualifications: [], milestoneThresholds: [] },
      assessedAt: "2026-06-01T12:00:00.000Z",
    };
    await syncUserActionProgression(supabase, "user-1", firstOptions);

    expect(insertedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_type: "sensitive_zone_action",
          source_table: "sensitive_zone_actions",
          source_id: "action-1",
          xp_awarded: 0,
          metadata: expect.objectContaining({
            sensitiveZone: expect.objectContaining({
              qualified: true,
              ruleVersion: "build-zones-120d-critique-normalized-score-v1",
            }),
          }),
        }),
        expect.objectContaining({
          event_type: "sensitive_zone_milestone",
          source_table: "sensitive_zone_milestones",
          source_id: "sensitive-zone:threshold:1",
          xp_awarded: 1,
        }),
      ]),
    );

    const proof = insertedEvents.find(
      (row) => row.event_type === "sensitive_zone_action",
    );
    insertedEvents.length = 0;
    await syncUserActionProgression(supabase, "user-1", {
      sensitiveAreas: [],
      projectionState: {
        qualifications: [
          {
            sourceId: "action-1",
            snapshot: (proof?.metadata as { sensitiveZone: {
              actionId: string;
              qualified: boolean;
              area: string;
              ruleVersion: "build-zones-120d-critique-normalized-score-v1";
              assessedAt: string;
              actionDate: string;
            } }).sensitiveZone,
          },
        ],
        milestoneThresholds: [1],
      },
      assessedAt: "2026-07-01T12:00:00.000Z",
    });

    expect(
      insertedEvents.filter((row) =>
        String(row.event_type).startsWith("sensitive_zone_"),
      ),
    ).toHaveLength(0);
  });
});
