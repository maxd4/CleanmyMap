import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Category = { code: string; points_per_kg: number; required: boolean };
type Division = { division_ref: string; division_type: string; team_size: { min_members: number; max_members: number; exact_members?: number }; rounding: { mode: string; decimals: number }; eligibility: { all_categories_required: boolean; tiebreaker: string }; categories: Category[] };
type Team = { division_ref: string; team_ref: string; place_ids: string[]; initial_measurement_state: string; source_row?: number; expected_score: number | null };
type Measurement = { team_ref: string; category_code: string; mass_grams: number; source_row?: number };
type Scenario = { scenario_name: string; mode: string; official: boolean; parent_action_ref: string; places_source_fixture: string; privacy: { personal_data: boolean; identities: string }; measurement_semantics: { unit: string; unmeasured_mass_grams: null; explicit_zero_mass_grams: number }; divisions: Division[]; teams: Team[]; measurements: Measurement[]; historical_divergences: { participant_counts: number[]; point_totals: number[]; status: string } };

const scenario = JSON.parse(readFileSync(new URL("../../../../../documentation/features/spogomi-references/fixtures/scenario_cachan_cleanmymap_mixed.json", import.meta.url), "utf8")) as Scenario;
const placesCsv = readFileSync(new URL("../../../../../documentation/features/spogomi-references/fixtures/cachan_2026_places_SYNTHETIQUES.csv", import.meta.url), "utf8");

function parsePlaces() {
  const [header, ...lines] = placesCsv.trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [keys[index], value])));
}

function division(ref: string) {
  const found = scenario.divisions.find((item) => item.division_ref === ref);
  if (!found) throw new Error(`Missing division ${ref}`);
  return found;
}

function scoreFor(teamRef: string, divisionRef: string) {
  const rules = new Map(division(divisionRef).categories.map((category) => [category.code, category.points_per_kg]));
  const total = scenario.measurements.filter((measurement) => measurement.team_ref === teamRef).reduce((sum, measurement) => sum + measurement.mass_grams * (rules.get(measurement.category_code) ?? 0), 0);
  return Math.round((total / 1000) * 100) / 100;
}

function forbiddenManifestPaths(value: unknown, path = "scenario"): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => forbiddenManifestPaths(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const current = `${path}.${key}`;
    const keyFinding = /(email|phone|barcode|buyer|latitude|longitude|coordinate|address)/i.test(key) ? [current] : [];
    return [...keyFinding, ...forbiddenManifestPaths(child, current)];
  });
}

describe("SPOGOMI mixed reference scenario", () => {
  it("keeps one synthetic parent action, two divisions and the 37 existing places without duplication", () => {
    expect(scenario.scenario_name).toBe("SPOGOMI Cachan, démonstration CleanMyMap");
    expect(scenario.mode).toBe("mixed");
    expect(scenario.official).toBe(false);
    expect(scenario.parent_action_ref).toBe("ACTION-CACHAN-CLEANMYMAP-DEMO");
    expect(scenario.divisions.map((divisionItem) => divisionItem.division_type)).toEqual(["world_cup", "casual"]);

    const sourceRows = parsePlaces();
    const sourcePlaceIds = sourceRows.map((row) => row.place_id);
    const referencedPlaceIds = scenario.teams.flatMap((team) => team.place_ids);
    expect(sourcePlaceIds).toHaveLength(37);
    expect(new Set(sourcePlaceIds).size).toBe(37);
    expect(new Set(referencedPlaceIds).size).toBe(37);
    expect(new Set(referencedPlaceIds)).toEqual(new Set(sourcePlaceIds));
    expect(sourceRows.every((row) => row.person_display_name === "")).toBe(true);
  });

  it("keeps the requested division orders, compatible team sizes and categories", () => {
    const worldCup = scenario.teams.filter((team) => team.division_ref === "DIV-WORLD-CUP");
    const casual = scenario.teams.filter((team) => team.division_ref === "DIV-CASUAL");
    const worldCupPlaces = new Set(parsePlaces().filter((row) => new Set(["ORD-02", "ORD-01", "ORD-04", "ORD-09", "ORD-10"]).has(row.order_group_id)).map((row) => row.place_id));
    const casualPlaces = new Set(parsePlaces().filter((row) => !new Set(["ORD-02", "ORD-01", "ORD-04", "ORD-09", "ORD-10"]).has(row.order_group_id)).map((row) => row.place_id));
    expect(worldCup).toHaveLength(6);
    expect(worldCup.every((team) => team.place_ids.length > 0)).toBe(true);
    expect(worldCup.every((team) => team.place_ids.length === 3)).toBe(true);
    expect(new Set(worldCup.flatMap((team) => team.place_ids))).toEqual(worldCupPlaces);
    expect(casual.map((team) => team.place_ids.length)).toEqual([4, 4, 4, 4, 3]);
    expect(new Set(casual.flatMap((team) => team.place_ids))).toEqual(casualPlaces);
    expect(division("DIV-WORLD-CUP").team_size.exact_members).toBe(3);
    expect(division("DIV-CASUAL").team_size).toMatchObject({ min_members: 3, max_members: 4 });
    expect(division("DIV-WORLD-CUP").categories.map((category) => category.code)).toEqual(["recyclable", "non_recyclable", "glass", "aluminum_steel", "cigarette_butts"]);
    expect(division("DIV-CASUAL").categories.map((category) => category.code)).toEqual(["household_waste", "batteries", "packaging", "glass", "cigarette_butts"]);
    expect(division("DIV-WORLD-CUP").categories.map((category) => category.points_per_kg)).toEqual([250, 100, 120, 250, 3000]);
    expect(division("DIV-CASUAL").categories.map((category) => category.points_per_kg)).toEqual([100, 100, 250, 120, 3000]);
  });

  it("recomputes the declared fictional coefficients and expected scores in grams", () => {
    for (const divisionItem of scenario.divisions) {
      expect(divisionItem.rounding).toEqual({ mode: "half_up", decimals: 2 });
      expect(divisionItem.eligibility).toEqual({ all_categories_required: true, tiebreaker: "mass_grams" });
      expect(divisionItem.categories.every((category) => category.required && category.points_per_kg > 0)).toBe(true);
    }
    for (const team of scenario.teams.filter((item) => item.expected_score !== null && item.initial_measurement_state !== "no_initial_measurement")) {
      expect(scoreFor(team.team_ref, team.division_ref)).toBe(team.expected_score);
    }
    for (const team of scenario.teams.filter((item) => item.source_row !== undefined)) {
      expect(scenario.measurements.filter((measurement) => measurement.team_ref === team.team_ref).every((measurement) => measurement.source_row === team.source_row)).toBe(true);
    }
    expect(scenario.measurements.every((measurement) => Number.isInteger(measurement.mass_grams) && measurement.mass_grams >= 0)).toBe(true);
    expect(scenario.measurement_semantics).toEqual({ unit: "g", unmeasured_mass_grams: null, explicit_zero_mass_grams: 0, missing_measurement_state: "no_initial_measurement" });
    expect(scenario.measurements.filter((measurement) => measurement.team_ref === "WC-03").every((measurement) => measurement.mass_grams === 0)).toBe(true);
    expect(scenario.teams.filter((team) => team.initial_measurement_state === "no_initial_measurement").flatMap((team) => scenario.measurements.filter((measurement) => measurement.team_ref === team.team_ref))).toEqual([]);
  });

  it("records historical divergences without resolving them and contains no PII fields", () => {
    expect(scenario.historical_divergences).toMatchObject({ participant_counts: [37, 47, 50], point_totals: [13925.3, 14000.3, 14001, 14002], status: "documented_unresolved" });
    expect(forbiddenManifestPaths(scenario)).toEqual([]);
    expect(JSON.stringify(scenario)).not.toMatch(/[^\s@]+@[^\s@]+/);
    expect(scenario.privacy).toEqual({ personal_data: false, identities: "unknown", contact_data: "absent", location_data: "absent" });
  });
});
