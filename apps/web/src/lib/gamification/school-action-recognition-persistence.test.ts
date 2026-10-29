import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

const mocks = vi.hoisted(() => ({
  loadActionById: vi.fn(),
  loadCanonicalActionOrganizerIdsForAction: vi.fn(),
  logFailure: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadActionById }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: mocks.loadCanonicalActionOrganizerIdsForAction,
}));
vi.mock("@/lib/logging/failure-log", () => ({ logFailure: mocks.logFailure }));

import { reconcileSchoolActionRecognitions } from "./school-action-recognition-persistence";

const ACTION_ID = "00000000-0000-4000-8000-000000000001";

function buildAction(overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id: ACTION_ID,
    created_at: "2026-10-29T10:00:00.000Z",
    updated_at: "2026-10-29T12:00:00.000Z",
    created_by_clerk_id: "organizer-1",
    actor_name: null,
    action_date: "2026-10-29",
    location_label: "Cour de test",
    latitude: 48.85,
    longitude: 2.35,
    derived_geometry_kind: null,
    derived_geometry_geojson: null,
    geometry_confidence: null,
    waste_kg: 3,
    cigarette_butts: null,
    volunteers_count: 4,
    duration_minutes: 60,
    notes: appendActionMetadataToNotes("Observation", {
      volunteerParticipation: {
        childrenCount: 3,
        adultCount: 1,
        retiredCount: 0,
        participantsCount: 4,
        effectiveVolunteerUnits: 2.5,
        effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
      },
      wasteMeasurementMethod: "balance_suspendue",
      wasteBreakdown: { recyclablesKg: 1, glassKg: 1 },
    }),
    status: "approved",
    action_phase: "post_action_complete",
    preparation_data: {},
    published_at: "2026-10-29T12:00:00.000Z",
    moderation_visibility: "visible",
    access_mode: "public",
    action_context: "school",
    school_context_confirmed: true,
    school_context_confirmed_by_clerk_id: "organizer-1",
    ...overrides,
  };
}

function buildSupabase() {
  return { rpc: mocks.rpc } as never;
}

describe("school recognition atomic reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue(["organizer-1"]);
    mocks.rpc.mockResolvedValue({
      data: [{ reconciliation_status: "reconciled" }],
      error: null,
    });
  });

  it("sends the complete three-row projection to one atomic RPC", async () => {
    mocks.loadActionById.mockResolvedValue(buildAction());

    const result = await reconcileSchoolActionRecognitions({
      supabase: buildSupabase(),
      actionId: ACTION_ID,
      actorUserId: "moderator-1",
    });

    expect(result).toEqual({
      status: "reconciled",
      activeIds: ["school_first_mission", "school_documented_sorting", "school_field_debrief"],
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [, args] = mocks.rpc.mock.calls[0];
    expect(args.p_expected_action_updated_at).toBe("2026-10-29T12:00:00.000Z");
    expect(args.p_rows).toHaveLength(3);
    expect(args.p_rows.every((row: { action_id: string }) => row.action_id === ACTION_ID)).toBe(true);
    expect(args.p_rows.every((row: { proof_snapshot: { xpAwarded: number } }) => row.proof_snapshot.xpAwarded === 0)).toBe(true);
  });

  it("reloads after a stale snapshot instead of applying the old active state", async () => {
    mocks.loadActionById
      .mockResolvedValueOnce(buildAction())
      .mockResolvedValueOnce(buildAction({ status: "rejected", updated_at: "2026-10-29T12:01:00.000Z" }));
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ reconciliation_status: "stale" }], error: null })
      .mockResolvedValueOnce({ data: [{ reconciliation_status: "reconciled" }], error: null });

    const result = await reconcileSchoolActionRecognitions({
      supabase: buildSupabase(),
      actionId: ACTION_ID,
    });

    expect(result).toEqual({ status: "reconciled", activeIds: [] });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[1][1].p_rows.every((row: { status: string }) => row.status === "invalidated")).toBe(true);
  });

  it("fails closed when transactional persistence is unavailable", async () => {
    mocks.loadActionById.mockResolvedValue(buildAction());
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "function is unavailable" },
    });

    await expect(reconcileSchoolActionRecognitions({
      supabase: buildSupabase(),
      actionId: ACTION_ID,
    })).resolves.toEqual({ status: "unavailable", activeIds: [] });
    expect(mocks.logFailure).not.toHaveBeenCalled();
  });

  it("logs an unexpected unique violation even when its message names the recognition table", async () => {
    mocks.loadActionById.mockResolvedValue(buildAction());
    const error = {
      code: "23505",
      message: "duplicate key in action_school_collective_recognitions",
    };
    mocks.rpc.mockResolvedValue({ data: null, error });

    await expect(reconcileSchoolActionRecognitions({
      supabase: buildSupabase(),
      actionId: ACTION_ID,
    })).resolves.toEqual({ status: "unavailable", activeIds: [] });
    expect(mocks.logFailure).toHaveBeenCalledWith(
      "Gamification",
      "School recognition reconciliation failed",
      error,
      { actionId: ACTION_ID },
    );
  });

  it("logs an unexpected check violation instead of treating it as missing persistence", async () => {
    mocks.loadActionById.mockResolvedValue(buildAction());
    const error = { code: "23514", message: "recognition status check failed" };
    mocks.rpc.mockResolvedValue({ data: null, error });

    await expect(reconcileSchoolActionRecognitions({
      supabase: buildSupabase(),
      actionId: ACTION_ID,
    })).resolves.toEqual({ status: "unavailable", activeIds: [] });
    expect(mocks.logFailure).toHaveBeenCalledTimes(1);
  });

  it("does not reconcile an action without a revision token", async () => {
    mocks.loadActionById.mockResolvedValue(buildAction({ updated_at: undefined }));

    await expect(reconcileSchoolActionRecognitions({
      supabase: buildSupabase(),
      actionId: ACTION_ID,
    })).resolves.toEqual({ status: "unavailable", activeIds: [] });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
