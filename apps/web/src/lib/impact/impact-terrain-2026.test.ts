import { describe, expect, it } from "vitest";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  BUTTS_PER_KG_REFERENCE,
  buildImpactTerrain2026Methodology,
} from "./impact-terrain-2026";

describe("Impact terrain 2026 methodology domain", () => {
  it("defines the six homepage KPIs through one shared semantic contract", () => {
    const methodology = buildImpactTerrain2026Methodology();

    expect(methodology.kpis).toHaveLength(6);
    expect(methodology.kpis.map((kpi) => kpi.key)).toEqual([
      "wasteKg",
      "butts",
      "volunteers",
      "co2",
      "water",
      "euro",
    ]);
    expect(new Set(methodology.kpis.map((kpi) => kpi.key)).size).toBe(6);
    expect(methodology.semanticLayers).toHaveLength(5);

    for (const kpi of methodology.kpis) {
      expect(kpi.semantics.terrainData.fr).toBeTruthy();
      expect(kpi.semantics.aggregation.fr).toBeTruthy();
      expect(kpi.semantics.result.fr).toBeTruthy();
      expect(kpi.semantics.pedagogicalConversion.fr).toBeTruthy();
      expect(kpi.formula.fr).toBeTruthy();
      expect(kpi.assumptions.length).toBeGreaterThan(0);
      expect(kpi.references.length).toBeGreaterThan(0);
      expect(kpi.limits.length).toBeGreaterThan(0);
    }
  });

  it("uses the configured runtime factors instead of duplicating proxy constants", () => {
    const methodology = buildImpactTerrain2026Methodology();
    const byKey = Object.fromEntries(
      methodology.kpis.map((kpi) => [kpi.key, kpi]),
    );

    expect(BUTTS_PER_KG_REFERENCE).toBe(2_500);
    expect(byKey.co2?.formula.fr).toContain(
      String(IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg),
    );
    expect(byKey.water?.formula.fr).toContain(
      String(IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
    );
    expect(byKey.euro?.formula.fr).toContain(
      String(IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg),
    );
    expect(byKey.wasteKg?.formula.fr).toContain(
      String(BUTTS_PER_KG_REFERENCE),
    );
  });
});
