import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiInternationalContent } from "./spogomi-international-content";
import { SPOGOMI_EXTERNAL_EVENTS, SPOGOMI_INTERNATIONAL_NEWS, SPOGOMI_INTERNATIONAL_SOURCES } from "@/lib/spogomi/international-content";

const copy = {
  worldTitle: "SPOGOMI dans le monde",
  worldDescription: "Présentation du mouvement.",
  cleanMyMapRole: "Rôle local de CleanMyMap.",
  officialSources: "Références officielles vérifiées",
  verifiedOn: "Vérifié le",
  newsTitle: "Actualités officielles",
  confirmed: "Confirmé",
  planned: "Prévisionnel",
  internationalEvents: "Événements internationaux",
  year: "Année",
  country: "Pays",
  allYears: "Toutes les années",
  allCountries: "Tous les pays connus",
  externalEvent: "Références externes",
  source: "Source officielle",
  noExternalEvents: "Aucun événement externe vérifié pour ces filtres.",
  newsDetails: "Voir les actualités vérifiées",
  filtersDetails: "Voir les filtres et événements",
  worldDetails: "Voir le rôle de CleanMyMap et les sources",
};

describe("SpogomiInternationalContent", () => {
  it("keeps the international content in three compact disclosures without changing its data", () => {
    const markup = renderToStaticMarkup(
      <SpogomiInternationalContent
        locale="fr"
        sources={SPOGOMI_INTERNATIONAL_SOURCES}
        news={SPOGOMI_INTERNATIONAL_NEWS}
        externalEvents={SPOGOMI_EXTERNAL_EVENTS}
        copy={copy}
      />,
    );

    expect(markup.match(/<div data-cmm-card-tone="indigo"/g)).toHaveLength(3);
    expect(markup.match(/<details/g)).toHaveLength(3);
    expect(markup.match(/<summary/g)).toHaveLength(3);
    expect(markup).not.toContain(" open");
    expect(markup).toContain("https://spogomi.or.jp/");
    expect(markup).toContain("2026-10-12");
    expect(markup).toContain("Prévisionnel");
    expect(markup).toContain("Octobre 2027 — date précise à confirmer");
    expect(markup).toContain('aria-label="Événements internationaux filters"');
    expect(markup).toContain("Toutes les années");
    expect(markup).toContain("Tous les pays connus");
  });

  it("renders event years in numeric order for the business filter", () => {
    const baseEvent = SPOGOMI_EXTERNAL_EVENTS[0];
    const markup = renderToStaticMarkup(
      <SpogomiInternationalContent
        locale="fr"
        sources={[]}
        news={[]}
        externalEvents={[
          { ...baseEvent, id: "event-2027", year: 2027 },
          { ...baseEvent, id: "event-2025", year: 2025 },
        ]}
        copy={copy}
      />,
    );

    expect(markup.indexOf('value="2025"')).toBeLessThan(markup.indexOf('value="2027"'));
  });
});
