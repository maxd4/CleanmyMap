import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260913000006_restore_historical_waste_null_semantics.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("historical waste repair and NULL contract", () => {
  type ReplayDecision = "skip-historical-patch" | "apply-historical-patch" | "abort";

  function classifyIdentityCardinalities(cardinalities: readonly number[]): ReplayDecision {
    const presentIdentities = cardinalities.filter((count) => count > 0).length;
    const invalidCardinalities = cardinalities.filter((count) => ![0, 1].includes(count)).length;

    if (invalidCardinalities !== 0 || ![0, 5].includes(presentIdentities)) return "abort";
    return presentIdentities === 0 ? "skip-historical-patch" : "apply-historical-patch";
  }

  it("guards the five rows with provenance and immutable markers", () => {
    expect(migration).toContain("Google Sheet");
    expect(migration).toContain("Mairie du 20ᵉ arrondissement");
    expect(migration).toContain("Studio Ferber");
    expect(migration).toContain("Porte des Lilas");
    expect(migration).toContain("Ecole élémentaire Pierre Foncin");
    expect(migration).toContain("Rue Jacques Louvel-Tessier");
    expect(migration).toContain("matching_count not in (0, 1)");
    expect(migration).toContain("waste_kg is distinct from e.expected_waste_kg");
  });

  it.each([
    [[0, 0, 0, 0, 0], "skip-historical-patch"],
    [[1, 1, 1, 1, 1], "apply-historical-patch"],
    [[1, 0, 0, 0, 0], "abort"],
    [[1, 1, 1, 1, 0], "abort"],
    [[2, 1, 1, 1, 1], "abort"],
  ] as const)("classifies identity cardinalities %j as %s", (cardinalities, decision) => {
    expect(classifyIdentityCardinalities(cardinalities)).toBe(decision);
  });

  it("wires the cardinality decision before the historical DML and preserves the replay path", () => {
    expect(migration).toContain("count(*) filter (where matching_count > 0)");
    expect(migration).toContain("count(*) filter (where matching_count not in (0, 1))");
    expect(migration).toContain(
      "if v_invalid_cardinalities <> 0 or v_present_identities not in (0, 5) then",
    );
    expect(migration).toContain("historical identity set is partial or duplicated");
    expect(migration).toContain("if v_present_identities = 5 then");
    expect(migration.indexOf("if v_present_identities = 5 then")).toBeLessThan(
      migration.indexOf("set waste_kg = e.expected_waste_kg"),
    );
    expect(migration).toContain("create or replace function public.estimate_public_action_waste_kg(");
    expect(migration).toContain("create function public.load_public_landing_action_summary_incremental()");
  });

  it("keeps the historical value fail-closed when all five identities exist", () => {
    expect(migration).toContain("if v_unexpected_value <> 0 then");
    expect(migration).toContain(
      "Historical waste repair aborted: % rows have an unexpected pre-existing waste_kg",
    );
    expect(migration).toContain("waste_kg is distinct from e.expected_waste_kg");
  });

  it("only updates waste_kg and keeps the butt conversion out of the SQL source", () => {
    expect(migration).toMatch(/set waste_kg = e\.expected_waste_kg/);
    expect(migration).not.toContain("set cigarette_butts");
    expect(migration).not.toContain("set volunteers_count");
    expect(migration).not.toContain("set duration_minutes");
    expect(migration).toContain("waste_source_count");
    expect(migration).toContain("p_declared_waste_kg is null then 0");
    expect(migration).not.toContain("cigarette_butts, 0), 0)::numeric / 2500");
  });
});
