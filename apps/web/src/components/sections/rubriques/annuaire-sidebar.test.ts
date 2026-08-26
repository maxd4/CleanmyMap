import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("annuaire sidebar transparency", () => {
  it("describes the actual provenance and ordering without pseudo-metrics", () => {
    const source = readFileSync(new URL("./annuaire-sidebar.tsx", import.meta.url), "utf8");

    expect(source).toContain("ressources éditoriales");
    expect(source).toContain("fiches partenaires publiées");
    expect(source).toContain("Entrées");
    expect(source).toContain("Mise en avant éventuelle");
    expect(source).toContain("Fiches confirmées");
    expect(source).toContain("Proximité si disponible");
    expect(source).toContain("Ordre alphabétique");
    expect(source).not.toContain("Données Synchronisées");
    expect(source).not.toContain("mises à jour régulièrement par nos services");
    expect(source).not.toContain("Algorithme & Transparence");
    expect(source).not.toContain("+18pts");
    expect(source).not.toContain("+12-18pts");
    expect(source).not.toContain("MAJ < 90j");
    expect(source).not.toContain("calculés en temps réel");
  });
});
