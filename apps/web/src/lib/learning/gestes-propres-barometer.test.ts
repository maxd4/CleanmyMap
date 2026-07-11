import { describe, expect, it } from "vitest";

import { GESTES_PROPRES_BAROMETER_2025, GESTES_PROPRES_BAROMETER_MYTHS } from "./gestes-propres-barometer";

describe("GESTES_PROPRES_BAROMETER_2025", () => {
  it("keeps the canonical study metadata and PDF path", () => {
    expect(GESTES_PROPRES_BAROMETER_2025.title.fr).toBe("Baromètre 1ère édition IFOP pour Gestes Propres 2025");
    expect(GESTES_PROPRES_BAROMETER_2025.subtitle.fr).toBe("Les Français et les déchets abandonnés");
    expect(GESTES_PROPRES_BAROMETER_2025.organization.fr).toBe("IFOP × Gestes Propres");
    expect(GESTES_PROPRES_BAROMETER_2025.fieldworkPeriod.fr).toBe("Septembre 2025");
    expect(GESTES_PROPRES_BAROMETER_2025.pdfPath).toBe(
      "documentation/pages_site/routes/05-apprendre/learn-bonnes-pratiques/gestespropres-Barometre_2025.pdf",
    );
    expect(GESTES_PROPRES_BAROMETER_2025.pageCount).toBe(10);
    expect(GESTES_PROPRES_BAROMETER_2025.sampleSize).toBe(2001);
    expect(GESTES_PROPRES_BAROMETER_2025.interpretationNote.fr).toContain("déclaratif");
  });

  it("keeps the prioritized KPIs and their source pages", () => {
    const metrics = Object.values(GESTES_PROPRES_BAROMETER_2025.categories).flat();
    const metricIds = metrics.map((metric) => metric.id);

    expect(GESTES_PROPRES_BAROMETER_2025.featuredKpiIds).toEqual([
      "declared-practices-abandon-12-mois",
      "false-belief-biodegradable-nature",
      "social-influence-observe",
      "positive-engagement-ramassage-autrui",
    ]);
    expect(new Set(metricIds).size).toBe(metricIds.length);

    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "declared-practices-abandon-12-mois", value: 35, sourcePage: 5 }),
        expect.objectContaining({ id: "false-belief-biodegradable-nature", value: 54, sourcePage: 7 }),
        expect.objectContaining({ id: "social-influence-observe", value: 61, sourcePage: 8 }),
        expect.objectContaining({ id: "positive-engagement-ramassage-autrui", value: 58, sourcePage: 9 }),
        expect.objectContaining({ id: "perception-environnement-cadre-vie", value: 93, sourcePage: 3 }),
        expect.objectContaining({ id: "declared-practices-jeter-correctement", value: 98, sourcePage: 5 }),
        expect.objectContaining({ id: "declared-practices-megots-vertueux", value: 94, sourcePage: 5 }),
        expect.objectContaining({ id: "declared-practices-megot-annee", value: 30, sourcePage: 5 }),
        expect.objectContaining({ id: "false-belief-plage-ramasse", value: 47, sourcePage: 7 }),
        expect.objectContaining({ id: "false-belief-megots-ramasses", value: 30, sourcePage: 7 }),
        expect.objectContaining({ id: "false-belief-chewing-gum-plastique", value: 31, sourcePage: 7 }),
        expect.objectContaining({ id: "social-influence-proche", value: 68, sourcePage: 8 }),
        expect.objectContaining({ id: "social-influence-enfant", value: 76, sourcePage: 8 }),
      ]),
    );
  });

  it("keeps the corrected false-belief cards and real destinations", () => {
    expect(GESTES_PROPRES_BAROMETER_MYTHS).toHaveLength(4);
    expect(GESTES_PROPRES_BAROMETER_MYTHS.map((item) => item.metricId)).toEqual([
      "false-belief-biodegradable-nature",
      "false-belief-plage-ramasse",
      "false-belief-megots-ramasses",
      "false-belief-chewing-gum-plastique",
    ]);
    expect(GESTES_PROPRES_BAROMETER_MYTHS.map((item) => item.ctaHref)).toEqual([
      "/sections/compost",
      "/sections/trash-spotter",
      "/sections/trash-spotter",
      "/sections/recycling",
    ]);
    expect(GESTES_PROPRES_BAROMETER_MYTHS.every((item) => item.sourcePage === 7)).toBe(true);
  });
});
