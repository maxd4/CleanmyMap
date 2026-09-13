import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicImpactMetric } from "@/lib/impact/public-impact-kpis";
import { MapKpiRibbon } from "./map-kpi-ribbon";

const metrics: PublicImpactMetric[] = [
  { key: "wasteKg", label: "Déchets récoltés", value: "12 kg", unit: "kg", decimals: 1, category: "Résultat", accent: "blue", classification: "terrain" },
  { key: "butts", label: "Mégots retirés", value: "40", unit: null, decimals: 0, category: "Résultat", accent: "blue", classification: "terrain" },
  { key: "volunteers", label: "Bénévoles mobilisés", value: "4", unit: null, decimals: 0, category: "Résultat", accent: "blue", classification: "terrain" },
  { key: "co2", label: "CO₂e évité", value: "14,4 kg", unit: "kg", decimals: 1, category: "Équivalent", accent: "emerald", classification: "proxy" },
  { key: "water", label: "Eau préservée", value: "20 000 L", unit: "L", decimals: 0, category: "Équivalent", accent: "emerald", classification: "proxy" },
  { key: "euro", label: "Économie de voirie", value: "18 €", unit: "€", decimals: 0, category: "Économique", accent: "amber", classification: "proxy" },
];

describe("MapKpiRibbon", () => {
  it("separates measured field results from explicitly labelled proxies", () => {
    const markup = renderToStaticMarkup(<MapKpiRibbon metrics={metrics} />);

    expect(markup).toContain("Résultats terrain et proxys");
    expect(markup).toContain("Déchets récoltés");
    expect(markup).toContain("Mégots retirés");
    expect(markup).toContain("Bénévoles mobilisés");
    expect(markup).toContain("CO₂e évité (proxy)");
    expect(markup).toContain("Eau préservée (proxy)");
    expect(markup).toContain("Économie de voirie (proxy)");
    expect(markup).not.toContain("Impact terrain · vue actuelle");
  });
});
