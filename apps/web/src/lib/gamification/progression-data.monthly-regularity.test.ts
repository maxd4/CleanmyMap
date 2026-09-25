import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { syncUserActionProgression } from "./progression-data";
import {
  createActionOrganizerChain,
  createEmptyChain,
  createValidatedFormsChain,
  createProgressionSupabase,
  createRecordingProgressionSupabase,
  createNoopLedgerTable,
  type ProgressionTestActionRow as ActionRow,
} from "./progression-data.test.helpers";

function buildAction(
  id: string,
  actionDate: string,
  status: "pending" | "approved" | "rejected",
  associationName = "Action spontanée",
): ActionRow {
  return {
    id,
    created_at: actionDate,
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: actionDate,
    location_label: "Parc central",
    latitude: null,
    longitude: null,
    waste_kg: 1,
    cigarette_butts: 10,
    volunteers_count: 1,
    duration_minutes: 45,
    status,
    notes: appendActionMetadataToNotes("Action de terrain", {
      associationName,
    }),
  };
}

describe("syncUserActionProgression monthly regularity", () => {
  it("recalculates month streaks when a pending action is later rejected", async () => {
    const actions = [
      buildAction("action-jan", "2026-01-10", "pending"),
      buildAction("action-feb", "2026-02-10", "pending"),
      buildAction("action-mar", "2026-03-10", "pending"),
      buildAction("action-apr", "2026-04-10", "pending"),
    ];

    const insertedEvents: Array<Record<string, unknown>> = [];

    const supabase = createRecordingProgressionSupabase({
      actions,
      actionOrganizers: createEmptyChain,
      forms: createEmptyChain,
      insertedEvents,
    });

    const syncOptions = {
      sensitiveAreas: [],
      projectionState: { qualifications: [], milestoneThresholds: [] },
    };
    const firstPass = await syncUserActionProgression(supabase, "user-1", syncOptions);
    const firstMonthlyEvents = insertedEvents.filter(
      (row) => row["event_type"] === "action_monthly_regularity",
    );

    expect(firstPass).toBe(0);
    expect(firstMonthlyEvents).toHaveLength(4);
    expect(firstMonthlyEvents.map((row) => row["source_id"])).toEqual([
      "monthly-regularity:2026-01",
      "monthly-regularity:2026-02",
      "monthly-regularity:2026-03",
      "monthly-regularity:2026-04",
    ]);
    expect(firstMonthlyEvents.map((row) => row["xp_awarded"])).toEqual([1, 2, 3, 4]);

    actions[2] = buildAction("action-mar", "2026-03-10", "rejected");
    insertedEvents.length = 0;

    const secondPass = await syncUserActionProgression(supabase, "user-1", syncOptions);
    const secondMonthlyEvents = insertedEvents.filter(
      (row) => row["event_type"] === "action_monthly_regularity",
    );

    expect(secondPass).toBe(0);
    expect(secondMonthlyEvents).toHaveLength(3);
    expect(secondMonthlyEvents.map((row) => row["source_id"])).toEqual([
      "monthly-regularity:2026-01",
      "monthly-regularity:2026-02",
      "monthly-regularity:2026-04",
    ]);
    expect(secondMonthlyEvents.map((row) => row["xp_awarded"])).toEqual([1, 2, 1]);
  });

  it("materializes action balance awards, rebuilds them, and scopes identity by user", async () => {
    const actions = [
      buildAction("s-1", "2026-06-01T08:00:00.000Z", "approved", "Action spontanée"),
      buildAction("a-1", "2026-06-01T08:05:00.000Z", "approved", "Association Exemple"),
      buildAction("e-1", "2026-06-01T08:10:00.000Z", "approved", "Entreprise - ACME"),
      buildAction("s-2", "2026-06-01T09:00:00.000Z", "approved", "Action spontanée"),
      buildAction("a-2", "2026-06-01T09:05:00.000Z", "approved", "Association Exemple"),
      buildAction("e-2", "2026-06-01T09:10:00.000Z", "approved", "Entreprise - ACME"),
      buildAction("s-3", "2026-06-01T09:15:00.000Z", "approved", "Action spontanée"),
      buildAction("a-3", "2026-06-01T09:20:00.000Z", "approved", "Association Exemple"),
      buildAction("e-3", "2026-06-01T09:25:00.000Z", "approved", "Entreprise - ACME"),
    ];
    const persistedEvents: Array<Record<string, unknown>> = [];
    const syncOptions = {
      sensitiveAreas: [],
      projectionState: { qualifications: [], milestoneThresholds: [] },
    };

    const supabase = createProgressionSupabase({
      actions: () => actions,
      actionOrganizers: () => createActionOrganizerChain(() => actions),
      forms: () => createValidatedFormsChain(() => actions),
      progressionEvents: () => {
        const filters: Record<string, string> = {};
        const chain = {
          error: null,
          delete: vi.fn(() => chain),
          eq: vi.fn((field: string, value: string) => {
            filters[field] = value;
            if (field === "source_table") {
              for (let index = persistedEvents.length - 1; index >= 0; index -= 1) {
                if (
                  persistedEvents[index].user_id === filters.user_id &&
                  persistedEvents[index].source_table === filters.source_table
                ) {
                  persistedEvents.splice(index, 1);
                }
              }
            }
            return chain;
          }),
          insert: vi.fn(async (row: Record<string, unknown>) => {
            const key = [
              row.user_id,
              row.event_type,
              row.source_table,
              row.source_id,
              row.status_phase,
            ].join("|");
            const duplicate = persistedEvents.some((event) =>
              [
                event.user_id,
                event.event_type,
                event.source_table,
                event.source_id,
                event.status_phase,
              ].join("|") === key,
            );
            if (duplicate) {
              return { error: { code: "23505", message: "duplicate key" } };
            }
            persistedEvents.push(row);
            return { error: null };
          }),
        };
        return chain;
      },
      ledger: createNoopLedgerTable,
    });

    await syncUserActionProgression(supabase, "user-1", syncOptions);
    const firstAwards = persistedEvents.filter(
      (event) => event.event_type === "action_balance_cycle" && event.user_id === "user-1",
    );
    expect(firstAwards).toHaveLength(2);
    expect(firstAwards.map((event) => event.xp_awarded)).toEqual([1, 2]);
    expect(firstAwards.map((event) => event.metadata)).toEqual([
      { cycleIndex: 1, requiredPerType: 1 },
      { cycleIndex: 2, requiredPerType: 2 },
    ]);
    expect(firstAwards.every((event) => event.source_table === "actions")).toBe(true);

    await syncUserActionProgression(supabase, "user-1", syncOptions);
    expect(
      persistedEvents.filter(
        (event) => event.event_type === "action_balance_cycle" && event.user_id === "user-1",
      ),
    ).toHaveLength(2);

    actions[8] = buildAction(
      "e-3",
      "2026-06-01T09:25:00.000Z",
      "rejected",
      "Entreprise - ACME",
    );
    await syncUserActionProgression(supabase, "user-1", syncOptions);
    expect(
      persistedEvents.filter(
        (event) => event.event_type === "action_balance_cycle" && event.user_id === "user-1",
      ),
    ).toHaveLength(1);

    await syncUserActionProgression(supabase, "user-2", syncOptions);
    const userAwards = persistedEvents.filter(
      (event) => event.event_type === "action_balance_cycle",
    );
    expect(userAwards).toHaveLength(2);
    expect(new Set(userAwards.map((event) => event.user_id))).toEqual(
      new Set(["user-1", "user-2"]),
    );
    expect(userAwards.filter((event) => event.user_id === "user-2")).toHaveLength(1);
  });
});
