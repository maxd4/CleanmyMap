import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  planSensitiveZoneProjection,
  sensitiveZoneMilestoneThresholds,
  type SensitiveZoneProjectionState,
} from "./sensitive-zone-progression";
import {
  syncSensitiveZoneProjection,
} from "./sensitive-zone-progression-store";
import { SENSITIVE_ZONE_RULE_VERSION } from "./sensitive-zone-qualification";

function buildAction(id: string, status: "approved" | "rejected" = "approved") {
  return {
    id,
    location_label: "Lyon 10e - Rue A",
    action_date: "2026-06-01",
    created_at: "2026-06-01T10:00:00.000Z",
    status,
  } as const;
}

function buildQualification(actionId: string, qualified: boolean) {
  return {
    sourceId: actionId,
    snapshot: {
      actionId,
      qualified,
      area: "10e",
      ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
      assessedAt: "2026-06-01T12:00:00.000Z",
      actionDate: "2026-06-01",
    },
  };
}

const emptyProjection: SensitiveZoneProjectionState = {
  qualifications: [],
  milestoneThresholds: [],
};

describe("sensitive zone progression", () => {
  it("records a validated sensitive action and its first gem milestone", () => {
    const plan = planSensitiveZoneProjection({
      actions: [buildAction("action-1")],
      validatedActionIds: new Set(["action-1"]),
      existing: emptyProjection,
      sensitiveAreas: ["10e"],
      assessedAt: "2026-06-01T12:00:00.000Z",
    });

    expect(plan.qualificationsToInsert[0]).toMatchObject({
      actionId: "action-1",
      qualified: true,
      area: "10e",
    });
    expect(plan.qualifiedActionCount).toBe(1);
    expect(plan.milestoneThresholdsToInsert).toEqual([1]);
  });

  it("keeps the acquired qualification when the zone is clean later", () => {
    const plan = planSensitiveZoneProjection({
      actions: [buildAction("action-1")],
      validatedActionIds: new Set(["action-1"]),
      existing: {
        qualifications: [buildQualification("action-1", true)],
        milestoneThresholds: [1],
      },
      sensitiveAreas: [],
      assessedAt: "2026-07-01T12:00:00.000Z",
    });

    expect(plan.qualificationsToInsert).toEqual([]);
    expect(plan.qualificationSourceIdsToRemove).toEqual([]);
    expect(plan.qualifiedActionCount).toBe(1);
    expect(plan.milestoneThresholdsToInsert).toEqual([]);
    expect(plan.milestoneThresholdsToRemove).toEqual([]);
  });

  it("freezes a non-sensitive qualification and does not award a milestone", () => {
    const plan = planSensitiveZoneProjection({
      actions: [buildAction("action-1")],
      validatedActionIds: new Set(["action-1"]),
      existing: emptyProjection,
      sensitiveAreas: [],
      assessedAt: "2026-06-01T12:00:00.000Z",
    });

    expect(plan.qualificationsToInsert[0]?.qualified).toBe(false);
    expect(plan.qualifiedActionCount).toBe(0);
    expect(plan.milestoneThresholdsToInsert).toEqual([]);
  });

  it("is idempotent on replay and removes the projection after rejection", () => {
    const first = planSensitiveZoneProjection({
      actions: [buildAction("action-1")],
      validatedActionIds: new Set(["action-1"]),
      existing: emptyProjection,
      sensitiveAreas: ["10e"],
      assessedAt: "2026-06-01T12:00:00.000Z",
    });
    const replay = planSensitiveZoneProjection({
      actions: [buildAction("action-1")],
      validatedActionIds: new Set(["action-1"]),
      existing: {
        qualifications: [
          buildQualification("action-1", first.qualificationsToInsert[0].qualified),
        ],
        milestoneThresholds: [1],
      },
      sensitiveAreas: ["10e"],
      assessedAt: "2026-06-02T12:00:00.000Z",
    });
    const rejection = planSensitiveZoneProjection({
      actions: [buildAction("action-1", "rejected")],
      validatedActionIds: new Set(),
      existing: {
        qualifications: [buildQualification("action-1", true)],
        milestoneThresholds: [1],
      },
      sensitiveAreas: ["10e"],
      assessedAt: "2026-06-03T12:00:00.000Z",
    });

    expect(replay.qualificationsToInsert).toEqual([]);
    expect(replay.milestoneThresholdsToInsert).toEqual([]);
    expect(rejection.qualificationSourceIdsToRemove).toEqual(["action-1"]);
    expect(rejection.milestoneThresholdsToRemove).toEqual([1]);
    expect(rejection.qualifiedActionCount).toBe(0);
  });

  it("uses canonical gem thresholds and keeps new XP awards idempotent", () => {
    expect(sensitiveZoneMilestoneThresholds(20)).toEqual([1, 3, 5, 8, 10, 15, 20]);
    expect(sensitiveZoneMilestoneThresholds(25)).toEqual([1, 3, 5, 8, 10, 15, 20, 25]);

    const qualifications = Array.from({ length: 5 }, (_, index) =>
      buildQualification(`action-${index + 1}`, true),
    );
    const plan = planSensitiveZoneProjection({
      actions: Array.from({ length: 5 }, (_, index) => buildAction(`action-${index + 1}`)),
      validatedActionIds: new Set(qualifications.map((item) => item.snapshot.actionId)),
      existing: { qualifications, milestoneThresholds: [1, 3, 5] },
      sensitiveAreas: [],
      assessedAt: "2026-06-04T12:00:00.000Z",
    });

    expect(plan.qualifiedActionCount).toBe(5);
    expect(plan.milestoneThresholdsToInsert).toEqual([]);
    expect(plan.milestoneThresholdsToRemove).toEqual([]);
  });

  it("adds the eighth-action milestone after the fifth one without duplicating earlier thresholds", () => {
    const qualifications = Array.from({ length: 8 }, (_, index) =>
      buildQualification(`action-${index + 1}`, true),
    );
    const plan = planSensitiveZoneProjection({
      actions: Array.from({ length: 8 }, (_, index) => buildAction(`action-${index + 1}`)),
      validatedActionIds: new Set(qualifications.map((item) => item.snapshot.actionId)),
      existing: { qualifications, milestoneThresholds: [1, 3, 5] },
      sensitiveAreas: [],
      assessedAt: "2026-06-05T12:00:00.000Z",
    });

    expect(plan.qualifiedActionCount).toBe(8);
    expect(plan.milestoneThresholdsToInsert).toEqual([8]);
    expect(plan.milestoneThresholdsToRemove).toEqual([]);
  });

  it("writes one XP event per newly reached threshold and replays without duplicates", async () => {
    const writes: Array<Record<string, unknown>> = [];
    const options = {
      projectionState: emptyProjection,
      sensitiveAreas: ["10e"],
      assessedAt: "2026-06-01T12:00:00.000Z",
    };
    const action = buildAction("action-1");

    await syncSensitiveZoneProjection({
      supabase: {} as SupabaseClient,
      userId: "user-1",
      actions: [action],
      validatedActionIds: new Set([action.id]),
      options,
      writeEvent: async (event) => {
        writes.push(event);
        return true;
      },
    });

    expect(writes).toHaveLength(2);
    expect(writes[1]).toMatchObject({
      eventType: "sensitive_zone_milestone",
      sourceTable: "sensitive_zone_milestones",
      sourceId: "sensitive-zone:threshold:1",
      xpBase: 1,
      xpAwarded: 1,
    });

    const replayWrites: Array<Record<string, unknown>> = [];
    await syncSensitiveZoneProjection({
      supabase: {} as SupabaseClient,
      userId: "user-1",
      actions: [action],
      validatedActionIds: new Set([action.id]),
      options: {
        ...options,
        projectionState: {
          qualifications: [buildQualification(action.id, true)],
          milestoneThresholds: [1],
        },
      },
      writeEvent: async (event) => {
        replayWrites.push(event);
        return true;
      },
    });

    expect(replayWrites).toEqual([]);
  });

  it("deletes the proof and now-ineligible milestone after rejection", async () => {
    const deleted: Array<{ table: string; sourceIds: string[] }> = [];
    const supabase = {
      from(table: string) {
        const query = {
          delete() {
            return query;
          },
          eq() {
            return query;
          },
          in(_column: string, sourceIds: string[]) {
            deleted.push({ table, sourceIds });
            return query;
          },
        };
        return query;
      },
    } as unknown as SupabaseClient;

    await syncSensitiveZoneProjection({
      supabase,
      userId: "user-1",
      actions: [buildAction("action-1", "rejected")],
      validatedActionIds: new Set(),
      options: {
        projectionState: {
          qualifications: [buildQualification("action-1", true)],
          milestoneThresholds: [1],
        },
        sensitiveAreas: ["10e"],
        assessedAt: "2026-06-03T12:00:00.000Z",
      },
      writeEvent: async () => true,
    });

    expect(deleted).toEqual([
      { table: "progression_events", sourceIds: ["action-1"] },
      { table: "progression_events", sourceIds: ["sensitive-zone:threshold:1"] },
    ]);
  });
});
