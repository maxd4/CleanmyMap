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
  it("guards the five rows with provenance and immutable markers", () => {
    expect(migration).toContain("Google Sheet");
    expect(migration).toContain("Mairie du 20ᵉ arrondissement");
    expect(migration).toContain("Studio Ferber");
    expect(migration).toContain("Porte des Lilas");
    expect(migration).toContain("Ecole élémentaire Pierre Foncin");
    expect(migration).toContain("Rue Jacques Louvel-Tessier");
    expect(migration).toContain("<> 1");
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
