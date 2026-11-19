import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildPersonalEngagementProofProjectionFromSources,
  loadPersonalEngagementProofProjection,
} from "./engagement-proof-projection";
import type {
  RawActionRow,
  RawParticipantRow,
  RawRoleAttestationRow,
  RawSpogomiAttestationRow,
  RawSpogomiEventRow,
  RawSpogomiParticipantRow,
} from "./engagement-proof-projection.helpers";

function makeAction(overrides: Partial<RawActionRow> = {}): RawActionRow {
  return {
    id: "action-1",
    created_at: "2026-05-10T14:00:00Z",
    action_date: "2026-05-10",
    location_label: "Canal Saint-Martin, Paris 10e",
    department_code: "75",
    department_name: "Paris",
    actor_name: "Collectif Canal Propre",
    organizer_name: "Association Canal Vivant",
    organizer_type: "association",
    action_context: "citizen",
    status: "approved",
    action_phase: "post_action_complete",
    published_at: "2026-05-10T16:00:00Z",
    cancelled_at: null,
    moderation_visibility: "visible",
    access_mode: "public",
    data_provenance: "real",
    duration_minutes: 150,
    volunteers_count: 18,
    waste_kg: 42.5,
    cigarette_butts: 3200,
    notes: null,
    preparation_data: {
      actionTitle: "Nettoyage de printemps Canal Saint-Martin",
      durationMinutesDeclared: true,
    },
    ...overrides,
  };
}

function makeParticipant(overrides: Partial<RawParticipantRow> = {}): RawParticipantRow {
  return {
    id: "part-1",
    action_id: "action-1",
    user_id: "user-1",
    joined_at: "2026-05-10T17:00:00Z",
    created_at: "2026-05-10T17:00:00Z",
    updated_at: "2026-05-10T17:00:00Z",
    participation_status: "confirmed",
    participation_source: "post_action_claim",
    individual_waste_kg: null,
    individual_cigarette_butts_count: null,
    ...overrides,
  };
}

function makeRoleAttestation(
  overrides: Partial<RawRoleAttestationRow> = {},
): RawRoleAttestationRow {
  return {
    id: "att-1",
    action_id: "action-1",
    user_id: "user-1",
    role_code: "group_lead",
    verification_status: "confirmed",
    decided_at: "2026-05-11T09:00:00Z",
    responsibility_provenance: "planned_assignment",
    provenance_snapshot: {},
    revision: 1,
    ...overrides,
  };
}

function createSupabaseMock(params: {
  action_participants?: RawParticipantRow[];
  actions?: RawActionRow[];
  action_role_attestations?: RawRoleAttestationRow[];
  spogomi_participants?: RawSpogomiParticipantRow[];
  spogomi_events?: RawSpogomiEventRow[];
  spogomi_recognition_attestations?: RawSpogomiAttestationRow[];
  failTable?: string;
  failMessage?: string;
}) {
  const from = vi.fn((table: string) => {
    const filters: Array<{ op: "eq" | "in"; col: string; val: unknown }> = [];
    const execute = async () => {
      if (params.failTable === table) {
        return {
          data: null,
          error: { message: params.failMessage ?? `${table} unavailable` },
        };
      }
      const rawRows =
        ((params as Record<string, unknown[]>)[table] as Array<Record<string, unknown>>) ?? [];
      const filtered = rawRows.filter((row) =>
        filters.every((filter) => {
          if (filter.op === "eq") return row[filter.col] === filter.val;
          if (filter.op === "in" && Array.isArray(filter.val)) {
            return filter.val.includes(row[filter.col]);
          }
          return true;
        }),
      );
      return { data: filtered, error: null };
    };

    const chain: Record<string, unknown> = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, val: unknown) => {
        filters.push({ op: "eq", col, val });
        return chain;
      }),
      in: vi.fn((col: string, val: unknown) => {
        filters.push({ op: "in", col, val });
        return chain;
      }),
      limit: vi.fn(() => chain),
      then: (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => execute().then(resolve, reject),
    };
    return chain;
  });

  return { supabase: { from } as never, from };
}

describe("engagement-proof-projection", () => {
  it("isolates projections strictly by owner account and never leaks peer or reviewer data", async () => {
    const fixture = createSupabaseMock({
      action_participants: [
        makeParticipant({ id: "p-1", user_id: "user-1", action_id: "action-1" }),
        makeParticipant({ id: "p-2", user_id: "user-2", action_id: "action-1" }),
        makeParticipant({ id: "p-3", user_id: "user-2", action_id: "action-2" }),
      ],
      actions: [
        makeAction({ id: "action-1" }),
        makeAction({ id: "action-2", location_label: "Parc de Bercy" }),
      ],
      action_role_attestations: [
        makeRoleAttestation({
          id: "att-u1",
          user_id: "user-1",
          action_id: "action-1",
          role_code: "group_lead",
          provenance_snapshot: { reviewerSecret: "user_reviewer_999" },
        }),
        makeRoleAttestation({
          id: "att-u2",
          user_id: "user-2",
          action_id: "action-1",
          role_code: "cigarette_bag_lead",
        }),
      ],
    });

    const projection = await loadPersonalEngagementProofProjection(
      fixture.supabase,
      "user-1",
      { now: new Date("2026-06-01T10:00:00Z") },
    );

    expect(projection.status).toBe("available");
    expect(projection.ownerUserId).toBe("user-1");
    expect(projection.participations.value).toHaveLength(1);
    expect(projection.participations.value?.[0]?.actionId).toBe("action-1");
    expect(projection.missions.value).toHaveLength(1);
    expect(projection.missions.value?.[0]?.missionId).toBe("action_role:att-u1");

    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain("user-2");
    expect(serialized).not.toContain("user_reviewer_999");
    expect(projection.privacyAndMethodology).toEqual({
      evaluationMode: "live_on_read_no_cache_no_counter",
      ownerScopedOnly: true,
      peerPersonalDataDisclosed: false,
      reviewerIdentitiesDisclosed: false,
      sensitiveAdministrativeOrMigratoryDataCollected: false,
      individualHoursDeducedFromActionDuration: false,
      certifiedSkillsDeducedFromRoles: false,
      nonCollectorMissionsAttributeZeroCollectionFictitiously: false,
      unavailableDataTurnedIntoZero: false,
    });
  });

  it("deduplicates participations by action_id while keeping multiple attested roles and equivalent SPOGOMI missions", () => {
    const action = makeAction({ id: "action-spogomi-1", action_date: "2026-06-15" });
    const projection = buildPersonalEngagementProofProjectionFromSources({
      userId: "user-1",
      now: new Date("2026-07-01T10:00:00Z"),
      sources: {
        participantRows: [
          makeParticipant({
            id: "part-dup-1",
            action_id: "action-spogomi-1",
            user_id: "user-1",
            joined_at: "2026-06-15T12:00:00Z",
          }),
          makeParticipant({
            id: "part-dup-2",
            action_id: "action-spogomi-1",
            user_id: "user-1",
            joined_at: "2026-06-15T10:00:00Z",
            individual_waste_kg: 3.4,
          }),
        ],
        actions: [action],
        roleAttestations: [
          makeRoleAttestation({
            id: "att-coorg",
            action_id: "action-spogomi-1",
            user_id: "user-1",
            role_code: "coorganizer",
            provenance_snapshot: {
              targetOrganizer: { organizer_clerk_id: "user-1", is_primary: false },
            },
          }),
          makeRoleAttestation({
            id: "att-group",
            action_id: "action-spogomi-1",
            user_id: "user-1",
            role_code: "group_lead",
          }),
        ],
        spogomiParticipants: [
          {
            id: "sp-part-1",
            event_id: "sp-event-1",
            division_id: "div-1",
            clerk_id: "user-1",
            registration_status: "registered",
            attendance_status: "present",
            account_link_status: "verified",
          },
        ],
        spogomiEvents: [
          {
            id: "sp-event-1",
            action_id: "action-spogomi-1",
            name: "SPOGOMI Paris",
            public_visibility: "published",
            state: "certified",
          },
        ],
        spogomiAttestations: [
          {
            id: "sp-att-1",
            event_id: "sp-event-1",
            division_id: "div-1",
            participant_id: "sp-part-1",
            kind: "field_safety",
            status: "certified",
            certified_at: "2026-06-15T18:00:00Z",
            evidence_reference: "spogomi:safety:01",
            certification_version: "v1",
          },
          {
            id: "sp-att-2",
            event_id: "sp-event-1",
            division_id: "div-1",
            participant_id: "sp-part-1",
            kind: "logistics_support",
            status: "certified",
            certified_at: "2026-06-15T18:05:00Z",
            evidence_reference: "spogomi:logistics:01",
            certification_version: "v1",
          },
        ],
      },
    });

    expect(projection.distinctions.presenceConfirmed.value?.confirmedActionCount).toBe(1);
    expect(projection.participations.value).toHaveLength(1);
    expect(projection.distinctions.attestedMissions.value?.attestedMissionCount).toBe(4);
    expect(
      projection.distinctions.attestedMissions.value?.actionsWithAttestedMissionCount,
    ).toBe(1);
    expect(
      projection.participations.value?.[0]?.attestedMissions.map((m) => m.roleCode),
    ).toEqual(["coorganizer", "field_safety", "group_lead", "logistics_support"]);
    expect(projection.periods.value?.byYear[0]?.confirmedParticipationsCount).toBe(1);
    expect(projection.periods.value?.byYear[0]?.attestedMissionsCount).toBe(4);
  });

  it("excludes pending/cancelled claims, non-attested roles, simulated test actions, unfinalized actions, hidden actions, and private invite_link actions", () => {
    const projection = buildPersonalEngagementProofProjectionFromSources({
      userId: "user-1",
      sources: {
        participantRows: [
          makeParticipant({ action_id: "act-pending-claim", participation_status: "pending" }),
          makeParticipant({ action_id: "act-cancelled-claim", participation_status: "cancelled" }),
          makeParticipant({ action_id: "act-test-sim", participation_status: "confirmed" }),
          makeParticipant({ action_id: "act-pre-action", participation_status: "confirmed" }),
          makeParticipant({ action_id: "act-hidden", participation_status: "confirmed" }),
          makeParticipant({ action_id: "act-cancelled", participation_status: "confirmed" }),
          makeParticipant({ action_id: "act-private-invite", participation_status: "confirmed" }),
          makeParticipant({ action_id: "act-private-link", participation_status: "confirmed" }),
          makeParticipant({ action_id: "act-valid", participation_status: "confirmed" }),
        ],
        actions: [
          makeAction({ id: "act-pending-claim" }),
          makeAction({ id: "act-cancelled-claim" }),
          makeAction({ id: "act-test-sim", data_provenance: "test" }),
          makeAction({ id: "act-pre-action", action_phase: "pre_action" }),
          makeAction({ id: "act-hidden", moderation_visibility: "hidden" }),
          makeAction({ id: "act-cancelled", cancelled_at: "2026-05-10T12:00:00Z" }),
          makeAction({ id: "act-private-invite", access_mode: "invite_link" }),
          makeAction({ id: "act-private-link", access_mode: "private_link" }),
          makeAction({ id: "act-valid" }),
        ],
        roleAttestations: [
          makeRoleAttestation({
            id: "att-pending",
            action_id: "act-valid",
            verification_status: "pending",
            role_code: "group_lead",
          }),
          makeRoleAttestation({
            id: "att-rejected",
            action_id: "act-valid",
            verification_status: "rejected",
            role_code: "cigarette_bag_lead",
          }),
          makeRoleAttestation({
            id: "att-unconfirmed-action",
            action_id: "act-pending-claim",
            verification_status: "confirmed",
            role_code: "group_lead",
          }),
          makeRoleAttestation({
            id: "att-private-action",
            action_id: "act-private-invite",
            verification_status: "confirmed",
            role_code: "group_lead",
          }),
        ],
        spogomiParticipants: [
          {
            id: "sp-unverified",
            event_id: "ev-1",
            clerk_id: "user-1",
            registration_status: "registered",
            attendance_status: "present",
            account_link_status: "pending",
          },
        ],
        spogomiEvents: [
          {
            id: "ev-1",
            action_id: "act-valid",
            public_visibility: "published",
            state: "certified",
          },
        ],
        spogomiAttestations: [
          {
            id: "sp-att-unverified",
            event_id: "ev-1",
            participant_id: "sp-unverified",
            kind: "referee",
            status: "certified",
            certified_at: "2026-05-10T18:00:00Z",
            evidence_reference: "ref:1",
            certification_version: "v1",
          },
        ],
      },
    });

    expect(projection.participations.value).toHaveLength(1);
    expect(projection.participations.value?.[0]?.actionId).toBe("act-valid");
    expect(projection.missions.value).toHaveLength(0);
    expect(projection.distinctions.attestedMissions.value?.attestedMissionCount).toBe(0);
  });
});

describe("engagement-proof-projection distinctions, live re-evaluation, and errors", () => {
  it("supports accompaniment, awareness, and logistics missions without attributing fictitious waste collection or certified skills", () => {
    const projection = buildPersonalEngagementProofProjectionFromSources({
      userId: "user-1",
      sources: {
        participantRows: [
          makeParticipant({
            action_id: "action-1",
            individual_waste_kg: null,
            individual_cigarette_butts_count: null,
          }),
        ],
        actions: [
          makeAction({
            id: "action-1",
            duration_minutes: 180,
            waste_kg: 95,
            cigarette_butts: 4500,
          }),
        ],
        roleAttestations: [
          makeRoleAttestation({
            id: "att-lead",
            action_id: "action-1",
            role_code: "group_lead",
            verification_status: "confirmed",
          }),
        ],
        spogomiParticipants: [
          {
            id: "sp-p1",
            event_id: "sp-e1",
            clerk_id: "user-1",
            registration_status: "registered",
            attendance_status: "present",
            account_link_status: "verified",
          },
        ],
        spogomiEvents: [
          {
            id: "sp-e1",
            action_id: "action-1",
            public_visibility: "published",
            state: "certified",
          },
        ],
        spogomiAttestations: [
          {
            id: "sp-finish",
            event_id: "sp-e1",
            participant_id: "sp-p1",
            kind: "finish_control",
            status: "certified",
            certified_at: "2026-05-10T18:00:00Z",
            evidence_reference: "finish:01",
            certification_version: "v1",
          },
          {
            id: "sp-logistics",
            event_id: "sp-e1",
            participant_id: "sp-p1",
            kind: "logistics_support",
            status: "certified",
            certified_at: "2026-05-10T18:00:00Z",
            evidence_reference: "logistics:01",
            certification_version: "v1",
          },
        ],
      },
    });

    const item = projection.participations.value?.[0];
    expect(item).toBeDefined();
    expect(item?.attestedMissions).toHaveLength(3);
    for (const mission of item?.attestedMissions ?? []) {
      expect(mission.missionCategory).toBe("accompaniment_awareness_logistics");
      expect(mission.collectionAttributed).toBe(false);
      expect(mission.skillsCertificationClaimed).toBe(false);
    }

    // Personal declaration is unavailable (null), never fabricated from collective waste or turned into 0
    expect(item?.personalDeclaration).toEqual({
      status: "unavailable",
      value: null,
      reason: "no_individual_declaration_recorded",
    });
    expect(projection.distinctions.personalDeclarations).toEqual({
      status: "unavailable",
      value: null,
      reason: "no_individual_declarations_recorded",
    });

    // Verified hours are always unavailable (null), never deduced from the 180-minute action duration
    expect(item?.verifiedHours).toEqual({
      status: "unavailable",
      totalHours: null,
      reason: "action_duration_not_individual_proof",
    });
    expect(projection.distinctions.verifiedHours).toEqual({
      status: "unavailable",
      totalHours: null,
      reason: "individual_attendance_duration_not_measured",
    });

    // Collective results remain strictly separated and marked non-attributable individually
    expect(item?.collectiveResults.individualAttributionAllowed).toBe(false);
    expect(item?.collectiveResults.actionDurationMinutes.value).toBe(180);
    expect(item?.collectiveResults.collectiveWasteKg.value).toBe(95);
  });

  it("never turns unavailable organization or collective metrics into zeros", () => {
    const projection = buildPersonalEngagementProofProjectionFromSources({
      userId: "user-1",
      sources: {
        participantRows: [makeParticipant({ action_id: "action-spontaneous" })],
        actions: [
          makeAction({
            id: "action-spontaneous",
            organizer_name: null,
            actor_name: "Organisateur en attente de compte",
            organizer_type: "spontaneous",
            duration_minutes: 0,
            volunteers_count: null,
            waste_kg: null,
            cigarette_butts: null,
            preparation_data: { durationMinutesDeclared: false },
          }),
        ],
        roleAttestations: [],
        spogomiParticipants: [],
        spogomiEvents: [],
        spogomiAttestations: [],
      },
    });

    const item = projection.participations.value?.[0];
    expect(item?.organization).toEqual({
      status: "unavailable",
      value: null,
      reason: "communicable_organization_not_declared",
    });
    expect(projection.organizations).toEqual({
      status: "unavailable",
      value: null,
      reason: "no_communicable_organization_recorded",
    });
    expect(item?.collectiveResults.actionDurationMinutes).toEqual({
      status: "unavailable",
      value: null,
      reason: "collective_action_duration_not_recorded",
    });
    expect(item?.collectiveResults.collectiveWasteKg).toEqual({
      status: "unavailable",
      value: null,
      reason: "collective_waste_kg_not_recorded",
    });
    expect(item?.collectiveResults.collectiveCigaretteButtsCount).toEqual({
      status: "unavailable",
      value: null,
      reason: "collective_cigarette_butts_not_recorded",
    });
    expect(projection.distinctions.collectiveResults).toEqual({
      status: "unavailable",
      value: null,
      reason: "no_collective_results_recorded",
    });
  });

  it("re-evaluates revocations, organizer snapshot mismatches, and visibility changes live on every read", async () => {
    const initialSources = {
      action_participants: [makeParticipant({ action_id: "action-1" })],
      actions: [makeAction({ id: "action-1" })],
      action_role_attestations: [
        makeRoleAttestation({
          id: "att-primary",
          action_id: "action-1",
          role_code: "organizer_primary",
          verification_status: "confirmed",
          provenance_snapshot: {
            targetOrganizer: { organizer_clerk_id: "user-1", is_primary: true },
          },
          revision: 1,
        }),
      ],
      spogomi_participants: [
        {
          id: "sp-1",
          event_id: "ev-1",
          clerk_id: "user-1",
          registration_status: "registered",
          attendance_status: "present",
          account_link_status: "verified",
        },
      ],
      spogomi_events: [
        {
          id: "ev-1",
          action_id: "action-1",
          public_visibility: "published",
          state: "certified",
        },
      ],
      spogomi_recognition_attestations: [
        {
          id: "sp-att-1",
          event_id: "ev-1",
          participant_id: "sp-1",
          kind: "referee",
          status: "certified",
          certified_at: "2026-05-10T18:00:00Z",
          evidence_reference: "ref:01",
          certification_version: "v1",
        },
      ],
    };

    const firstMock = createSupabaseMock(initialSources);
    const firstRead = await loadPersonalEngagementProofProjection(firstMock.supabase, "user-1");
    expect(firstRead.missions.value).toHaveLength(2);
    const firstReference = firstRead.communicableReferences.value?.[0]?.referenceCode;

    // 1. Revoke the field role attestation and SPOGOMI attestation
    const afterMissionRevocation = createSupabaseMock({
      ...initialSources,
      action_role_attestations: [
        {
          ...initialSources.action_role_attestations[0]!,
          verification_status: "rejected",
          revision: 2,
        },
      ],
      spogomi_recognition_attestations: [
        {
          ...initialSources.spogomi_recognition_attestations[0]!,
          status: "revoked",
        },
      ],
    });
    const secondRead = await loadPersonalEngagementProofProjection(
      afterMissionRevocation.supabase,
      "user-1",
    );
    expect(secondRead.participations.value).toHaveLength(1);
    expect(secondRead.missions.value).toHaveLength(0);
    expect(secondRead.communicableReferences.value?.[0]?.referenceCode).not.toBe(firstReference);

    // 2. Organizer primary attestation with mismatched snapshot (e.g., is_primary = false) is rejected
    const mismatchedOrganizerMock = createSupabaseMock({
      ...initialSources,
      action_role_attestations: [
        {
          ...initialSources.action_role_attestations[0]!,
          provenance_snapshot: {
            targetOrganizer: { organizer_clerk_id: "user-1", is_primary: false },
          },
        },
      ],
      spogomi_recognition_attestations: [],
    });
    const mismatchedRead = await loadPersonalEngagementProofProjection(
      mismatchedOrganizerMock.supabase,
      "user-1",
    );
    expect(mismatchedRead.missions.value).toHaveLength(0);

    // 3. Action visibility changed to hidden or access_mode changed to invite_link removes the participation
    const hiddenActionMock = createSupabaseMock({
      ...initialSources,
      actions: [makeAction({ id: "action-1", moderation_visibility: "hidden" })],
    });
    const hiddenRead = await loadPersonalEngagementProofProjection(
      hiddenActionMock.supabase,
      "user-1",
    );
    expect(hiddenRead.participations.value).toHaveLength(0);
    expect(hiddenRead.distinctions.presenceConfirmed.value?.confirmedActionCount).toBe(0);
  });

  it("surfaces an explicit error state without fabricating empty or zero counts when Supabase fails", async () => {
    const failedParticipants = createSupabaseMock({
      failTable: "action_participants",
      failMessage: "db timeout on action_participants",
    });
    const result1 = await loadPersonalEngagementProofProjection(
      failedParticipants.supabase,
      "user-1",
    );
    expect(result1.status).toBe("error");
    expect(result1.sourceStates.actionParticipants).toBe("error");
    expect(result1.participations).toEqual({
      status: "error",
      value: null,
      reason: "db timeout on action_participants",
    });
    expect(result1.distinctions.presenceConfirmed).toEqual({
      status: "error",
      value: null,
      reason: "db timeout on action_participants",
    });

    const failedAttestations = createSupabaseMock({
      action_participants: [makeParticipant({ action_id: "action-1" })],
      actions: [makeAction({ id: "action-1" })],
      failTable: "action_role_attestations",
      failMessage: "role attestations read failed",
    });
    const result2 = await loadPersonalEngagementProofProjection(
      failedAttestations.supabase,
      "user-1",
    );
    expect(result2.status).toBe("error");
    expect(result2.sourceStates.actionRoleAttestations).toBe("error");
    expect(result2.missions.status).toBe("error");
    expect(result2.missions.value).toBeNull();

    const failedActions = createSupabaseMock({
      action_participants: [makeParticipant({ action_id: "action-1" })],
      failTable: "actions",
      failMessage: "actions read failed",
    });
    const result3 = await loadPersonalEngagementProofProjection(failedActions.supabase, "user-1");
    expect(result3.status).toBe("error");
    expect(result3.sourceStates.actions).toBe("error");

    const failedSpogomi = createSupabaseMock({
      action_participants: [makeParticipant({ action_id: "action-1" })],
      actions: [makeAction({ id: "action-1" })],
      failTable: "spogomi_participants",
      failMessage: "spogomi read failed",
    });
    const result4 = await loadPersonalEngagementProofProjection(failedSpogomi.supabase, "user-1");
    expect(result4.status).toBe("error");
    expect(result4.sourceStates.spogomiEquivalence).toBe("error");

    await expect(
      loadPersonalEngagementProofProjection(failedSpogomi.supabase, "   "),
    ).rejects.toThrow("identifiant du compte est requis");
  });

  it("aggregates multiple actions across periods and organizations with association_name/actor_name fallbacks and cigarette-butt declarations", async () => {
    const mock = createSupabaseMock({
      action_participants: [
        makeParticipant({
          id: "p-1",
          action_id: "action-1",
          individual_waste_kg: 2.5,
          individual_waste_condition: "sec",
          individual_cigarette_butts_count: 150,
          individual_cigarette_butts_provenance: "counted",
        }),
        makeParticipant({
          id: "p-2",
          action_id: "action-2",
          individual_waste_kg: null,
          individual_cigarette_butts_count: 80,
          individual_cigarette_butts_provenance: "counted",
        }),
        makeParticipant({
          id: "p-3",
          action_id: "action-3",
        }),
      ],
      actions: [
        makeAction({
          id: "action-1",
          action_date: "2026-05-10",
          organizer_name: "Association Canal Vivant",
          organizer_type: "association",
          action_context: "citizen",
        }),
        makeAction({
          id: "action-2",
          action_date: "2026-05-24",
          organizer_name: "Association Canal Vivant",
          organizer_type: "association",
          action_context: "school",
        }),
        makeAction({
          id: "action-3",
          action_date: "2025-11-04",
          organizer_name: null,
          actor_name: "Collectif Rive Gauche",
          organizer_type: "collective",
          action_context: "company",
          notes: '[cmm-meta]{"associationName":"Association Rive Gauche"}',
        }),
      ],
      action_role_attestations: [],
      spogomi_participants: [],
    });

    const projection = await loadPersonalEngagementProofProjection(mock.supabase, "user-1");
    expect(projection.status).toBe("available");
    expect(projection.participations.value).toHaveLength(3);
    expect(projection.organizations.value).toHaveLength(2);
    expect(projection.organizations.value?.[0]?.confirmedParticipationsCount).toBe(2);
    expect(projection.organizations.value?.[1]?.name).toBe("Association Rive Gauche");
    expect(projection.periods.value?.byYear).toHaveLength(2);
    expect(projection.periods.value?.byMonth).toHaveLength(2);
    expect(projection.distinctions.personalDeclarations.value?.declaredActionCount).toBe(2);
  });
});
