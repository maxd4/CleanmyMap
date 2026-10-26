import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

const organizersMock = vi.hoisted(() => vi.fn());
const logFailureMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: organizersMock,
}));
vi.mock("@/lib/logging/failure-log", () => ({ logFailure: logFailureMock }));

import { awardActionMilestonesForUserWithDependencies } from "./action-milestone-awards";

function action(id = "action-1") {
  return {
    id,
    created_at: "2026-10-01T10:00:00.000Z",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-10-01",
    location_label: "Parc test",
    latitude: 48,
    longitude: 2,
    waste_kg: 2,
    cigarette_butts: 10,
    volunteers_count: 2,
    duration_minutes: 30,
    status: "approved",
    action_phase: "post_action_complete",
    published_at: "2026-09-30T10:00:00.000Z",
    geometry_source: "reference",
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: JSON.stringify({ type: "LineString", coordinates: [[2, 48], [2.1, 48.1]] }),
    preparation_data: {},
    notes: appendActionMetadataToNotes("Action", {
      groupJoinEnabled: true,
      wasteMeasurementMethod: "balance_suspendue",
      wasteBreakdown: { recyclablesKg: 1, glassKg: 1 },
    }),
  } as never;
}

function createSupabase(params: {
  participantResult?: { data: unknown; error: unknown };
  qualityResult?: { data: unknown; error: unknown };
}) {
  const participant = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
  };
  participant.select.mockReturnValue(participant);
  participant.in.mockReturnValue(participant);
  participant.eq.mockResolvedValue(params.participantResult ?? { data: [], error: null });
  const quality = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
  };
  quality.select.mockReturnValue(quality);
  quality.eq.mockReturnValue(quality);
  quality.in.mockResolvedValue(params.qualityResult ?? { data: [], error: null });
  return {
    from: vi.fn((table: string) => table === "action_participants" ? participant : quality),
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  organizersMock.mockResolvedValue(["user-1"]);
});

describe("action milestone award boundary", () => {
  it("awards only qualified validated milestones with deterministic source identities", async () => {
    const insert = vi.fn().mockResolvedValue(true);
    const supabase = createSupabase({
      participantResult: { data: [
        { action_id: "action-1", user_id: "user-1" },
        { action_id: "action-1", user_id: "user-2" },
        { action_id: null, user_id: "ignored" },
      ], error: null },
      qualityResult: { data: [{ source_id: "action-1", metadata: { qualityGrade: "A" } }, { source_id: "action-1", metadata: { qualityGrade: "invalid" } }], error: null },
    });

    const inserted = await awardActionMilestonesForUserWithDependencies(
      supabase,
      "user-1",
      [action()],
      {
        loadValidatedActionIds: vi.fn().mockResolvedValue(new Set(["action-1"])),
        insertProgressionEvent: insert,
      },
    );

    expect(inserted).toBeGreaterThan(0);
    expect(insert.mock.calls.every(([, params]) => params.sourceTable === "action_milestones" && params.sourceId.startsWith("action-milestone:"))).toBe(true);
    expect(insert.mock.calls.every(([, params]) => params.statusPhase === "validated")).toBe(true);
  });

  it("keeps query failures fail-closed and does not invent awards for an empty validated set", async () => {
    const insert = vi.fn().mockResolvedValue(true);
    const supabase = createSupabase({
      participantResult: { data: null, error: { message: "participants unavailable" } },
      qualityResult: { data: null, error: { message: "quality unavailable" } },
    });
    const result = await awardActionMilestonesForUserWithDependencies(
      supabase,
      "user-1",
      [action()],
      {
        loadValidatedActionIds: vi.fn().mockResolvedValue(new Set()),
        insertProgressionEvent: insert,
      },
    );
    expect(result).toBe(0);
    expect(insert).not.toHaveBeenCalled();

    const empty = await awardActionMilestonesForUserWithDependencies(
      supabase,
      "user-1",
      [],
      {
        loadValidatedActionIds: vi.fn().mockResolvedValue(new Set()),
        insertProgressionEvent: insert,
      },
    );
    expect(empty).toBe(0);
  });

  it("records participant and quality read failures while still requiring proven organizer facts", async () => {
    const insert = vi.fn().mockResolvedValue(false);
    organizersMock.mockResolvedValue(["user-1"]);
    const result = await awardActionMilestonesForUserWithDependencies(
      createSupabase({
        participantResult: { data: null, error: { message: "participants unavailable" } },
        qualityResult: { data: null, error: { message: "quality unavailable" } },
      }),
      "user-1",
      [action()],
      {
        loadValidatedActionIds: vi.fn().mockResolvedValue(new Set(["action-1"])),
        insertProgressionEvent: insert,
      },
    );
    expect(result).toBe(0);
    expect(logFailureMock).toHaveBeenCalledTimes(2);
  });

  it("accepts a supplied quality snapshot and tolerates organizer lookup failure", async () => {
    organizersMock.mockRejectedValue(new Error("organizer read failed"));
    const insert = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
    const result = await awardActionMilestonesForUserWithDependencies(
      createSupabase({}),
      "user-1",
      [action()],
      {
        loadValidatedActionIds: vi.fn().mockResolvedValue(new Set(["action-1"])),
        insertProgressionEvent: insert,
      },
      { validationQualityGrades: new Map([["action-1", "A"]]) },
    );
    expect(result).toBe(0);
  });
});
