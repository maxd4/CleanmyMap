import { describe, expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { syncUserActionProgression } from "./progression-data";
import {
  createFormsQuery,
  createOrganizerChain,
  createRecordingProgressionSupabase,
  type ProgressionTestActionRow as ActionRow,
} from "./progression-data.test.helpers";

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

describe("syncUserActionProgression action rejection", () => {
  it("removes the validation award when an action is rejected a posteriori", async () => {
    const actions = [buildAction("approved")];
    const insertedEvents: Array<Record<string, unknown>> = [];

    const supabase = createRecordingProgressionSupabase({
      actions,
      actionOrganizers: createOrganizerChain,
      forms: createFormsQuery,
      insertedEvents,
    });

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

  it("writes one historical qualification and its specialized milestone", async () => {
    const actions = [
      {
        ...buildAction("approved"),
        location_label: "Lyon 10e - Rue sensible",
      },
    ];
    const insertedEvents: Array<Record<string, unknown>> = [];

    const supabase = createRecordingProgressionSupabase({
      actions,
      actionOrganizers: createOrganizerChain,
      forms: createFormsQuery,
      insertedEvents,
    });

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
      ]),
    );
    expect(insertedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_type: "sensitive_zone_milestone",
          source_table: "sensitive_zone_milestones",
          source_id: "sensitive-zone:threshold:1",
          xp_base: 1,
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
