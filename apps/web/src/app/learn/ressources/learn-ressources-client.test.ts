import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

type TrackerProps = {
  pageId: string;
};

const trackerCalls: TrackerProps[] = [];

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img"> & { fill?: boolean; unoptimized?: boolean }) => {
    const { fill, unoptimized, ...rest } = props;
    void fill;
    void unoptimized;
    return React.createElement("img", rest);
  },
}));

vi.mock("react-big-calendar", () => ({
  Calendar: () => React.createElement("div", { "data-testid": "calendar" }),
  dateFnsLocalizer: () => ({}),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: "fr",
  }),
}));

vi.mock("@/components/learn/learn-rubric-shell", () => ({
  LearnRubricShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "shell" }, children),
}));

vi.mock("@/components/learn/learn-page-visit-tracker", () => ({
  LearnPageVisitTracker: (props: TrackerProps) => {
    trackerCalls.push(props);
    return null;
  },
}));

import { LearnArtworkAccordion, LearnRessourcesClient, LearnRessourcesOverview } from "./learn-ressources-client";

describe("LearnRessourcesOverview", () => {
  it("renders the three entry blocks before the calendar section", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnRessourcesOverview, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Kit terrain");
    expect(markup).toContain("Repères de tri");
    expect(markup).toContain("Événements utiles");
    expect(markup).toContain("Ouvrir l&#x27;assistant tri");
    expect(markup).toContain("Voir le calendrier");
    expect(markup).toContain("Aperçu immédiat");
  });

  it("renders the expandable artwork references with their titles", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnArtworkAccordion, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Culture visuelle");
    expect(markup).toContain("Références artistiques à ouvrir si besoin");
    expect(markup).toContain("Les fiches restent fermées au départ");
    expect(markup).not.toContain("Pictures of Garbage");
    expect(markup).not.toContain("The Great Indoors");
    expect(markup).not.toContain("Hong Kong Soup: 1826");
    expect(markup).not.toContain("Washed Ashore Project");
    expect(markup).not.toContain("Moffat Takadiwa");
    expect(markup).toContain("focus-visible:ring-2");
    expect(markup).toContain("focus-visible:ring-amber-300/70");
  });

  it("renders the detailed artwork references when opened", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnArtworkAccordion, {
        locale: "fr",
        defaultOpen: true,
      }),
    );

    expect(markup).toContain("Pictures of Garbage");
    expect(markup).toContain("The Great Indoors");
    expect(markup).toContain("Hong Kong Soup: 1826");
    expect(markup).toContain("Washed Ashore Project");
    expect(markup).toContain("Moffat Takadiwa");
  });
});

describe("LearnRessourcesClient", () => {
  it("opens on the three entry blocks and records the consulted page", () => {
    trackerCalls.length = 0;

    const markup = renderToStaticMarkup(React.createElement(LearnRessourcesClient));

    expect(trackerCalls).toEqual([{ pageId: "bonnes-pratiques" }]);
    expect(markup).toContain("Aperçu immédiat");
    expect(markup).toContain("Parcours du bloc");
    expect(markup).toContain("Culture visuelle");
    expect(markup).toContain("Raccourcis utiles");
    expect(markup).toContain("Sobriété numérique");
    expect(markup).toContain("Nettoyer sa boîte mail et ses abonnements");
    expect(markup).toContain("Hygiène de navigation");
    expect(markup).toContain("Vider l&#x27;historique du navigateur sur « toute durée »");
    expect(markup).toContain("Entretien numérique");
    expect(markup).toContain("Pièces jointes volumineuses");
    expect(markup).toContain("Téléchargements et doublons");
    expect(markup).toContain("Corbeilles cloud");
    expect(markup).toContain("Synchro automatique");
    expect(markup).toContain("Notifications inutiles");
    expect(markup).toContain("Onglets et favoris");
    expect(markup).toContain("Comptes inutiles");
    expect(markup).toContain("Calendrier léger");
    expect(markup).toContain("Ouvrir le calendrier si besoin");
    expect(markup).toContain("Ouvrir l&#x27;assistant tri");
    expect(markup).toContain("Ouvrir le guide compost");
    expect(markup).toContain("Voir le contexte");
    expect(markup.indexOf("Aperçu immédiat")).toBeLessThan(markup.indexOf("Parcours du bloc"));
    expect(markup.indexOf("Parcours du bloc")).toBeLessThan(markup.indexOf("Raccourcis utiles"));
    expect(markup.indexOf("Raccourcis utiles")).toBeLessThan(markup.indexOf("Sobriété numérique"));
    expect(markup.indexOf("Sobriété numérique")).toBeLessThan(markup.indexOf("Calendrier léger"));
    expect(markup.indexOf("Calendrier léger")).toBeGreaterThan(markup.indexOf("Hygiène de navigation"));
    expect(markup.indexOf("Hygiène de navigation")).toBeLessThan(markup.indexOf("Entretien numérique"));
    expect(markup.indexOf("Entretien numérique")).toBeLessThan(markup.indexOf("Calendrier léger"));
    expect(markup.indexOf("Calendrier léger")).toBeLessThan(markup.indexOf("Les gestes qui reviennent le plus"));
    expect(markup.indexOf("Les gestes qui reviennent le plus")).toBeLessThan(markup.indexOf("Culture visuelle"));
    expect(markup).toContain("À faire tous les trimestres");
    expect(markup).toContain("Impact environnemental estimé");
    expect(markup).toContain("Manage subscriptions");
    expect(markup).toContain("toute durée");
    expect(markup).toContain("mots de passe enregistrés");
    expect(markup).toContain("Impact écologique et rythme");
    expect(markup).toContain("tous les trimestres");
    expect(markup).toContain("Chaque mois");
    expect(markup).toContain("Chaque semestre");
    expect(markup).toContain("Aide Gmail");
    expect(markup).not.toContain('data-testid="calendar"');
    expect(markup).not.toContain("Pictures of Garbage");
  });
});
