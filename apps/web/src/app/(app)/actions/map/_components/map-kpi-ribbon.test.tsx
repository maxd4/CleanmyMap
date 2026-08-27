import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { HomeMetric } from "@/lib/accueil/config";
import { MapKpiRibbon } from "./map-kpi-ribbon";

const metrics: HomeMetric[] = [
  { key: "wasteKg", label: "Déchets récoltés", value: "12 kg", category: "Résultat", accent: "blue" },
  { key: "butts", label: "Mégots retirés", value: "40", category: "Résultat", accent: "blue" },
  { key: "volunteers", label: "Bénévoles mobilisés", value: "4", category: "Résultat", accent: "blue" },
  { key: "co2", label: "CO₂e évité", value: "14,4 kg", category: "Équivalent", accent: "emerald" },
  { key: "water", label: "Eau préservée", value: "20 000 L", category: "Équivalent", accent: "emerald" },
  { key: "euro", label: "Économie de voirie", value: "18 €", category: "Économique", accent: "amber" },
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
