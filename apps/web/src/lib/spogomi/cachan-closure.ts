import baseScenario from "../../../../../documentation/features/spogomi-references/fixtures/scenario_cachan_cleanmymap_mixed.json";
import closureExtension from "../../../../../documentation/features/spogomi-references/fixtures/scenario_cachan_cleanmymap_mixed_closure_SYNTHETIQUE.json";
import { calculateSpogomiCompetitionResult } from "./scoring";
import type { SpogomiCompetitionInput, SpogomiRegulation } from "./types";

type BaseDivision = (typeof baseScenario.divisions)[number];
type BaseTeam = (typeof baseScenario.teams)[number];
type ClosureTeam = (typeof closureExtension.teams)[number];
type Measurement = (typeof baseScenario.measurements)[number] | (typeof closureExtension.additional_measurements)[number];

export type CachanSyntheticRankEntry = {
  rank: number;
  teamRef: string;
  score: number;
  massGrams: number;
  directCigaretteButtCount: number;
  value: number;
};

export type CachanSyntheticTeamResult = {
  teamRef: string;
  divisionRef: string;
  divisionType: "casual" | "world_cup";
  placeIds: string[];
  compositionStatus: string;
  attendanceStatus: string;
  presentParticipants: number;
  score: number;
  scoreLabel: "synthetic_final";
  massGrams: number;
  cigaretteButtMassGrams: number;
  directCigaretteButtCount: number;
  buttsPerParticipant: number;
  measurements: Array<{ categoryCode: string; massGrams: number; directObjectCount: number | null }>;
};

export type CachanSyntheticDivisionProjection = {
  divisionRef: string;
  divisionType: "casual" | "world_cup";
  regulationRef: string;
  teams: CachanSyntheticTeamResult[];
  sportRanking: CachanSyntheticRankEntry[];
  buttsPerParticipantRanking: CachanSyntheticRankEntry[];
};

export type CachanSyntheticClosureProjection = {
  extensionRef: string;
  official: false;
  syntheticNotice: string;
  edition: {
    title: string;
    date: string;
    timezone: string;
    locationLabel: string;
    state: string;
    regulationsUsed: string[];
    chronology: Array<{ step: string; at: string }>;
    closureDecisions: Array<{ divisionRef: string; decision: string }>;
  };
  parentActionRef: string;
  placesCount: number;
  teamCount: number;
  divisionCount: number;
  presentParticipants: number;
  divisions: CachanSyntheticDivisionProjection[];
  environmentalTotals: {
    totalMassGrams: number;
    cigaretteButtMassGrams: number;
    directCigaretteButtCount: number;
    massGramsByCategory: Record<string, number>;
    byDivision: Array<{
      divisionRef: string;
      totalMassGrams: number;
      cigaretteButtMassGrams: number;
      directCigaretteButtCount: number;
    }>;
  };
};

function requireClosureTeam(teamRef: string): ClosureTeam {
  const team = closureExtension.teams.find((candidate) => candidate.team_ref === teamRef);
  if (!team) throw new Error(`Missing synthetic closure data for ${teamRef}`);
  return team;
}

function allMeasurements(): Measurement[] {
  return [...baseScenario.measurements, ...closureExtension.additional_measurements];
}

function measurementFor(teamRef: string, categoryCode: string): Measurement {
  const matches = allMeasurements().filter((measurement) => measurement.team_ref === teamRef && measurement.category_code === categoryCode);
  if (matches.length !== 1) throw new Error(`Expected one synthetic measurement for ${teamRef}/${categoryCode}`);
  return matches[0];
}

function buildRegulation(division: BaseDivision): SpogomiRegulation {
  return {
    version: division.regulation_ref,
    sourceReference: division.regulation_ref,
    status: "complete",
    teamSize: { casual: { minMembers: division.team_size.min_members, maxMembers: division.team_size.max_members } },
    rounding: { mode: division.rounding.mode as "half_up", decimals: division.rounding.decimals },
    eligibility: { minimumPresentParticipants: null, requiresAllCategories: division.eligibility.all_categories_required },
    tiebreakers: ["mass_grams"],
    penalties: [],
    categories: division.categories.map((category) => ({
      code: category.code,
      label: category.label,
      measurementKind: "mass",
      unit: "g",
      coefficient: category.points_per_kg / 1000,
      coefficientStatus: "confirmed",
      environmentalCategorySlug: category.code === "cigarette_butts" ? "cigarette_butt" : category.code,
      isComplete: true,
    })),
    environmentMappings: division.categories.map((category) => ({
      categoryCode: category.code,
      environmentalCategorySlug: category.code === "cigarette_butts" ? "cigarette_butt" : category.code,
      sourceField: "mass_grams",
      sourceUnit: "g",
      targetUnit: "grams",
      unitFactorToTarget: 1,
      countsTowardTotal: true,
      isMegots: category.code === "cigarette_butts",
      mappingStatus: "mapped",
      exclusionReason: null,
    })),
  };
}

function buildCompetitionInput(team: BaseTeam, division: BaseDivision, closureTeam: ClosureTeam): SpogomiCompetitionInput {
  const regulation = buildRegulation(division);
  const items = division.categories.map((category) => {
    const measurement = measurementFor(team.team_ref, category.code);
    return {
      categoryCode: category.code,
      measurementKind: "mass" as const,
      unit: "g",
      quantity: measurement.mass_grams,
      massGrams: measurement.mass_grams,
      objectCount: category.code === "cigarette_butts" ? closureTeam.direct_cigarette_butt_count : null,
      provenance: measurement.provenance_ref,
    };
  });
  return { regulation, items, presentParticipants: closureTeam.present_place_ids.length, submissionStatus: "certified" };
}

function rankTeams(teams: CachanSyntheticTeamResult[], value: (team: CachanSyntheticTeamResult) => number, order: "desc" | "asc"): CachanSyntheticRankEntry[] {
  return [...teams]
    .sort((left, right) => (order === "desc" ? value(right) - value(left) : value(left) - value(right)) || left.massGrams - right.massGrams || left.teamRef.localeCompare(right.teamRef))
    .map((team, index) => ({
      rank: index + 1,
      teamRef: team.teamRef,
      score: team.score,
      massGrams: team.massGrams,
      directCigaretteButtCount: team.directCigaretteButtCount,
      value: value(team),
    }));
}

function buildTeamResult(team: BaseTeam, division: BaseDivision): CachanSyntheticTeamResult {
  const closureTeam = requireClosureTeam(team.team_ref);
  if (JSON.stringify(team.place_ids) !== JSON.stringify(closureTeam.present_place_ids)) {
    throw new Error(`Synthetic attendance must preserve the final composition for ${team.team_ref}`);
  }
  const calculation = calculateSpogomiCompetitionResult(buildCompetitionInput(team, division, closureTeam));
  if (calculation.officialScore === null || calculation.scoreStatus !== "official" || calculation.buttsPerParticipant === null) {
    throw new Error(`Synthetic closure result is incomplete for ${team.team_ref}`);
  }
  return {
    teamRef: team.team_ref,
    divisionRef: team.division_ref,
    divisionType: division.division_type as "casual" | "world_cup",
    placeIds: [...team.place_ids],
    compositionStatus: closureTeam.composition_status,
    attendanceStatus: closureTeam.attendance_status,
    presentParticipants: closureTeam.present_place_ids.length,
    score: calculation.officialScore,
    scoreLabel: "synthetic_final",
    massGrams: calculation.physicalTotals.massGrams ?? 0,
    cigaretteButtMassGrams: calculation.physicalTotals.buttMassGrams ?? 0,
    directCigaretteButtCount: calculation.physicalTotals.countedButts ?? 0,
    buttsPerParticipant: calculation.buttsPerParticipant,
    measurements: division.categories.map((category) => ({
      categoryCode: category.code,
      massGrams: measurementFor(team.team_ref, category.code).mass_grams,
      directObjectCount: category.code === "cigarette_butts" ? closureTeam.direct_cigarette_butt_count : null,
    })),
  };
}

function buildEnvironmentalTotals(results: CachanSyntheticTeamResult[], divisions: CachanSyntheticDivisionProjection[]) {
  const massGramsByCategory: Record<string, number> = {};
  for (const measurement of allMeasurements()) massGramsByCategory[measurement.category_code] = (massGramsByCategory[measurement.category_code] ?? 0) + measurement.mass_grams;
  return {
    totalMassGrams: results.reduce((total, team) => total + team.massGrams, 0),
    cigaretteButtMassGrams: results.reduce((total, team) => total + team.cigaretteButtMassGrams, 0),
    directCigaretteButtCount: results.reduce((total, team) => total + team.directCigaretteButtCount, 0),
    massGramsByCategory,
    byDivision: divisions.map((division) => ({
      divisionRef: division.divisionRef,
      totalMassGrams: division.teams.reduce((total, team) => total + team.massGrams, 0),
      cigaretteButtMassGrams: division.teams.reduce((total, team) => total + team.cigaretteButtMassGrams, 0),
      directCigaretteButtCount: division.teams.reduce((total, team) => total + team.directCigaretteButtCount, 0),
    })),
  };
}

export function getSpogomiCachanDemoClosureProjection(): CachanSyntheticClosureProjection {
  const basePlaceIds = baseScenario.teams.flatMap((team) => team.place_ids);
  const presentPlaceIds = closureExtension.teams.flatMap((team) => team.present_place_ids);
  if (basePlaceIds.length !== 37 || new Set(basePlaceIds).size !== 37 || JSON.stringify([...basePlaceIds].sort()) !== JSON.stringify([...presentPlaceIds].sort())) {
    throw new Error("Synthetic closure must preserve the 37 unique places");
  }
  const divisions: CachanSyntheticDivisionProjection[] = baseScenario.divisions.map((division) => {
    const teams = baseScenario.teams.filter((team) => team.division_ref === division.division_ref).map((team) => buildTeamResult(team, division));
    return {
      divisionRef: division.division_ref,
      divisionType: division.division_type as "casual" | "world_cup",
      regulationRef: division.regulation_ref,
      teams,
      sportRanking: rankTeams(teams, (team) => team.score, "desc"),
      buttsPerParticipantRanking: rankTeams(teams, (team) => team.buttsPerParticipant, "asc"),
    };
  });
  const allResults = divisions.flatMap((division) => division.teams);
  return {
    extensionRef: closureExtension.extension_ref,
    official: false,
    syntheticNotice: closureExtension.synthetic_notice,
    edition: {
      title: closureExtension.edition.title,
      date: closureExtension.edition.date,
      timezone: closureExtension.edition.timezone,
      locationLabel: closureExtension.edition.location_label,
      state: closureExtension.edition.state,
      regulationsUsed: [...closureExtension.edition.regulations_used],
      chronology: closureExtension.edition.chronology.map((item) => ({ ...item })),
      closureDecisions: closureExtension.edition.closure_decisions.map((item) => ({ divisionRef: item.division_ref, decision: item.decision })),
    },
    parentActionRef: baseScenario.parent_action_ref,
    placesCount: new Set(basePlaceIds).size,
    teamCount: allResults.length,
    divisionCount: divisions.length,
    presentParticipants: new Set(presentPlaceIds).size,
    divisions,
    environmentalTotals: buildEnvironmentalTotals(allResults, divisions),
  };
}
