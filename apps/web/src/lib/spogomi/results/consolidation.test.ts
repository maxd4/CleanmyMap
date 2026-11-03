import { describe, expect, it } from "vitest";
import {
  aggregateSpogomiEnvironmentalProjection,
  deriveSpogomiEnvironmentalMapping,
  type SpogomiConsolidationInput,
} from "./consolidation";

const mixed = deriveSpogomiEnvironmentalMapping({
  categoryRuleId: "mixed-rule",
  categoryCode: "mixed",
  measurementKind: "mass",
  unit: "g",
  environmentalCategorySlug: "mixed_residual",
  mappingVersion: "spogomi-cleanmymap-v1",
});
const butts = deriveSpogomiEnvironmentalMapping({
  categoryRuleId: "butts-rule",
  categoryCode: "butts",
  measurementKind: "count",
  unit: "mégot",
  environmentalCategorySlug: "cigarette_butt",
  mappingVersion: "spogomi-cleanmymap-v1",
});
const buttsMass = deriveSpogomiEnvironmentalMapping({
  categoryRuleId: "butts-mass-rule",
  categoryCode: "butts_mass",
  measurementKind: "mass",
  unit: "g",
  environmentalCategorySlug: "cigarette_butt",
  mappingVersion: "spogomi-cleanmymap-v1",
});

function input(overrides: Partial<SpogomiConsolidationInput> = {}): SpogomiConsolidationInput {
  return {
    eventId: "event-1",
    actionId: "action-1",
    mappingVersion: "spogomi-cleanmymap-v1",
    mappings: [mixed, butts, buttsMass],
    teams: [
      {
        teamId: "team-1",
        teamNumber: 1,
        publicName: "Équipe 1",
        certifiedSubmissionId: "submission-1",
        certifiedSubmissionStatus: "certified",
        items: [
          { categoryRuleId: "mixed-rule", categoryCode: "mixed", categoryLabel: "Déchets mélangés", quantity: 1200, massGrams: 1200, objectCount: null, provenance: "balance A", submissionId: "submission-1", teamId: "team-1" },
          { categoryRuleId: "butts-rule", categoryCode: "butts", categoryLabel: "Mégots", quantity: null, massGrams: 24.5, objectCount: 40, provenance: "comptage poste 1", submissionId: "submission-1", teamId: "team-1" },
          { categoryRuleId: "butts-mass-rule", categoryCode: "butts_mass", categoryLabel: "Masse de mégots", quantity: null, massGrams: 24.5, objectCount: null, provenance: "balance mégots 1", submissionId: "submission-1", teamId: "team-1" },
        ],
      },
      {
        teamId: "team-2",
        teamNumber: 2,
        publicName: "Équipe 2",
        certifiedSubmissionId: "submission-2",
        certifiedSubmissionStatus: "certified",
        items: [
          { categoryRuleId: "mixed-rule", categoryCode: "mixed", categoryLabel: "Déchets mélangés", quantity: 800, massGrams: 800, objectCount: null, provenance: "balance B", submissionId: "submission-2", teamId: "team-2" },
          { categoryRuleId: "butts-rule", categoryCode: "butts", categoryLabel: "Mégots", quantity: null, massGrams: 10.25, objectCount: 0, provenance: "comptage poste 2", submissionId: "submission-2", teamId: "team-2" },
          { categoryRuleId: "butts-mass-rule", categoryCode: "butts_mass", categoryLabel: "Masse de mégots", quantity: null, massGrams: 10.25, objectCount: null, provenance: "balance mégots 2", submissionId: "submission-2", teamId: "team-2" },
        ],
      },
    ],
    participants: [
      { id: "present", teamId: "team-1", attendanceStatus: "present", registrationStatus: "registered" },
      { id: "absent", teamId: "team-1", attendanceStatus: "absent", registrationStatus: "registered" },
      { id: "unverified", teamId: "team-2", attendanceStatus: "unknown", registrationStatus: "registered" },
      { id: "withdrawn", teamId: "team-2", attendanceStatus: "present", registrationStatus: "withdrawn" },
    ],
    officialRoute: {
      source: "official_reference",
      fileName: "parcours-officiel.gpx",
      pointCount: 2,
      referenceDistanceKm: 1.2,
      inferredTopology: "loop",
      geometryGeojson: { type: "LineString", coordinates: [[2.35, 48.85], [2.36, 48.86]] },
      note: "Parcours officiel de référence, non observé sur le terrain.",
    },
    organizer: { id: "org-spogomi", name: "SPOGOMI France", organizerType: "association" },
    eventMetadata: {
      name: "Événement SPOGOMI",
      locationLabel: "Paris",
      startsAt: "2026-10-12T10:00:00.000Z",
      endsAt: "2026-10-12T12:00:00.000Z",
    },
    actionMetadata: { organizerId: "org-spogomi", organizerName: "SPOGOMI France", organizerType: "association" },
    sourceSnapshot: {
      event: { id: "event-1", updatedAt: "2026-10-12T09:00:00.000Z", name: "Événement SPOGOMI", locationLabel: "Paris", startsAt: "2026-10-12T10:00:00.000Z", endsAt: "2026-10-12T12:00:00.000Z", mappingVersion: "spogomi-cleanmymap-v1" },
      action: { id: "action-1", updatedAt: "2026-10-12T09:00:00.000Z", organizerId: "org-spogomi", organizerName: "SPOGOMI France", organizerType: "association" },
      categories: [],
      mappings: [],
      teams: [],
      submissions: [],
      items: [],
      participants: [],
      route: null,
    },
    ...overrides,
  };
}

describe("SPOGOMI environmental consolidation engine", () => {
  it("sums several certified teams into one physical projection and keeps direct butts separate", () => {
    const result = aggregateSpogomiEnvironmentalProjection(input());
    expect(result.teamsIncluded).toBe(2);
    expect(result.totalWasteMassGrams).toBe(2000);
    expect(result.cigaretteButtsMassGrams).toBe(34.75);
    expect(result.cigaretteButtsCount).toBe(40);
    expect(result.action).toEqual({ wasteKg: 2, cigaretteButts: 40, volunteersCount: 1 });
    expect(result.officialRoute?.source).toBe("official_reference");
    expect(result.organizer?.name).toBe("SPOGOMI France");
    expect(result.categoryTotals.find((category) => category.categoryCode === "mixed")?.provenance).toEqual(["balance A", "balance B"]);
    expect(result.readyForPublication).toBe(true);
  });

  it("distinguishes absent, unknown and explicit zero values", () => {
    const result = aggregateSpogomiEnvironmentalProjection(input());
    expect(result.participantsPresent).toBe(1);
    expect(result.cigaretteButtsCount).toBe(40);
    const zero = aggregateSpogomiEnvironmentalProjection(input({
      teams: [{ ...input().teams[1], items: [
        { ...input().teams[1].items[1], objectCount: 0 },
        { ...input().teams[1].items[2], massGrams: 0 },
      ] }],
    }));
    expect(zero.cigaretteButtsCount).toBe(0);
    expect(zero.cigaretteButtsMassGrams).toBe(0);
    const unknown = aggregateSpogomiEnvironmentalProjection(input({
      teams: [{ ...input().teams[0], items: [{ ...input().teams[0].items[0], massGrams: null, quantity: null }] }],
    }));
    expect(unknown.totalWasteMassGrams).toBeNull();
    expect(unknown.excludedMeasures).toContainEqual(expect.objectContaining({ reason: "missing_source_value" }));
  });

  it("blocks publication for missing mappings or non-certified teams without imputing values", () => {
    const unmapped = deriveSpogomiEnvironmentalMapping({
      categoryRuleId: "unknown-rule",
      categoryCode: "unknown",
      measurementKind: "mass",
      unit: "g",
      environmentalCategorySlug: null,
      mappingVersion: "spogomi-cleanmymap-v1",
    });
    const result = aggregateSpogomiEnvironmentalProjection(input({
      mappings: [...input().mappings, unmapped],
      teams: [{ ...input().teams[0], certifiedSubmissionId: null, certifiedSubmissionStatus: null, items: [] }],
    }));
    expect(result.readyForPublication).toBe(false);
    expect(result.totalWasteMassGrams).toBeNull();
    expect(result.categoriesWithoutMapping).toEqual(["unknown"]);
    expect(result.excludedMeasures).toContainEqual(expect.objectContaining({ reason: "team_not_certified" }));
  });

  it("blocks a certified team whose source items do not cover every regulation category", () => {
    const result = aggregateSpogomiEnvironmentalProjection(input({
      teams: [{ ...input().teams[0], items: [input().teams[0].items[0]] }],
    }));

    expect(result.readyForPublication).toBe(false);
    expect(result.excludedMeasures).toContainEqual(expect.objectContaining({ reason: "incomplete_submission" }));
  });

  it("does not count nested categories twice when their versioned mapping excludes them from the total", () => {
    const nested = { ...mixed, categoryRuleId: "nested-rule", categoryCode: "nested", countsTowardTotal: false };
    const result = aggregateSpogomiEnvironmentalProjection(input({
      mappings: [mixed, nested],
      teams: [{ ...input().teams[0], items: [{ ...input().teams[0].items[0], categoryRuleId: "nested-rule", categoryCode: "nested", categoryLabel: "Sous-total imbriqué", massGrams: 1200 }] }],
    }));
    expect(result.categoryTotals[0].total).toBe(1200);
    expect(result.totalWasteMassGrams).toBeNull();
  });

  it("rejects negative measurements and unknown units without inventing a conversion", () => {
    const negative = aggregateSpogomiEnvironmentalProjection(input({
      teams: [{ ...input().teams[0], items: [{ ...input().teams[0].items[0], massGrams: -1, quantity: -1 }] }],
    }));
    expect(negative.readyForPublication).toBe(false);
    expect(negative.totalWasteMassGrams).toBeNull();
    expect(negative.excludedMeasures).toContainEqual(expect.objectContaining({ reason: "missing_source_value" }));
    expect(deriveSpogomiEnvironmentalMapping({
      categoryRuleId: "unknown-unit",
      categoryCode: "unknown_unit",
      measurementKind: "mass",
      unit: "sac",
      environmentalCategorySlug: "mixed_residual",
      mappingVersion: "spogomi-cleanmymap-v1",
    }).status).toBe("excluded");
  });
});
