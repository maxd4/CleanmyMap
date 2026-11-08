import { describe, expect, it } from "vitest";

import {
  isRegulationReadyForCertification,
  validateParticipantState,
  validateResultItem,
  validateSpogomiRegulation,
  validateSubmissionCertification,
  validateTeamComposition,
} from "./validation";
import type { SpogomiRegulation } from "./types";

const incompleteRegulation: SpogomiRegulation = {
  version: "edition-a",
  sourceReference: null,
  status: "incomplete",
  teamSize: { casual: { minMembers: null, maxMembers: null } },
  categories: [
    {
      code: "waste",
      label: "Déchets",
      measurementKind: "mass",
      unit: "g",
      coefficient: null,
      coefficientStatus: "unknown",
      environmentalCategorySlug: "other_waste",
      isComplete: false,
    },
  ],
};

describe("SPOGOMI domain invariants", () => {
  it("requires exactly three members for world cup teams", () => {
    expect(
      validateTeamComposition("world_cup", 2, incompleteRegulation.teamSize),
    ).toEqual({ ok: false, reason: "world_cup_requires_exactly_three_members" });
    expect(validateTeamComposition("world_cup", 3, incompleteRegulation.teamSize)).toEqual({
      ok: true,
    });
  });

  it("uses only the configured bounds for casual teams", () => {
    const teamSize = { casual: { minMembers: 2, maxMembers: 5 } };
    expect(validateTeamComposition("casual", 1, teamSize).ok).toBe(false);
    expect(validateTeamComposition("casual", 4, teamSize).ok).toBe(true);
    expect(validateTeamComposition("casual", 6, teamSize).ok).toBe(false);
  });

  it("keeps registration, presence and account linkage distinct", () => {
    expect(
      validateParticipantState({
        registrationStatus: "registered",
        attendanceStatus: "unknown",
        accountLinkStatus: "unlinked",
        clerkId: null,
      }),
    ).toEqual({ ok: true });
    expect(
      validateParticipantState({
        registrationStatus: "registered",
        attendanceStatus: "present",
        accountLinkStatus: "pending",
        clerkId: "user_123",
      }),
    ).toEqual({ ok: false, reason: "unverified_account_link_cannot_have_clerk_id" });
  });

  it("does not treat null, mass, count or points as interchangeable", () => {
    expect(
      validateResultItem(
        { measurementKind: "mass", unit: "g", quantity: null, massGrams: 0, provenance: "weighed" },
        { measurementKind: "mass", unit: "g" },
      ),
    ).toEqual({ ok: true });
    expect(
      validateResultItem(
        { measurementKind: "mass", unit: "g", quantity: -1, provenance: "weighed" },
        { measurementKind: "mass", unit: "g" },
      ),
    ).toEqual({ ok: false, reason: "quantity_must_be_a_non_negative_finite_number" });
    expect(
      validateResultItem(
        { measurementKind: "mass", unit: "g", quantity: 1_000_000_000_001, massGrams: -1, provenance: "weighed" },
        { measurementKind: "mass", unit: "g" },
      ),
    ).toEqual({ ok: false, reason: "quantity_must_be_a_non_negative_finite_number" });
    expect(
      validateResultItem(
        { measurementKind: "mass", unit: "g", quantity: 0, massGrams: -1, objectCount: 1.5, provenance: "weighed" },
        { measurementKind: "mass", unit: "g" },
      ),
    ).toEqual({ ok: false, reason: "mass_grams_must_be_non_negative_and_bounded" });
    expect(
      validateResultItem(
        { measurementKind: "mass", unit: "g", quantity: 0, massGrams: 0, objectCount: 1.5, provenance: "weighed" },
        { measurementKind: "mass", unit: "g" },
      ),
    ).toEqual({ ok: false, reason: "object_count_must_be_a_non_negative_integer" });
    expect(
      validateResultItem(
        { measurementKind: "count", unit: "count", quantity: 1.5, provenance: "observed" },
        { measurementKind: "count", unit: "count" },
      ),
    ).toEqual({ ok: false, reason: "count_must_be_an_integer" });
    expect(
      validateResultItem(
        { measurementKind: "mass", unit: "g", quantity: 12, provenance: "observed" },
        { measurementKind: "count", unit: "count" },
      ),
    ).toEqual({ ok: false, reason: "measurement_kind_must_match_category" });
  });

  it("blocks certification while the regulation is incomplete", () => {
    expect(isRegulationReadyForCertification(incompleteRegulation)).toBe(false);
    expect(
      validateSubmissionCertification({
        status: "certified",
        regulation: incompleteRegulation,
        certifiedByClerkId: "user_referee",
        certifiedAt: "2026-10-12T10:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "incomplete_regulation_blocks_certification" });
    expect(
      validateSubmissionCertification({
        status: "submitted",
        regulation: incompleteRegulation,
        certifiedByClerkId: null,
        certifiedAt: null,
      }),
    ).toEqual({ ok: true });
    expect(
      validateSubmissionCertification({
        status: "certified",
        previousStatus: "rejected",
        regulation: incompleteRegulation,
        certifiedByClerkId: "user_referee",
        certifiedAt: "2026-10-12T10:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "non_certifiable_previous_status" });
  });

  it("requires confirmed coefficients, complete score parameters and unique official tiebreakers", () => {
    const ready: SpogomiRegulation = {
      ...incompleteRegulation,
      sourceReference: "partner://spogomi/validated",
      status: "complete",
      rounding: { decimals: 1, mode: "half_up" },
      eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true },
      tiebreakers: ["sporting_score", "mass_grams"],
      categories: [{
        ...incompleteRegulation.categories[0],
        coefficient: 1,
        coefficientStatus: "confirmed",
        isComplete: true,
      }],
      environmentMappings: [{
        categoryCode: "waste",
        environmentalCategorySlug: "other_waste",
        sourceField: "mass_grams",
        sourceUnit: "g",
        targetUnit: "grams",
        unitFactorToTarget: 1,
        countsTowardTotal: true,
        isMegots: false,
        mappingStatus: "mapped",
        exclusionReason: null,
      }],
    };
    expect(isRegulationReadyForCertification(ready)).toBe(true);
    expect(isRegulationReadyForCertification({
      ...ready,
      categories: [{ ...ready.categories[0], coefficientStatus: "unknown" }],
    })).toBe(false);
    expect(isRegulationReadyForCertification({ ...ready, tiebreakers: ["mass_grams", "mass_grams"] })).toBe(false);
    expect(isRegulationReadyForCertification({ ...ready, rounding: undefined })).toBe(false);
    expect(isRegulationReadyForCertification({ ...ready, environmentMappings: [{ ...ready.environmentMappings![0], mappingStatus: "excluded", exclusionReason: "Non applicable" }] })).toBe(false);
  });

  it("requires mappings to match the sporting environmental slug and canonical butt classification", () => {
    const ready: SpogomiRegulation = {
      ...incompleteRegulation,
      divisionId: "division-casual",
      sourceReference: "synthetic://spogomi/mapping-coherence",
      status: "complete",
      rounding: { decimals: 0, mode: "half_up" },
      eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true },
      tiebreakers: ["sporting_score"],
      categories: [
        { ...incompleteRegulation.categories[0], code: "plastic", environmentalCategorySlug: "plastic", coefficient: 1, coefficientStatus: "confirmed", isComplete: true },
        { ...incompleteRegulation.categories[0], code: "packaging", environmentalCategorySlug: "plastic", coefficient: 2, coefficientStatus: "confirmed", isComplete: true },
      ],
      environmentMappings: [
        { categoryCode: "plastic", environmentalCategorySlug: "plastic", sourceField: "mass_grams", sourceUnit: "g", targetUnit: "grams", unitFactorToTarget: 1, countsTowardTotal: true, isMegots: false, mappingStatus: "mapped", exclusionReason: null },
        { categoryCode: "packaging", environmentalCategorySlug: "plastic", sourceField: "mass_grams", sourceUnit: "g", targetUnit: "grams", unitFactorToTarget: 1, countsTowardTotal: true, isMegots: false, mappingStatus: "mapped", exclusionReason: null },
      ],
    };
    expect(validateSpogomiRegulation(ready)).toEqual({ ok: true });
    expect(validateSpogomiRegulation({
      ...ready,
      environmentMappings: ready.environmentMappings!.map((mapping) => mapping.categoryCode === "plastic" ? { ...mapping, environmentalCategorySlug: "cigarette_butt", isMegots: true } : mapping),
    })).toEqual({ ok: false, reason: "mapping_environmental_category_mismatch" });
    expect(validateSpogomiRegulation({
      ...ready,
      environmentMappings: ready.environmentMappings!.map((mapping) => mapping.categoryCode === "plastic" ? { ...mapping, isMegots: true } : mapping),
    })).toEqual({ ok: false, reason: "mapping_megots_classification_mismatch" });
    expect(validateSpogomiRegulation({ ...ready, environmentMappings: [ready.environmentMappings![0]] })).toEqual({ ok: false, reason: "complete_environment_mappings_required" });
  });

  it("keeps mixed division mapping decisions isolated", () => {
    const baseComplete = {
      ...incompleteRegulation,
      sourceReference: "synthetic://spogomi/mixed-mapping-coherence",
      status: "complete" as const,
      rounding: { decimals: 0, mode: "half_up" as const },
      eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true },
      tiebreakers: ["sporting_score" as const],
      categories: [{ ...incompleteRegulation.categories[0], code: "material", coefficient: 1, coefficientStatus: "confirmed" as const, isComplete: true }],
    };
    const casual = { ...baseComplete, divisionId: "division-casual", categories: [{ ...baseComplete.categories[0], environmentalCategorySlug: "plastic" }], environmentMappings: [{ categoryCode: "material", environmentalCategorySlug: "plastic", sourceField: "mass_grams" as const, sourceUnit: "g", targetUnit: "grams" as const, unitFactorToTarget: 1, countsTowardTotal: true, isMegots: false, mappingStatus: "mapped" as const, exclusionReason: null }] };
    const worldCup = { ...baseComplete, divisionId: "division-world-cup", categories: [{ ...baseComplete.categories[0], environmentalCategorySlug: "cigarette_butt" }], environmentMappings: [{ categoryCode: "material", environmentalCategorySlug: "cigarette_butt", sourceField: "object_count" as const, sourceUnit: "objet", targetUnit: "count" as const, unitFactorToTarget: 1, countsTowardTotal: true, isMegots: true, mappingStatus: "mapped" as const, exclusionReason: null }] };
    expect(validateSpogomiRegulation(casual)).toEqual({ ok: true });
    expect(validateSpogomiRegulation(worldCup)).toEqual({ ok: true });
    expect(validateSpogomiRegulation({ ...worldCup, environmentMappings: [{ ...worldCup.environmentMappings[0], environmentalCategorySlug: "plastic", isMegots: false }] })).toEqual({ ok: false, reason: "mapping_environmental_category_mismatch" });
    expect(validateSpogomiRegulation(casual)).toEqual({ ok: true });
  });

  it("rejects unknown or non-applicable coefficients when a regulation is declared complete", () => {
    const complete = {
      ...incompleteRegulation,
      status: "complete" as const,
      sourceReference: "synthetic://spogomi/test-regulation-v1",
      rounding: { decimals: 0, mode: "half_up" as const },
      eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true },
      tiebreakers: ["sporting_score" as const],
      categories: [{ ...incompleteRegulation.categories[0], coefficient: null, coefficientStatus: "unknown" as const, isComplete: true }],
      environmentMappings: [{
        categoryCode: "waste",
        environmentalCategorySlug: "other_waste",
        sourceField: "mass_grams" as const,
        sourceUnit: "g",
        targetUnit: "grams" as const,
        unitFactorToTarget: 1,
        countsTowardTotal: true,
        isMegots: false,
        mappingStatus: "mapped" as const,
        exclusionReason: null,
      }],
    };
    expect(validateSpogomiRegulation(complete)).toEqual({ ok: false, reason: "complete_categories_require_confirmed_coefficients_and_environment_mapping" });
    expect(validateSpogomiRegulation({ ...complete, categories: [{ ...complete.categories[0], coefficientStatus: "not_applicable", coefficient: null }] })).toEqual({ ok: false, reason: "complete_categories_require_confirmed_coefficients_and_environment_mapping" });
  });

  it("validates Casual bounds and environmental decisions without inventing an official scale", () => {
    expect(validateSpogomiRegulation({ ...incompleteRegulation, status: "incomplete", categories: [] })).toEqual({ ok: true });
    expect(validateSpogomiRegulation({ ...incompleteRegulation, teamSize: { casual: { minMembers: 4, maxMembers: 2 } } })).toEqual({ ok: false, reason: "casual_team_bounds_invalid" });
    expect(validateSpogomiRegulation({ ...incompleteRegulation, environmentMappings: [{ categoryCode: "unknown", environmentalCategorySlug: null, sourceField: null, sourceUnit: "g", targetUnit: null, unitFactorToTarget: null, countsTowardTotal: true, isMegots: false, mappingStatus: "unmapped", exclusionReason: "À documenter" }] })).toEqual({ ok: false, reason: "mapping_category_unknown" });
    expect(validateSpogomiRegulation({ ...incompleteRegulation, environmentMappings: [{ categoryCode: "waste", environmentalCategorySlug: null, sourceField: null, sourceUnit: "g", targetUnit: null, unitFactorToTarget: null, countsTowardTotal: true, isMegots: false, mappingStatus: "unmapped", exclusionReason: null }] })).toEqual({ ok: false, reason: "unmapped_environment_mapping_requires_reason" });
  });

  it("keeps submission states distinct and requires an authorized certification decision", () => {
    const ready: SpogomiRegulation = {
      ...incompleteRegulation,
      sourceReference: "synthetic://spogomi/test-regulation-v1",
      status: "complete",
      rounding: { decimals: 0, mode: "half_up" },
      eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true },
      tiebreakers: ["sporting_score"],
      categories: [{ ...incompleteRegulation.categories[0], coefficient: 1, coefficientStatus: "confirmed", isComplete: true }],
      environmentMappings: [{
        categoryCode: "waste",
        environmentalCategorySlug: "other_waste",
        sourceField: "mass_grams",
        sourceUnit: "g",
        targetUnit: "grams",
        unitFactorToTarget: 1,
        countsTowardTotal: true,
        isMegots: false,
        mappingStatus: "mapped",
        exclusionReason: null,
      }],
    };

    for (const status of ["draft", "submitted", "rejected", "superseded"] as const) {
      expect(validateSubmissionCertification({ status, regulation: ready, certifiedByClerkId: null, certifiedAt: null })).toEqual({ ok: true });
    }
    expect(validateSubmissionCertification({ status: "certified", regulation: ready, certifiedByClerkId: null, certifiedAt: null })).toEqual({ ok: false, reason: "certification_reviewer_and_timestamp_required" });
    expect(validateSubmissionCertification({ status: "certified", regulation: ready, certifiedByClerkId: "referee-1", certifiedAt: "2026-10-20T10:00:00.000Z" })).toEqual({ ok: true });
    for (const previousStatus of ["provisional", "rejected", "superseded"] as const) {
      expect(validateSubmissionCertification({ status: "certified", previousStatus, regulation: ready, certifiedByClerkId: "referee-1", certifiedAt: "2026-10-20T10:00:00.000Z" })).toEqual({ ok: false, reason: "non_certifiable_previous_status" });
    }
  });
});
