import { describe, expect, it } from "vitest";
import { buildSpogomiResultsProjection, getSpogomiDivisionProjections, type SpogomiResultsSource } from "./results-projection";

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
      { id: "team-1", team_number: 1, public_name: "Équipe Alpha", composition_state: "verified", certified_submission_id: null },
      { id: "team-2", team_number: 2, public_name: "Équipe Beta", composition_state: "verified", certified_submission_id: null },
      { id: "team-3", team_number: 3, public_name: "Équipe Gamma", composition_state: "verified", certified_submission_id: null },
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
    expect(projection.results.butts.entries.find((entry) => entry.teamNumber === 1)).toMatchObject({ rank: 2, numerator: 2, denominator: 2 });
    const massOnly = projection.results.butts.entries.find((entry) => entry.teamNumber === 2);
    expect(massOnly).toMatchObject({ rank: null, status: "unavailable" });
    expect(massOnly).not.toHaveProperty("numerator");
    expect(projection.results.butts.entries.find((entry) => entry.teamNumber === 3)).toMatchObject({ rank: 1, numerator: 4, denominator: 1 });
  });

  it("calculates mixed edition rankings inside each division only", () => {
    const candidate = source();
    candidate.event.mode = "mixed";
    candidate.event.divisions = [
      {
        id: "division-casual", division_type: "casual", regulation_version: "rules-casual", regulation_status: "complete",
        regulation_source_reference: "reglement:casual", regulation_config: { ...(candidate.event.regulationConfig as Record<string, unknown>), tiebreakers: ["mass_grams"] },
        team_size_config: { casual: { minMembers: 1, maxMembers: 5 } },
      },
      {
        id: "division-world", division_type: "world_cup", regulation_version: "rules-world", regulation_status: "complete",
        regulation_source_reference: "reglement:world", regulation_config: { ...(candidate.event.regulationConfig as Record<string, unknown>), tiebreakers: ["counted_objects"] },
        team_size_config: { world_cup: { minMembers: 3, maxMembers: 3 } },
      },
    ];
    candidate.categories = [
      { ...candidate.categories[0], id: "cat-casual-waste", division_id: "division-casual", regulation_version: "rules-casual", coefficient: 1 },
      { ...candidate.categories[1], id: "cat-casual-butts", division_id: "division-casual", regulation_version: "rules-casual", coefficient: 0 },
      { ...candidate.categories[0], id: "cat-world-waste", division_id: "division-world", regulation_version: "rules-world", coefficient: 2 },
      { ...candidate.categories[1], id: "cat-world-butts", division_id: "division-world", regulation_version: "rules-world", coefficient: 0 },
    ];
    candidate.teams = [
      { ...candidate.teams[0], id: "team-casual-1", division_id: "division-casual", team_number: 1, certified_submission_id: "submission-casual" },
      { ...candidate.teams[1], id: "team-world-1", division_id: "division-world", team_number: 1, certified_submission_id: "submission-world" },
    ];
    candidate.submissions = [
      { ...candidate.submissions[0], id: "submission-casual", division_id: "division-casual", team_id: "team-casual-1", status: "certified", regulation_version: "rules-casual" },
      { ...candidate.submissions[1], id: "submission-world", division_id: "division-world", team_id: "team-world-1", status: "certified", regulation_version: "rules-world" },
    ];
    candidate.items = [
      { id: "item-casual-waste", submission_id: "submission-casual", category_rule_id: "cat-casual-waste", division_id: "division-casual", measurement_kind: "mass", unit: "kg", quantity: 10, mass_grams: 10000, object_count: null, measurement_method: "balance", provenance: "poste casual" },
      { id: "item-casual-butts", submission_id: "submission-casual", category_rule_id: "cat-casual-butts", division_id: "division-casual", measurement_kind: "count", unit: "unité", quantity: 2, mass_grams: null, object_count: 2, measurement_method: "comptage", provenance: "sac casual" },
      { id: "item-world-waste", submission_id: "submission-world", category_rule_id: "cat-world-waste", division_id: "division-world", measurement_kind: "mass", unit: "kg", quantity: 6, mass_grams: 6000, object_count: null, measurement_method: "balance", provenance: "poste world" },
      { id: "item-world-butts", submission_id: "submission-world", category_rule_id: "cat-world-butts", division_id: "division-world", measurement_kind: "count", unit: "unité", quantity: 4, mass_grams: null, object_count: 4, measurement_method: "comptage", provenance: "sac world" },
    ];
    candidate.participants = [
      { id: "p-casual", division_id: "division-casual", team_id: "team-casual-1", registration_status: "registered", attendance_status: "present" },
      { id: "p-world", division_id: "division-world", team_id: "team-world-1", registration_status: "registered", attendance_status: "present" },
    ];
    const projection = buildSpogomiResultsProjection(candidate);
    const divisionProjections = getSpogomiDivisionProjections(projection);
    expect(projection.results.divisions).toHaveLength(2);
    expect(divisionProjections).toHaveLength(2);
    expect(divisionProjections.map((division) => division.publicationSourceSnapshot.divisions)).toEqual([
      [expect.objectContaining({ id: "division-casual", type: "casual", regulationVersion: "rules-casual" })],
      [expect.objectContaining({ id: "division-world", type: "world_cup", regulationVersion: "rules-world" })],
    ]);
    expect(divisionProjections[0]?.results.sport.entries).toEqual([expect.objectContaining({ teamId: "team-casual-1", teamNumber: 1 })]);
    expect(divisionProjections[1]?.results.sport.entries).toEqual([expect.objectContaining({ teamId: "team-world-1", teamNumber: 1 })]);
    expect(divisionProjections[0]?.publicationSourceSnapshot.teams).toEqual([expect.objectContaining({ id: "team-casual-1", divisionId: "division-casual" })]);
    expect(divisionProjections[1]?.publicationSourceSnapshot.teams).toEqual([expect.objectContaining({ id: "team-world-1", divisionId: "division-world" })]);
    expect(divisionProjections[0]?.publicationSourceSnapshot.items.every((item) => item.divisionId === "division-casual")).toBe(true);
    expect(divisionProjections[1]?.publicationSourceSnapshot.items.every((item) => item.divisionId === "division-world")).toBe(true);
    expect(divisionProjections[0]?.results.sport.entries[0]?.score).not.toBe(divisionProjections[1]?.results.sport.entries[0]?.score);
  });

  it("keeps unresolved sports ties equal when the regulation does not configure a further departure", () => {
    const candidate = source();
    candidate.event.regulationConfig = { ...(candidate.event.regulationConfig as Record<string, unknown>), tiebreakers: ["sporting_score"] };
    const projection = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    expect(projection.results.sport.entries.filter((entry) => entry.teamNumber <= 2).map((entry) => entry.rank)).toEqual([1, 1]);
  });

  it("uses only the configured sporting tiebreaker and never the team number", () => {
    const candidate = source();
    candidate.event.regulationConfig = { ...(candidate.event.regulationConfig as Record<string, unknown>), tiebreakers: ["sporting_score", "mass_grams"] };
    const projection = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    expect(projection.results.sport.entries.filter((entry) => entry.teamNumber <= 2).map((entry) => ({ team: entry.teamNumber, rank: entry.rank }))).toEqual([
      { team: 1, rank: 1 },
      { team: 2, rank: 2 },
    ]);
  });

  it("keeps equal direct-butts ratios tied and does not use sporting tiebreakers", () => {
    const candidate = source();
    candidate.items = candidate.items.map((item) => item.submission_id === "submission-2" && item.category_rule_id === "cat-butts"
      ? { ...item, mass_grams: null, object_count: 2 }
      : item);
    candidate.participants = [...candidate.participants, { id: "p5", team_id: "team-2", registration_status: "registered", attendance_status: "present" }];
    const projection = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    expect(projection.results.butts.entries.filter((entry) => entry.teamNumber <= 2).map((entry) => ({ team: entry.teamNumber, rank: entry.rank, ratio: entry.ratio }))).toEqual([
      { team: 1, rank: 2, ratio: 1 },
      { team: 2, rank: 2, ratio: 1 },
    ]);
  });

  it("keeps a valid physical collection visible when sports closure disqualifies the team", () => {
    const candidate = source();
    candidate.teams = candidate.teams.map((team) => team.id === "team-1"
      ? { ...team, certified_submission_id: "submission-1", closure_status: "disqualified", sport_eligible: false, environmental_eligibility: "eligible" }
      : team);
    candidate.submissions = candidate.submissions.map((submission) => submission.id === "submission-1" ? { ...submission, status: "certified" } : submission);
    const projection = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    const sportsEntry = projection.results.sport.entries.find((entry) => entry.teamNumber === 1);
    const exportedTeam = projection.teams.find((team) => team.teamNumber === 1);
    expect(sportsEntry).toMatchObject({ eligible: false, rank: null });
    expect(exportedTeam).toMatchObject({ environmentalEligibility: "eligible", categories: expect.arrayContaining([expect.objectContaining({ quantity: 10, massGrams: 10000 })]) });
  });

  it("does not expose provisional values in certified visibility without a matching official decision", () => {
    const candidate = source();
    candidate.event.state = "certified";
    candidate.event.publicResultsVisibility = "certified";
    const projection = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    const entry = projection.results.sport.entries.find((row) => row.teamNumber === 1);
    expect(entry).toMatchObject({ status: "unavailable", rank: null });
    expect(entry).not.toHaveProperty("score");
    expect(entry).not.toHaveProperty("presentParticipants");
    expect(entry).not.toHaveProperty("ratio");
    expect("scoreResult" in (entry ?? {})).toBe(false);
  });

  it("exposes certified values only when the official decision matches the current source snapshot", () => {
    const candidate = source();
    candidate.event.state = "certified";
    candidate.event.publicResultsVisibility = "certified";
    candidate.teams = candidate.teams.map((team) => ({ ...team, certified_submission_id: `submission-${team.team_number}` }));
    candidate.submissions = candidate.submissions.map((submission) => ({ ...submission, status: "certified" }));
    const withoutDecision = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    candidate.officialRankings = [
      ...[1, 2, 3].map((teamNumber) => ({ team_id: `team-${teamNumber}`, kind: "points" as const, rank: teamNumber, status: "certified" as const, team_eligible: true, decision_version: "decision-1", source_reference: "official:points", source_snapshot: withoutDecision.publicationSourceSnapshot })),
      { team_id: "team-3", kind: "butts" as const, rank: 1, status: "certified" as const, team_eligible: true, decision_version: "decision-1", source_reference: "official:butts", source_snapshot: withoutDecision.publicationSourceSnapshot },
      { team_id: "team-1", kind: "butts" as const, rank: 2, status: "certified" as const, team_eligible: true, decision_version: "decision-1", source_reference: "official:butts", source_snapshot: withoutDecision.publicationSourceSnapshot },
    ];
    const projection = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    expect(projection.results.sport.entries.find((entry) => entry.teamNumber === 1)).toMatchObject({ status: "certified", score: expect.any(Number) });
    expect(projection.results.sport.entries.find((entry) => entry.teamNumber === 1)).not.toHaveProperty("scoreResult");
  });

  it("keeps the publication identity stable when visibility and presentation change", () => {
    const candidate = source();
    candidate.event.state = "certified";
    candidate.event.publicResultsVisibility = "hidden";
    candidate.teams = candidate.teams.map((team) => ({ ...team, certified_submission_id: `submission-${team.team_number}` }));
    candidate.submissions = candidate.submissions.map((submission) => ({ ...submission, status: "certified" }));
    const hidden = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    candidate.officialRankings = [
      ...[1, 2, 3].map((teamNumber) => ({ team_id: `team-${teamNumber}`, kind: "points" as const, rank: teamNumber, status: "certified" as const, team_eligible: true, decision_version: "decision-1", source_reference: "official:points", source_snapshot: hidden.publicationSourceSnapshot })),
      { team_id: "team-1", kind: "butts" as const, rank: 1, status: "certified" as const, team_eligible: true, decision_version: "decision-1", source_reference: "official:butts", source_snapshot: hidden.publicationSourceSnapshot },
    ];
    candidate.event.publicResultsVisibility = "certified";
    candidate.event.name = "SPOGOMI — nom affiché modifié";
    candidate.event.locationLabel = "Lyon";
    candidate.categories = candidate.categories.map((category) => ({ ...category, label: `${category.label} — présentation` , display_order: category.display_order + 10 }));
    candidate.teams = candidate.teams.map((team) => ({ ...team, public_name: `${team.public_name} — présentation` }));
    const certified = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    expect(certified.publicationSourceSnapshot).toEqual(hidden.publicationSourceSnapshot);
    expect(certified.results.sport.entries.find((entry) => entry.teamNumber === 1)).toMatchObject({ status: "certified", rank: 1 });
  });

  it("invalidates a publication for a coefficient, measurement, or attendance change", () => {
    const candidate = source();
    candidate.event.state = "certified";
    candidate.event.publicResultsVisibility = "certified";
    candidate.teams = candidate.teams.map((team) => ({ ...team, certified_submission_id: `submission-${team.team_number}` }));
    candidate.submissions = candidate.submissions.map((submission) => ({ ...submission, status: "certified" }));
    const published = buildSpogomiResultsProjection(candidate, "2026-10-12T12:00:00Z");
    candidate.officialRankings = [
      ...[1, 2, 3].map((teamNumber) => ({ team_id: `team-${teamNumber}`, kind: "points" as const, rank: teamNumber, status: "certified" as const, team_eligible: true, decision_version: "decision-1", source_reference: "official:points", source_snapshot: published.publicationSourceSnapshot })),
      { team_id: "team-1", kind: "butts" as const, rank: 1, status: "certified" as const, team_eligible: true, decision_version: "decision-1", source_reference: "official:butts", source_snapshot: published.publicationSourceSnapshot },
    ];

    candidate.categories = candidate.categories.map((category) => category.code === "waste" ? { ...category, coefficient: 2 } : category);
    expect(buildSpogomiResultsProjection(candidate).results.sport.entries.find((entry) => entry.teamNumber === 1)?.status).toBe("unavailable");

    candidate.categories = source().categories;
    candidate.items = candidate.items.map((item, index) => index === 0 ? { ...item, mass_grams: 9000 } : item);
    expect(buildSpogomiResultsProjection(candidate).results.sport.entries.find((entry) => entry.teamNumber === 1)?.status).toBe("unavailable");

    candidate.items = source().items;
    candidate.participants = candidate.participants.map((participant) => participant.id === "p2" ? { ...participant, attendance_status: "absent" } : participant);
    expect(buildSpogomiResultsProjection(candidate).results.butts.entries.find((entry) => entry.teamNumber === 1)?.status).toBe("unavailable");
  });
});
