/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SpogomiInternational,
  SpogomiPublicEvents,
  SpogomiUnderstanding,
} from "./spogomi-index-sections";

const copy: Record<string, string> = {
  "understanding.howItWorksTitle": "Qu’est-ce qu’une compétition SPOGOMI ?",
  "understanding.howItWorksDescription": "Le déroulé commun.",
  "understanding.stepTeamsTitle": "Constituer les équipes",
  "understanding.stepTeamsDescription": "Les équipes se forment.",
  "understanding.stepCollectTitle": "Collecter les déchets",
  "understanding.stepCollectDescription": "La collecte commence.",
  "understanding.stepReturnTitle": "Retourner au point prévu",
  "understanding.stepReturnDescription": "Le retour est effectué.",
  "understanding.stepSortTitle": "Trier et peser",
  "understanding.stepSortDescription": "Les déchets sont triés.",
  "understanding.stepPointsTitle": "Calculer les points",
  "understanding.stepPointsDescription": "Le score suit le règlement.",
  "understanding.formatsTitle": "Formats et règlements",
  "understanding.formatsDescription":
    "Les éditions précisent leurs paramètres.",
  "understanding.compositionLabel": "Composition",
  "understanding.processLabel": "Déroulement",
  "understanding.pointsLabel": "Points et classement",
  "understanding.casualComposition": "Casual, deux à cinq.",
  "understanding.casualProcess": "Collecte puis tri.",
  "understanding.casualPoints": "Points selon l’édition.",
  "understanding.worldCupComposition": "World Cup, trois.",
  "understanding.worldCupProcess": "Collecte puis tri compétitif.",
  "understanding.worldCupPoints": "Points selon les catégories.",
  "understanding.commonRulesTitle": "Règles communes et détails sourcés",
  "understanding.rulesDescription": "Une épreuve est délimitée.",
  "understanding.rulesCasual": "Casual : équipes de 2 à 5.",
  "understanding.rulesWorldCup": "World Cup : équipes de 3.",
  "understanding.rulesSafety": "Sécurité : marche obligatoire.",
  "understanding.rulesSanctions": "Sanctions selon le règlement.",
  "understanding.rulesHistoricalExamplesTitle": "Exemples historiques sourcés",
  "understanding.rulesHistoricalExampleNice": "Nice — exemple.",
  "understanding.rulesHistoricalExampleParis": "Paris — exemple.",
  "understanding.rulesHistoricalExampleBobigny": "Bobigny — exemple.",
  "understanding.rulesPrivacyNote": "Les données nominatives restent privées.",
  "international.casualTitle": "Casual",
  "international.casualDescription": "Format général Casual.",
  "international.worldCupTitle": "World Cup",
  "international.worldCupDescription": "Format compétitif World Cup.",
  "international.worldTitle": "SPOGOMI dans le monde",
  "international.worldDescription": "Présentation du mouvement.",
  "international.cleanMyMapRole": "Rôle local de CleanMyMap.",
  "international.officialSources": "Sources officielles.",
  "international.verifiedOn": "Vérifié le",
  "international.newsTitle": "Actualités officielles",
  "international.confirmed": "Confirmé",
  "international.planned": "Prévisionnel",
  "international.dateSet": "Date fixée",
  "international.eventsTitle": "Événements internationaux",
  "international.year": "Année",
  "international.country": "Pays",
  "international.allYears": "Toutes les années",
  "international.allCountries": "Tous les pays",
  "international.externalEvent": "Références externes.",
  "international.source": "Source",
  "international.noExternalEvents": "Aucun événement.",
};

const t = (key: string) => copy[key] ?? key;

describe("SpogomiUnderstanding", () => {
  it("renders the process and both formats without tab systems", () => {
    const markup = renderToStaticMarkup(
      <SpogomiUnderstanding locale="fr" t={t} />,
    );

    expect(markup).not.toContain('role="tablist"');
    expect(markup).not.toContain('role="tab"');
    expect(markup).toContain('id="spogomi-how-it-works"');
    expect(markup).toContain('id="spogomi-formats-rules"');
    expect(markup).toContain("Constituer les équipes");
    expect(markup).toContain("Trier et peser");
    expect(markup).toContain("Casual");
    expect(markup).toContain("World Cup");
    expect(markup).toContain("Règles communes et détails sourcés");
    expect(markup.indexOf("spogomi-how-it-works")).toBeLessThan(
      markup.indexOf("spogomi-formats-rules"),
    );
    expect(markup.match(/data-cmm-card-tone="emerald"/g)).toHaveLength(2);
  });

  it("keeps the international content in its own secondary section", () => {
    const markup = renderToStaticMarkup(
      <SpogomiInternational locale="fr" t={t} />,
    );

    expect(markup).toContain('id="spogomi-world"');
    expect(markup).toContain('id="spogomi-international"');
    expect(markup).toContain("SPOGOMI dans le monde");
    expect(markup).toContain("Actualités officielles");
    expect(markup).toContain("Événements internationaux");
  });
});

describe("SpogomiPublicEvents", () => {
  it("groups active editions before finished editions and exposes a separate Cachan demonstration", () => {
    const events = [
      {
        id: "active",
        slug: "active",
        name: "SPOGOMI en cours",
        locationLabel: "Paris",
        mode: "casual",
        state: "in_progress",
        lifecycle: "in_progress",
        calendarStatus: "in_progress",
        registrationStatus: "open",
        resultsStatus: "unavailable",
        provenance: "published_event",
        startsAt: "2026-11-08T08:00:00.000Z",
        endsAt: null,
        officialTimezone: "Europe/Paris",
        actionHref: null,
        divisions: [],
        teams: [],
        route: null,
        results: null,
        organizer: null,
        gallery: [],
      },
      {
        id: "finished",
        slug: "finished",
        name: "SPOGOMI terminée",
        locationLabel: "Nice",
        mode: "world_cup",
        state: "in_progress",
        lifecycle: "finished",
        calendarStatus: "finished",
        registrationStatus: "closed",
        resultsStatus: "unavailable",
        provenance: "published_event",
        startsAt: "2026-10-08T08:00:00.000Z",
        endsAt: "2026-10-08T12:00:00.000Z",
        officialTimezone: "Europe/Paris",
        actionHref: null,
        divisions: [],
        teams: [],
        route: null,
        results: null,
        organizer: null,
        gallery: [],
      },
    ] as Parameters<typeof SpogomiPublicEvents>[0]["events"];
    const markup = renderToStaticMarkup(
      <SpogomiPublicEvents events={events} loadError={false} />,
    );

    expect(markup).toContain("03");
    expect(markup).toContain("Compétitions disponibles");
    expect(markup).toContain("À venir et en cours");
    expect(markup).toContain("Éditions terminées");
    expect(markup.indexOf("À venir et en cours")).toBeLessThan(
      markup.indexOf("Éditions terminées"),
    );
    expect(
      markup.match(/data-testid="spogomi-published-event-card"/g),
    ).toHaveLength(2);
    expect(markup).toContain("Voir la démonstration Cachan");
    expect(markup).toContain("/spogomi/demonstration/cachan");
    expect(markup).toContain("Résultats indisponibles");
    expect(markup).toContain("Édition publiée · données de l’organisateur");
  });

  it("opens the published competition card information panel through the shared portal", () => {
    const event = {
      id: "published-card",
      slug: "published-card",
      name: "SPOGOMI publiée",
      locationLabel: "Paris",
      mode: "casual",
      state: "registration_open",
      lifecycle: "upcoming",
      calendarStatus: "upcoming",
      registrationStatus: "open",
      resultsStatus: "unavailable",
      provenance: "published_event",
      startsAt: "2026-12-08T08:00:00.000Z",
      endsAt: null,
      officialTimezone: "Europe/Paris",
      actionHref: "/spogomi/published-card",
      divisions: [],
      teams: [],
      route: null,
      results: null,
      organizer: null,
      gallery: [],
    } as Parameters<typeof SpogomiPublicEvents>[0]["events"][number];
    const container = document.createElement("div");
    document.body.appendChild(container);
    let root: ReturnType<typeof createRoot>;

    act(() => {
      root = createRoot(container);
      root.render(<SpogomiPublicEvents events={[event]} loadError={false} />);
    });
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Informations sur SPOGOMI publiée"]',
    );
    expect(trigger).not.toBeNull();
    act(() => {
      trigger?.click();
    });
    const panel = document.body.querySelector<HTMLElement>(
      "#spogomi-event-info-published-card",
    );
    expect(panel?.parentElement).toBe(document.body);
    expect(panel?.getAttribute("role")).toBe("dialog");
    expect(panel?.textContent).toContain(
      "Ouvrir la fiche publique de cette compétition",
    );
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(
      document.body.querySelector("#spogomi-event-info-published-card"),
    ).toBeNull();
    act(() => root.unmount());
    container.remove();
  });

  it("keeps the creation button after an empty catalog", () => {
    const markup = renderToStaticMarkup(
      <SpogomiPublicEvents events={[]} loadError={false} canCreate />,
    );
    expect(markup).toContain('href="/spogomi/nouveau"');
    expect(markup).toContain("Créer un événement");
    expect(markup.indexOf("Créer un événement")).toBeGreaterThan(
      markup.indexOf("Aucune compétition SPOGOMI publiée"),
    );
  });

  it("does not render a creation action without the server permission", () => {
    const markup = renderToStaticMarkup(
      <SpogomiPublicEvents events={[]} loadError={false} />,
    );
    expect(markup).not.toContain("/spogomi/nouveau");
    expect(markup).not.toContain("Créer un événement");
  });
});
