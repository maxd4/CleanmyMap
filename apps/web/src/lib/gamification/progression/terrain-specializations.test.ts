import { describe, expect, it } from "vitest";
import {
  buildTerrainSpecializationFacts,
  buildTerrainSpecializationProgressions,
  nextTerrainSpecializationThreshold,
  specializationThresholdForCount,
  TERRAIN_SPECIALIZATIONS,
  TERRAIN_SPECIALIZATION_RULES_VERSION,
  thresholdsReachedByCount,
  type TerrainSpecializationEvidence,
} from "./terrain-specializations";
import { loadTerrainSpecializationEvidence } from "./terrain-specialization-evidence";
import { CURRENT_INFINITE_PROGRESSIONS, GAMIFICATION_REGISTRY } from "./progression-utils";
import { computeExpectedGamificationState } from "./gamification-reconstruction";
import { GAMIFICATION_RULES_V1 } from "./gamification-rules";

function evidence(
  actionId: string,
  roleCode: TerrainSpecializationEvidence["roleCode"],
  actionDate: string,
  attestationRevision = 1,
): TerrainSpecializationEvidence {
  const definition = TERRAIN_SPECIALIZATIONS.find((candidate) => candidate.roleCode === roleCode)!;
  return {
    actionId,
    actionDate,
    actionCreatedAt: `${actionDate}T10:00:00Z`,
    specializationId: definition.id,
    roleCode,
    attestationId: `attestation-${actionId}-${roleCode}`,
    attestationRevision,
    provenance: "planned_assignment",
  };
}

describe("terrain specializations", () => {
  it("uses deterministic infinite thresholds", () => {
    expect([0, 1, 2, 3, 5, 10, 20, 30, 40, 41, 100].map(specializationThresholdForCount)).toEqual([
      1, 1, 1, 3, 5, 10, 20, 30, 40, 40, 100,
    ]);
    expect([0, 1, 2, 3, 5, 10, 20, 30, 40].map(nextTerrainSpecializationThreshold)).toEqual([
      1, 3, 3, 5, 10, 20, 30, 40, 50,
    ]);
    expect(thresholdsReachedByCount(45)).toEqual([1, 3, 5, 10, 20, 30, 40]);
    expect(thresholdsReachedByCount(1000).at(-1)).toBe(1000);
  });

  it("keeps the seven canonical responsibilities and their versioned XP rates", () => {
    expect(TERRAIN_SPECIALIZATIONS.map((item) => [item.id, item.xpPerTier])).toEqual([
      ["organizer_primary", 1],
      ["coorganizer", 0.75],
      ["group_lead", 0.5],
      ["cigarette_butts", 0.4],
      ["recyclables", 0.25],
      ["household_waste", 0.25],
      ["glass", 0.25],
    ]);
    expect(TERRAIN_SPECIALIZATION_RULES_VERSION).toBe("terrain-specializations-2026.10-v1");
    expect(CURRENT_INFINITE_PROGRESSIONS).toHaveLength(10);
    expect(GAMIFICATION_REGISTRY.filter((entry) => entry.id.startsWith("terrain_specialization:"))).toHaveLength(7);
    expect(GAMIFICATION_REGISTRY.filter((entry) => entry.id.startsWith("terrain_specialization:")).map((entry) => entry.progressionId)).toEqual([
      "organisation", "organisation", "participation", "participation", "participation", "participation", "participation",
    ]);
  });

  it("counts each action/role once and retains all badges while crediting only the highest bonus per action", () => {
    const facts = buildTerrainSpecializationFacts("user-1", [
      evidence("action-1", "organizer_primary", "2026-01-01"),
      evidence("action-1", "coorganizer", "2026-01-01"),
      evidence("action-1", "group_lead", "2026-01-01"),
      evidence("action-1", "group_lead", "2026-01-01", 2),
      evidence("action-2", "coorganizer", "2026-01-02"),
      evidence("action-3", "coorganizer", "2026-01-03"),
    ]);

    expect(facts).toHaveLength(4);
    expect(facts.map((fact) => fact.xpAwarded).sort((a, b) => b! - a!)).toEqual([1, 0.75, 0, 0]);
    expect(facts.every((fact) => fact.sourceId.includes(TERRAIN_SPECIALIZATION_RULES_VERSION))).toBe(true);
    expect(facts.find((fact) => fact.mechanicId === "terrain_specialization:organizer_primary")?.metadata).toMatchObject({
      specializedXpCredited: true,
      creditedSpecializationId: "organizer_primary",
    });
    expect(facts.find((fact) => fact.mechanicId === "terrain_specialization:coorganizer")?.metadata).toMatchObject({
      specializedXpCredited: false,
      creditedSpecializationId: "organizer_primary",
    });
  });

  it("reconstructs retroactive ordering and progress without depending on load order", () => {
    const input = [
      evidence("action-3", "coorganizer", "2026-01-03"),
      evidence("action-1", "coorganizer", "2026-01-01"),
      evidence("action-2", "coorganizer", "2026-01-02"),
    ];
    const first = buildTerrainSpecializationFacts("user-1", input);
    const second = buildTerrainSpecializationFacts("user-1", [...input].reverse());
    expect(second).toEqual(first);
    expect(first[0]?.threshold).toBe(1);
    expect(buildTerrainSpecializationProgressions(input).find((item) => item.id === "coorganizer")).toMatchObject({
      verifiedActionCount: 3,
      currentTier: 3,
      nextThreshold: 5,
      actionsRemaining: 2,
      xpObtained: 0,
    });
  });

  it("keeps the existing organization reward separate from specialization XP", () => {
    const specializedFact = buildTerrainSpecializationFacts("user-1", [
      evidence("action-1", "organizer_primary", "2026-01-01"),
    ])[0]!;
    const state = computeExpectedGamificationState("user-1", {
      userId: "user-1",
      sourceFacts: [
        {
          mechanicId: "organisation",
          eventType: "action_declare_validation",
          sourceTable: "actions",
          sourceId: "action-1",
          occurredOn: "2026-01-01",
          xpAwarded: 1,
        },
        specializedFact,
      ],
    }, GAMIFICATION_RULES_V1);

    expect(state.events.filter((event) => event.sourceTable === "actions")).toHaveLength(1);
    expect(state.events.find((event) => event.mechanicId === "organisation")?.xpAwarded).toBe(1);
    expect(state.events.find((event) => event.mechanicId === "terrain_specialization:organizer_primary")?.xpAwarded).toBe(1);
  });

  it("retracts corrected or removed attestations without leaving a reward candidate", () => {
    const initial = buildTerrainSpecializationFacts("user-1", [
      evidence("action-1", "glass_bag_lead", "2026-01-01", 1),
    ]);
    const corrected = buildTerrainSpecializationFacts("user-1", [
      evidence("action-1", "glass_bag_lead", "2026-01-01", 2),
    ]);
    expect(initial).toHaveLength(1);
    expect(corrected).toHaveLength(1);
    expect(corrected[0]?.sourceId).toBe(initial[0]?.sourceId);
    expect(corrected[0]?.metadata?.attestationRevision).toBe(2);
    expect(buildTerrainSpecializationFacts("user-1", [])).toEqual([]);
    expect(buildTerrainSpecializationFacts("user-1", initial.map(() => evidence("action-2", "glass_bag_lead", "2026-01-02")))).toHaveLength(1);
  });

  it("requires current confirmation, final action lifecycle and confirmed participation", async () => {
    const attestations = [
      {
        id: "att-good", action_id: "action-good", user_id: "user-1", role_code: "group_lead",
        verification_status: "confirmed", responsibility_provenance: "planned_assignment", provenance_snapshot: {}, revision: 1,
      },
      {
        id: "att-pending", action_id: "action-pending", user_id: "user-1", role_code: "group_lead",
        verification_status: "pending", responsibility_provenance: "planned_assignment", provenance_snapshot: {}, revision: 1,
      },
      {
        id: "att-no-presence", action_id: "action-no-presence", user_id: "user-1", role_code: "group_lead",
        verification_status: "confirmed", responsibility_provenance: "planned_assignment", provenance_snapshot: {}, revision: 1,
      },
      {
        id: "att-bad-organizer", action_id: "action-organizer", user_id: "user-1", role_code: "organizer_primary",
        verification_status: "confirmed", responsibility_provenance: "planned_assignment",
        provenance_snapshot: { targetOrganizer: { organizer_clerk_id: "user-1", is_primary: false } }, revision: 1,
      },
      {
        id: "att-cancelled", action_id: "action-cancelled", user_id: "user-1", role_code: "group_lead",
        verification_status: "confirmed", responsibility_provenance: "retrospective_claim", provenance_snapshot: {}, revision: 1,
      },
      {
        id: "att-rejected", action_id: "action-rejected", user_id: "user-1", role_code: "group_lead",
        verification_status: "confirmed", responsibility_provenance: "retrospective_claim", provenance_snapshot: {}, revision: 1,
      },
      {
        id: "att-hidden", action_id: "action-hidden", user_id: "user-1", role_code: "group_lead",
        verification_status: "confirmed", responsibility_provenance: "retrospective_claim", provenance_snapshot: {}, revision: 1,
      },
    ];
    const actions = [
      { id: "action-good", action_date: "2026-01-01", created_at: "2026-01-01T10:00:00Z", status: "approved", action_phase: "post_action_complete", published_at: "2026-01-02T10:00:00Z", moderation_visibility: "visible" },
      { id: "action-pending", action_date: "2026-01-02", created_at: "2026-01-02T10:00:00Z", status: "approved", action_phase: "post_action_complete", published_at: "2026-01-02T10:00:00Z", moderation_visibility: "visible" },
      { id: "action-no-presence", action_date: "2026-01-03", created_at: "2026-01-03T10:00:00Z", status: "approved", action_phase: "post_action_complete", published_at: "2026-01-03T10:00:00Z", moderation_visibility: "visible" },
      { id: "action-organizer", action_date: "2026-01-04", created_at: "2026-01-04T10:00:00Z", status: "approved", action_phase: "post_action_complete", published_at: "2026-01-04T10:00:00Z", moderation_visibility: "visible" },
      { id: "action-cancelled", action_date: "2026-01-05", created_at: "2026-01-05T10:00:00Z", status: "cancelled", action_phase: "post_action_complete", published_at: "2026-01-05T10:00:00Z", moderation_visibility: "visible" },
      { id: "action-rejected", action_date: "2026-01-06", created_at: "2026-01-06T10:00:00Z", status: "rejected", action_phase: "post_action_complete", published_at: "2026-01-06T10:00:00Z", moderation_visibility: "visible" },
      { id: "action-hidden", action_date: "2026-01-07", created_at: "2026-01-07T10:00:00Z", status: "approved", action_phase: "post_action_complete", published_at: "2026-01-07T10:00:00Z", moderation_visibility: "hidden" },
    ];
    const supabase = {
      from(table: string) {
        const filters: Record<string, unknown> = {};
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: (column: string, value: unknown) => { filters[column] = value; return chain; },
          in: (column: string, value: unknown) => { filters[column] = value; return chain; },
          limit: () => Promise.resolve({
            data: table === "action_role_attestations" ? attestations.filter((row) => row.user_id === filters.user_id && row.verification_status === filters.verification_status) : [],
            error: null,
          }),
          then: (resolve: (value: unknown) => unknown) => Promise.resolve({
            data: table === "actions"
              ? actions.filter((row) => (filters.id as string[]).includes(row.id))
              : [{ action_id: "action-good" }, { action_id: "action-cancelled" }, { action_id: "action-rejected" }, { action_id: "action-hidden" }],
            error: null,
          }).then(resolve),
        };
        return chain;
      },
    };

    await expect(loadTerrainSpecializationEvidence(supabase as never, "user-1")).resolves.toEqual([
      expect.objectContaining({ actionId: "action-good", specializationId: "group_lead" }),
    ]);
  });
});
