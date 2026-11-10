import { describe, expect, it } from "vitest";
import { getSpogomiCachanDemoClosureProjection } from "./cachan-closure";

function division(projection: ReturnType<typeof getSpogomiCachanDemoClosureProjection>, divisionRef: string) {
  const found = projection.divisions.find((item) => item.divisionRef === divisionRef);
  if (!found) throw new Error(`Missing division ${divisionRef}`);
  return found;
}

describe("SPOGOMI Cachan synthetic closure projection", () => {
  it("keeps the historical 37 places, 11 teams and two independent divisions", () => {
    const projection = getSpogomiCachanDemoClosureProjection();
    const teams = projection.divisions.flatMap((item) => item.teams);
    expect(projection).toMatchObject({ placesCount: 37, presentParticipants: 37, teamCount: 11, divisionCount: 2, official: false });
    expect(new Set(teams.flatMap((team) => team.placeIds)).size).toBe(37);
    expect(teams.every((team) => team.compositionStatus === "verified_synthetic" && team.attendanceStatus === "verified_synthetic")).toBe(true);
    expect(teams.every((team) => team.presentParticipants === team.placeIds.length)).toBe(true);
  });

  it("reuses the scoring engine for every final result and preserves the historical zero", () => {
    const projection = getSpogomiCachanDemoClosureProjection();
    const worldCup = division(projection, "DIV-WORLD-CUP");
    const casual = division(projection, "DIV-CASUAL");
    expect(Object.fromEntries(worldCup.teams.map((team) => [team.teamRef, team.score]))).toEqual({ "WC-01": 372, "WC-02": 744, "WC-03": 0, "WC-04": 530.2, "WC-05": 809.5, "WC-06": 267 });
    expect(Object.fromEntries(casual.teams.map((team) => [team.teamRef, team.score]))).toEqual({ "CAS-01": 2421.5, "CAS-02": 1702.1, "CAS-03": 1019.9, "CAS-04": 438.7, "CAS-05": 380.4 });
    expect(worldCup.teams.find((team) => team.teamRef === "WC-03")?.measurements.every((item) => item.massGrams === 0)).toBe(true);
    expect(worldCup.teams.find((team) => team.teamRef === "WC-04")?.measurements).toHaveLength(5);
    expect(worldCup.teams.every((team) => team.scoreLabel === "synthetic_final")).toBe(true);
  });

  it("keeps sports and direct-cigarette-butt rankings independent within each division", () => {
    const projection = getSpogomiCachanDemoClosureProjection();
    expect(division(projection, "DIV-WORLD-CUP").sportRanking.map((entry) => entry.teamRef)).toEqual(["WC-05", "WC-02", "WC-04", "WC-01", "WC-06", "WC-03"]);
    expect(division(projection, "DIV-CASUAL").sportRanking.map((entry) => entry.teamRef)).toEqual(["CAS-01", "CAS-02", "CAS-03", "CAS-04", "CAS-05"]);
    const worldCupButtsRanking = division(projection, "DIV-WORLD-CUP").buttsPerParticipantRanking;
    const casualButtsRanking = division(projection, "DIV-CASUAL").buttsPerParticipantRanking;
    expect(worldCupButtsRanking.map((entry) => entry.teamRef)).toEqual(["WC-05", "WC-02", "WC-04", "WC-01", "WC-06", "WC-03"]);
    expect(casualButtsRanking.map((entry) => entry.teamRef)).toEqual(["CAS-01", "CAS-02", "CAS-03", "CAS-04", "CAS-05"]);
    expect(worldCupButtsRanking.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(casualButtsRanking.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(worldCupButtsRanking.at(-1)).toMatchObject({ teamRef: "WC-03", rank: 6, value: 0 });
    expect(division(projection, "DIV-WORLD-CUP").teams.find((team) => team.teamRef === "WC-03")?.directCigaretteButtCount).toBe(0);
    expect(division(projection, "DIV-WORLD-CUP").teams.find((team) => team.teamRef === "WC-03")?.cigaretteButtMassGrams).toBe(0);
  });

  it("keeps equal ratios on the same rank while stabilizing their display order", () => {
    const projection = getSpogomiCachanDemoClosureProjection();
    for (const currentDivision of projection.divisions) {
      const ranking = currentDivision.buttsPerParticipantRanking;
      for (let index = 1; index < ranking.length; index += 1) {
        if (ranking[index].value === ranking[index - 1].value) {
          expect(ranking[index].rank).toBe(ranking[index - 1].rank);
        }
      }
    }
  });

  it("consolidates environmental totals once and retains units and provenance boundaries", () => {
    const projection = getSpogomiCachanDemoClosureProjection();
    const allTeams = projection.divisions.flatMap((item) => item.teams);
    const byDivisionMass = projection.environmentalTotals.byDivision.reduce((total, item) => total + item.totalMassGrams, 0);
    const byDivisionButts = projection.environmentalTotals.byDivision.reduce((total, item) => total + item.directCigaretteButtCount, 0);
    expect(projection.environmentalTotals.totalMassGrams).toBe(allTeams.reduce((total, team) => total + team.massGrams, 0));
    expect(projection.environmentalTotals.totalMassGrams).toBe(byDivisionMass);
    expect(projection.environmentalTotals.directCigaretteButtCount).toBe(byDivisionButts);
    expect(projection.environmentalTotals.massGramsByCategory.cigarette_butts).toBe(projection.environmentalTotals.cigaretteButtMassGrams);
    expect(projection.edition.timezone).toBe("Europe/Paris");
    expect(projection.edition.chronology.every((step) => step.at.endsWith("+02:00"))).toBe(true);
    expect(JSON.stringify(projection)).not.toMatch(/email|phone|barcode|address|latitude|longitude/i);
  });
});
