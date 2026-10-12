import { describe, expect, it } from "vitest";
import { buildSpogomiResultsProjection, type SpogomiResultsSource } from "./results-projection";

function source(): SpogomiResultsSource {
  return {
    event: {
      id: "event-1", actionId: "action-1", name: "SPOGOMI test", locationLabel: "Paris", mode: "casual", state: "in_progress",
      startsAt: "2026-10-12T09:00:00Z", endsAt: null, regulationVersion: "rules-v1", regulationStatus: "complete", regulationSourceReference: "reglement:test",
      regulationConfig: { rounding: { decimals: 0, mode: "half_up" }, eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true }, tiebreakers: ["sporting_score", "mass_grams"] },
      teamSizeConfig: { casual: { minMembers: 1, maxMembers: 5 } }, publicResultsVisibility: "provisional",
    },
    categories: [
      { id: "cat-waste", event_id: "event-1", regulation_version: "rules-v1", code: "waste", label: "Déchets", measurement_kind: "mass", unit: "kg", coefficient: 1, coefficient_status: "confirmed", environmental_category_slug: "plastic", display_order: 1, is_complete: true },
      { id: "cat-butts", event_id: "event-1", regulation_version: "rules-v1", code: "butts", label: "Mégots", measurement_kind: "count", unit: "unité", coefficient: 0, coefficient_status: "confirmed", environmental_category_slug: "cigarette_butt", display_order: 2, is_complete: true },
    ],
    teams: [
      { id: "team-1", team_number: 1, public_name: "Équipe Alpha", certified_submission_id: null },
      { id: "team-2", team_number: 2, public_name: "Équipe Beta", certified_submission_id: null },
      { id: "team-3", team_number: 3, public_name: "Équipe Gamma", certified_submission_id: null },
    ],
    submissions: [
      { id: "submission-1", team_id: "team-1", version: 1, status: "submitted", submitted_at: "2026-10-12T10:00:00Z", updated_at: "2026-10-12T10:00:00Z" },
      { id: "submission-2", team_id: "team-2", version: 1, status: "submitted", submitted_at: "2026-10-12T10:01:00Z", updated_at: "2026-10-12T10:01:00Z" },
      { id: "submission-3", team_id: "team-3", version: 1, status: "submitted", submitted_at: "2026-10-12T10:02:00Z", updated_at: "2026-10-12T10:02:00Z" },
    ],
    items: [
      { submission_id: "submission-1", category_rule_id: "cat-waste", measurement_kind: "mass", unit: "kg", quantity: 10, mass_grams: 10000, object_count: null, measurement_method: "balance", provenance: "poste 1" },
      { submission_id: "submission-1", category_rule_id: "cat-butts", measurement_kind: "count", unit: "unité", quantity: 2, mass_grams: null, object_count: 2, measurement_method: "comptage", provenance: "sac 1" },
      { submission_id: "submission-2", category_rule_id: "cat-waste", measurement_kind: "mass", unit: "kg", quantity: 10, mass_grams: 5000, object_count: null, measurement_method: "balance", provenance: "poste 2" },
      { submission_id: "submission-2", category_rule_id: "cat-butts", measurement_kind: "count", unit: "unité", quantity: 2, mass_grams: 4, object_count: null, measurement_method: "pesée", provenance: "sac 2" },
      { submission_id: "submission-3", category_rule_id: "cat-waste", measurement_kind: "mass", unit: "kg", quantity: 8, mass_grams: 8000, object_count: null, measurement_method: "balance", provenance: "poste 3" },
      { submission_id: "submission-3", category_rule_id: "cat-butts", measurement_kind: "count", unit: "unité", quantity: 4, mass_grams: null, object_count: 4, measurement_method: "comptage", provenance: "sac 3" },
    ],
    participants: [
      { id: "p1", team_id: "team-1", registration_status: "registered", attendance_status: "present" },
      { id: "p2", team_id: "team-1", registration_status: "registered", attendance_status: "present" },
      { id: "p3", team_id: "team-2", registration_status: "registered", attendance_status: "present" },
      { id: "p4", team_id: "team-3", registration_status: "registered", attendance_status: "present" },
    ],
    officialRankings: [], consolidation: null, actionIsPublished: false,
  };
}

describe("SPOGOMI public results projection", () => {
  it("keeps sport and direct-butts rankings independent and excludes mass-only butts", () => {
    const projection = buildSpogomiResultsProjection(source(), "2026-10-12T12:00:00Z");
    expect(projection.results.sport.status).toBe("provisional");
    expect(projection.results.sport.entries.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(projection.results.butts.entries.find((entry) => entry.teamNumber === 1)).toMatchObject({ rank: 1, numerator: 2, denominator: 2 });
    expect(projection.results.butts.entries.find((entry) => entry.teamNumber === 2)).toMatchObject({ rank: null, status: "unavailable", numerator: null });
    expect(projection.results.butts.entries.find((entry) => entry.teamNumber === 3)).toMatchObject({ rank: 2, numerator: 4, denominator: 1 });
  });
});
