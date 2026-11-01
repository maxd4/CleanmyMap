import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  seedGroupJoinTestDefaults,
} from "@/__tests__/support/group-join-action-id-route";
import {
  aggregateCigaretteButtsLots,
  MAX_CIGARETTE_BUTTS_COUNT,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
} from "@/lib/waste/cigarette-butts";
import { WASTE_MOISTURE_NORMALIZATION_VERSION } from "@/lib/actions/participation/individual-impact";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  loadActionOrganizerIdsForActionMock,
  appendActionModerationAuditMock,
} = groupJoinMocks;

async function patchParticipantImpact(payload: Record<string, unknown>, rawBody?: string, actionId = "action-1") {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request(`http://localhost/api/actions/${actionId}/participant-impact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(payload),
    }),
    { params: Promise.resolve({ actionId }) },
  );
}

function createParticipantWithStatus(participation_status: "pending" | "confirmed") {
  return createGroupJoinParticipant({
    id: "participant-1",
    action_id: "action-1",
    user_id: "participant-user",
    created_at: "2026-09-26T10:00:00.000Z",
    participation_status,
  });
}

function configureParticipantImpactSupabase(
  participants: ReturnType<typeof createGroupJoinParticipant>[],
  createdByClerkId?: string,
) {
  getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
    action: createGroupJoinAction({
      ...(createdByClerkId ? { createdByClerkId } : {}),
      status: "approved",
    }),
    participants,
  }));
}

describe("PATCH /api/actions/:actionId/participant-impact", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    appendActionModerationAuditMock.mockResolvedValue(undefined);
  });

  it("allows the action organizer, preserves raw values and audits the change", async () => {
    const participants = [createGroupJoinParticipant({
      id: "participant-1",
      action_id: "action-1",
      user_id: "participant-user",
      created_at: "2026-09-26T10:00:00.000Z",
      participation_status: "confirmed",
    })];
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ createdByClerkId: "user-1", status: "approved", actionPhase: "post_action_complete" }),
      participants,
    }));

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 10, condition: "humide", measurementMethod: "balance_au_sol" },
      butts: { count: 7, massKg: 1, condition: "propre" },
      reason: "Pesée vérifiée sur place.",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toMatchObject({
      wasteKg: 10,
      wasteCondition: "humide",
      cigaretteButtsCount: 7,
      cigaretteButtsMassKg: 1,
      cigaretteButtsProvenance: "counted",
      equivalentSecKg: 7,
    });
    expect(participants[0]).toMatchObject({
      individual_waste_kg: 10,
      individual_waste_condition: "humide",
      individual_cigarette_butts_count: 7,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_provenance: "counted",
      individual_impact_measured_by: "user-1",
    });
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "user-1",
      targetActionId: "action-1",
      targetUserId: "participant-user",
      operation: "record_individual_impact_measurement",
      reason: "Pesée vérifiée sur place.",
      previousValue: null,
    }));
  });

  it("records a counted-butts-only measurement and tolerates a progression refresh failure", async () => {
    const participant = createGroupJoinParticipant({
      id: "participant-1",
      action_id: "action-1",
      user_id: "participant-user",
      created_at: "2026-09-26T10:00:00.000Z",
      updated_at: "2026-09-27T10:00:00.000Z",
      participation_status: "confirmed",
    });
    configureParticipantImpactSupabase([participant], "user-1");
    groupJoinMocks.refreshProgressionProfileMock.mockRejectedValueOnce(new Error("refresh unavailable"));

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: 12, massKg: null, condition: "humide" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toMatchObject({
      cigaretteButtsCount: 12,
      cigaretteButtsMassKg: null,
      cigaretteButtsCondition: "humide",
      wasteKg: null,
    });
    expect(participant).toMatchObject({
      individual_cigarette_butts_count: 12,
      individual_cigarette_butts_mass_kg: null,
      individual_cigarette_butts_condition: "humide",
      individual_impact_measured_by: "user-1",
    });
  });

  it("allows an administrator and refuses a non-confirmed participant", async () => {
    authMock.mockResolvedValue({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "admin-1", role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    const participants = [createParticipantWithStatus("pending")];
    configureParticipantImpactSupabase(participants);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(422);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("denies an ordinary participant before mutation", async () => {
    authMock.mockResolvedValue({ userId: "participant-user" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "participant-user", role: "benevole", activeRole: "benevole" });
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    const participants = [createParticipantWithStatus("confirmed")];
    configureParticipantImpactSupabase(participants, "organizer-1");

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(403);
    expect(participants[0]).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated, malformed and empty measurement payloads before persistence", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const unauthenticated = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    expect(unauthenticated.status).toBe(401);

    authMock.mockResolvedValue({ userId: "user-1" });
    const malformedJson = await patchParticipantImpact({}, "{");
    expect(malformedJson.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    const empty = await patchParticipantImpact({ participantId: "participant-1" });
    expect(empty.status).toBe(422);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing action", { action: createGroupJoinAction({ status: "pending" }), participants: [] }, 404],
    ["missing participant", { action: createGroupJoinAction({ status: "approved" }), participants: [] }, 404],
  ])("refuses a %s without mutation", async (_label, fixture, status) => {
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock(fixture));
    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    expect(response.status).toBe(status);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("maps a persistence failure to an error response and leaves audit absent", async () => {
    const participants = [createParticipantWithStatus("confirmed")];
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved", actionPhase: "post_action_complete" }),
      participants,
      errors: { participantUpdate: "write failed" },
    }));
    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("rejects an empty action identifier and preserves an existing measurement when only one measure changes", async () => {
    await expect(patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    }, undefined, "   ")).resolves.toMatchObject({ status: 422 });
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();

    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_waste_kg: 8,
      individual_waste_condition: "humide",
      individual_waste_measurement_method: "balance_au_sol",
      individual_cigarette_butts_count: 4,
      individual_cigarette_butts_mass_kg: null,
      individual_cigarette_butts_condition: "propre",
    });
    configureParticipantImpactSupabase([participant]);
    const response = await patchParticipantImpact({ participantId: "participant-1", waste: null });
    expect(response.status).toBe(200);
    expect(participant).toMatchObject({
      individual_waste_kg: null,
      individual_cigarette_butts_count: 4,
      individual_cigarette_butts_condition: "propre",
    });
  });

  it("maps action and participant lookup dependency failures without auditing", async () => {
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      errors: { actionLookup: "action lookup failed" },
    }));
    await expect(patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    })).resolves.toMatchObject({ status: 500 });

    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants: [createParticipantWithStatus("confirmed")],
      errors: { participantLookup: "participant lookup failed" },
    }));
    await expect(patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: 1, condition: "propre" },
    })).resolves.toMatchObject({ status: 500 });
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("rejects an empty cigarette-butts measurement before touching persistence", async () => {
    configureParticipantImpactSupabase([createParticipantWithStatus("confirmed")]);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: null, massKg: null, condition: "propre" },
    });

    expect(response.status).toBe(422);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("reuses existing measurements when the payload supplies only the other measure", async () => {
    const participantWithWaste = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_waste_kg: 8,
      individual_waste_condition: null,
      individual_waste_measurement_method: null,
    });
    configureParticipantImpactSupabase([participantWithWaste]);
    const wasteFallbackResponse = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: 3, massKg: null, condition: "propre" },
    });
    expect(wasteFallbackResponse.status).toBe(200);
    expect(participantWithWaste).toMatchObject({
      individual_waste_kg: 8,
      individual_waste_condition: null,
      individual_waste_measurement_method: null,
    });

    const participantWithButts = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 2,
      individual_cigarette_butts_condition: null,
    });
    configureParticipantImpactSupabase([participantWithButts]);
    const buttsFallbackResponse = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    expect(buttsFallbackResponse.status).toBe(200);
    expect(participantWithButts).toMatchObject({
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 2,
      individual_cigarette_butts_condition: null,
    });
  });

  it("preserves a historical 600/L lot when PATCH changes only waste", async () => {
    const historicalLots = aggregateCigaretteButtsLots([
      { id: "historical-volume", source: "volume_l", value: 1, condition: "propre" },
    ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });
    const action = createGroupJoinAction({ status: "approved", actionPhase: "post_action_complete" });
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_cigarette_butts_count: historicalLots.summary.totalCount,
      individual_cigarette_butts_mass_kg: historicalLots.summary.totalMassKg,
      individual_cigarette_butts_condition: "propre",
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_conversion_version: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
      individual_cigarette_butts_lots: historicalLots,
    });
    configureParticipantImpactSupabase([participant]);
    const beforeActionTotal = (action as Record<string, unknown>).cigarette_butts;

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 2, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(200);
    expect(participant).toMatchObject({
      individual_cigarette_butts_count: 600,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_conversion_version: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
      individual_cigarette_butts_lots: historicalLots,
    });
    expect((action as Record<string, unknown>).cigarette_butts).toBe(beforeActionTotal);
  });

  it("preserves null historical versions when PATCH changes only waste", async () => {
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_waste_kg: 8,
      individual_waste_condition: "sec",
      individual_waste_measurement_method: "balance_au_sol",
      individual_waste_normalization_version: null,
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
      individual_cigarette_butts_provenance: "measured",
      individual_cigarette_butts_conversion_version: null,
    });
    configureParticipantImpactSupabase([participant]);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 9, condition: "humide", measurementMethod: "balance_au_sol" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toMatchObject({
      cigaretteButtsMassKg: 1,
      cigaretteButtsConversionVersion: null,
      comparableButtsCount: null,
      wasteNormalizationVersion: WASTE_MOISTURE_NORMALIZATION_VERSION,
    });
    expect(participant).toMatchObject({
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_conversion_version: null,
      individual_waste_normalization_version: WASTE_MOISTURE_NORMALIZATION_VERSION,
    });
  });

  it("preserves a different historical waste version when PATCH changes only butts", async () => {
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_waste_kg: 8,
      individual_waste_condition: "humide",
      individual_waste_measurement_method: "balance_au_sol",
      individual_waste_normalization_version: "historical-waste-normalization-v0",
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: null,
      individual_cigarette_butts_condition: null,
    });
    configureParticipantImpactSupabase([participant]);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: 12, massKg: null, condition: "propre" },
    });

    expect(response.status).toBe(200);
    expect(participant).toMatchObject({
      individual_waste_kg: 8,
      individual_waste_normalization_version: "historical-waste-normalization-v0",
      individual_cigarette_butts_count: 12,
    });
  });

  it("assigns the current mass version for a new mass measurement", async () => {
    const participant = createParticipantWithStatus("confirmed");
    configureParticipantImpactSupabase([participant]);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { massKg: 1, condition: "humide" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toMatchObject({
      cigaretteButtsCount: null,
      comparableButtsCount: 2_000,
      cigaretteButtsConversionVersion: "impact-terrain-2026-butts-mass-v2",
    });
    expect(participant).toMatchObject({
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_conversion_version: "impact-terrain-2026-butts-mass-v2",
    });
  });

  it("does not invent missing waste or butt qualifiers during an independent PATCH", async () => {
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_waste_kg: 8,
      individual_waste_condition: null,
      individual_waste_measurement_method: null,
      individual_cigarette_butts_count: 4,
      individual_cigarette_butts_mass_kg: null,
      individual_cigarette_butts_condition: null,
      individual_cigarette_butts_provenance: "counted",
    });
    configureParticipantImpactSupabase([participant]);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 9, condition: "humide", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(200);
    expect(participant).toMatchObject({
      individual_cigarette_butts_count: 4,
      individual_cigarette_butts_condition: null,
      individual_waste_kg: 9,
    });
  });

  it("accepts the public individual-lot limit exactly and leaves the action total untouched", async () => {
    const action = createGroupJoinAction({ status: "approved", actionPhase: "post_action_complete" });
    const participant = createParticipantWithStatus("confirmed");
    configureParticipantImpactSupabase([participant]);
    const beforeActionTotal = (action as Record<string, unknown>).cigarette_butts;

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: {
        lots: [
          { id: "count-a", source: "count", value: MAX_CIGARETTE_BUTTS_COUNT, condition: "propre" },
        ],
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact.cigaretteButtsCount).toBe(MAX_CIGARETTE_BUTTS_COUNT);
    expect(participant).toMatchObject({
      individual_cigarette_butts_count: MAX_CIGARETTE_BUTTS_COUNT,
      individual_cigarette_butts_lots: expect.any(Object),
    });
    expect((action as Record<string, unknown>).cigarette_butts).toBe(beforeActionTotal);
  });

  it("rejects an individual-lot total above the public limit without writing or auditing", async () => {
    const participant = createParticipantWithStatus("confirmed");
    configureParticipantImpactSupabase([participant]);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: {
        lots: [
          { id: "count-a", source: "count", value: MAX_CIGARETTE_BUTTS_COUNT + 1, condition: "propre" },
        ],
      },
    });

    expect(response.status).toBe(422);
    expect(participant).not.toHaveProperty("individual_cigarette_butts_count");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("refuses a participant that loses confirmation before the atomic write", async () => {
    const participant = createParticipantWithStatus("confirmed");
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants: [participant],
    });
    const rpc = supabase.rpc as { mockImplementationOnce: (implementation: () => Promise<unknown>) => unknown };
    rpc.mockImplementationOnce(async () => {
      participant.participation_status = "cancelled";
      return { data: { ok: false, code: "impact_target_not_eligible" }, error: null };
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(409);
    expect(participant).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
    expect(groupJoinMocks.refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

  it("refuses an action that becomes ineligible before the atomic write", async () => {
    const action = createGroupJoinAction({ status: "approved" });
    const participant = createParticipantWithStatus("confirmed");
    const supabase = createGroupJoinSupabaseMock({ action, participants: [participant] });
    const rpc = supabase.rpc as { mockImplementationOnce: (implementation: () => Promise<unknown>) => unknown };
    rpc.mockImplementationOnce(async () => {
      action.status = "cancelled";
      return { data: { ok: false, code: "impact_target_not_eligible" }, error: null };
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(409);
    expect(participant).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("retries a stale partial PATCH from the fresh participant revision without losing an independent change", async () => {
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      updated_at: "2026-11-01T10:00:00.000Z",
      individual_waste_kg: 8,
      individual_waste_condition: "sec",
      individual_waste_measurement_method: "balance_au_sol",
    });
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants: [participant],
    }) as {
      rpc: { mockImplementationOnce: (implementation: () => Promise<unknown>) => unknown; mock: { calls: unknown[][] } };
    };
    getSupabaseServerClientMock.mockReturnValue(supabase);
    supabase.rpc.mockImplementationOnce(async () => {
      participant.individual_waste_kg = 9;
      participant.updated_at = "2026-11-01T10:00:01.000Z";
      return { data: { ok: false, code: "revision_conflict" }, error: null };
    });

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: 12, massKg: null, condition: "propre" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toMatchObject({ wasteKg: 9, cigaretteButtsCount: 12 });
    expect(participant).toMatchObject({
      individual_waste_kg: 9,
      individual_cigarette_butts_count: 12,
    });
    expect(supabase.rpc.mock.calls).toHaveLength(2);
    expect(supabase.rpc.mock.calls[1]?.[1]).toMatchObject({
      p_expected_participant_updated_at: "2026-11-01T10:00:01.000Z",
    });
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
  });

  it("returns a distinct conflict after the bounded retry and emits no side effect", async () => {
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      updated_at: "2026-11-01T11:00:00.000Z",
    });
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants: [participant],
    }) as {
      rpc: { mockImplementation: (implementation: () => Promise<unknown>) => unknown };
    };
    getSupabaseServerClientMock.mockReturnValue(supabase);
    supabase.rpc.mockImplementation(async () => ({
      data: { ok: false, code: "revision_conflict" },
      error: null,
    }));

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ code: "revision_conflict" });
    expect(participant).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
    expect(groupJoinMocks.refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

  it("treats an identical replay as a no-op without duplicating the audit or progression refresh", async () => {
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      updated_at: "2026-11-01T11:30:00.000Z",
    });
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants: [participant],
    });
    let callCount = 0;
    supabase.rpc.mockImplementation(async (_functionName, args) => {
      callCount += 1;
      if (callCount === 2) {
        return {
          data: { ok: true, changed: false, id: participant.id, updatedAt: participant.updated_at, userId: participant.user_id },
          error: null,
        };
      }
      for (const [key, value] of Object.entries(args ?? {})) {
        if (key.startsWith("p_individual_")) {
          (participant as Record<string, unknown>)[key.slice(2)] = value;
        }
      }
      return {
        data: { ok: true, changed: true, id: participant.id, updatedAt: participant.updated_at, userId: participant.user_id },
        error: null,
      };
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const payload = {
      participantId: "participant-1",
      butts: { count: 12, massKg: null, condition: "propre" },
    };
    expect((await patchParticipantImpact(payload)).status).toBe(200);
    expect((await patchParticipantImpact(payload)).status).toBe(200);

    expect(callCount).toBe(2);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(groupJoinMocks.refreshProgressionProfileMock).toHaveBeenCalledTimes(1);
  });

  it("stops the retry when the participant is cancelled after the stale read", async () => {
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      updated_at: "2026-11-01T12:00:00.000Z",
    });
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants: [participant],
    }) as {
      rpc: { mockImplementationOnce: (implementation: () => Promise<unknown>) => unknown };
    };
    getSupabaseServerClientMock.mockReturnValue(supabase);
    supabase.rpc.mockImplementationOnce(async () => {
      participant.participation_status = "cancelled";
      participant.updated_at = "2026-11-01T12:00:01.000Z";
      return { data: { ok: false, code: "revision_conflict" }, error: null };
    });

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(422);
    expect(participant).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
    expect(groupJoinMocks.refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

  it("rechecks organizer eligibility before writing", async () => {
    const action = createGroupJoinAction({ createdByClerkId: "owner-1", status: "approved" });
    const participant = createParticipantWithStatus("confirmed");
    const supabase = createGroupJoinSupabaseMock({ action, participants: [participant] });
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(409);
    expect(participant).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("keeps a cleared measurement explicitly empty and does not stamp an actor", async () => {
    const participant = createParticipantWithStatus("confirmed");
    configureParticipantImpactSupabase([participant]);

    const response = await patchParticipantImpact({ participantId: "participant-1", waste: null });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toBeNull();
    expect(participant).toMatchObject({
      individual_impact_measured_by: null,
      individual_impact_measured_at: null,
    });
  });

  it("persists mixed lots as one server-calculated attribution and leaves the action total untouched", async () => {
    const action = createGroupJoinAction({ status: "approved", actionPhase: "post_action_complete" });
    const participant = createParticipantWithStatus("confirmed");
    configureParticipantImpactSupabase([participant]);
    const beforeActionTotal = (action as Record<string, unknown>).cigarette_butts;

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: {
        lots: [
          { id: "count", source: "count", value: 100, condition: "propre" },
          { id: "mass", source: "mass_kg", value: 0.1, condition: "humide" },
          { id: "volume", source: "volume_l", value: 1, condition: "mouille" },
        ],
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toMatchObject({
      comparableButtsCount: 1_000,
      cigaretteButtsLots: expect.objectContaining({
        lots: expect.arrayContaining([
          expect.objectContaining({ id: "count", source: "count", value: 100 }),
          expect.objectContaining({ id: "mass", source: "mass_kg", value: 0.1 }),
          expect.objectContaining({ id: "volume", source: "volume_l", value: 1 }),
        ]),
        summary: expect.objectContaining({ totalCount: 1_000, measuredMassKg: 0.1, totalVolumeLiters: 1 }),
      }),
    });
    expect(participant).toMatchObject({
      individual_cigarette_butts_count: 1_000,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: expect.objectContaining({
        results: expect.arrayContaining([expect.objectContaining({ volumeConversionFormulaVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION })]),
      }),
    });
    expect((action as Record<string, unknown>).cigarette_butts).toBe(beforeActionTotal);
  });

  it("replaces and then deletes individual lots without treating legacy fields as separate lots", async () => {
    const first = aggregateCigaretteButtsLots([{ id: "first", source: "count", value: 10, condition: "propre" }]);
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_cigarette_butts_count: first.summary.totalCount,
      individual_cigarette_butts_mass_kg: first.summary.totalMassKg,
      individual_cigarette_butts_lots: first,
    });
    configureParticipantImpactSupabase([participant]);

    const replacement = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { lots: [{ id: "replacement", source: "volume_l", value: 0, condition: "propre" }] },
    });
    expect(replacement.status).toBe(200);
    expect(participant.individual_cigarette_butts_lots).toMatchObject({
      lots: [{ id: "replacement", source: "volume_l", value: 0 }],
    });
    expect((await replacement.json()).individualImpact.comparableButtsCount).toBe(0);

    const cleared = await patchParticipantImpact({ participantId: "participant-1", butts: null });
    expect(cleared.status).toBe(200);
    expect(participant).toMatchObject({
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: null,
      individual_cigarette_butts_lots: null,
    });
  });

  it("rejects a payload that combines legacy scalar fields and lots", async () => {
    configureParticipantImpactSupabase([createParticipantWithStatus("confirmed")]);
    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: {
        count: 10,
        massKg: null,
        condition: "propre",
        lots: [{ id: "ambiguous", source: "count", value: 10, condition: "propre" }],
      },
    });
    expect(response.status).toBe(422);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("refuses a legacy replacement when the participant already has canonical lots", async () => {
    const lots = aggregateCigaretteButtsLots([{ id: "existing", source: "count", value: 12, condition: "propre" }]);
    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_cigarette_butts_count: lots.summary.totalCount,
      individual_cigarette_butts_mass_kg: lots.summary.totalMassKg,
      individual_cigarette_butts_lots: lots,
    });
    configureParticipantImpactSupabase([participant]);
    const response = await patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: 1, massKg: null, condition: "propre" },
    });
    expect(response.status).toBe(422);
    expect(participant.individual_cigarette_butts_lots).toMatchObject({ lots: [{ id: "existing" }] });
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });
});
