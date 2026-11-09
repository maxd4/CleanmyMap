/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SpogomiPublicEvents, SpogomiUnderstanding } from "./spogomi-index-sections";

const copy: Record<string, string> = {
  "understanding.title": "Comprendre SPOGOMI",
  "understanding.description": "Formats des compétitions, règlement et sécurité.",
  "understanding.presentationTab": "Présentation",
  "understanding.formatsTab": "Formats & compétitions",
  "understanding.rulesTab": "Règlement & sécurité",
  "understanding.worldTab": "Le mouvement dans le monde",
  "understanding.presentationTitle": "Qu’est-ce que SPOGOMI ?",
  "understanding.rulesTitle": "Règlement & sécurité",
  "understanding.rulesDescription": "Une épreuve se déroule dans une zone délimitée.",
  "understanding.rulesCasual": "Format général : équipes de 2 à 5.",
  "understanding.rulesWorldCup": "World Cup : équipes de 3.",
  "understanding.rulesSafety": "Sécurité : marche obligatoire.",
  "understanding.rulesSanctions": "Sanctions : pénalités et disqualification.",
  "understanding.rulesHistoricalExamplesTitle": "Exemples historiques sourcés",
  "understanding.rulesHistoricalExampleNice": "Nice — 16/03/2024 : Casual, 80 participants et 203 kg.",
  "understanding.rulesHistoricalExampleParis": "Paris — 26/04/2025 : collecte de 15 h à 16 h, puis tri et pesée.",
  "understanding.rulesHistoricalExampleBobigny": "Bobigny — 24/05/2025 : 28 équipes, 349,7 kg, victoire de MML.",
  "understanding.rulesPrivacyNote": "Note confidentialité : les données nominatives restent privées.",
  "international.worldDescription": "Présentation du mouvement.",
  "international.casualTitle": "Casual",
  "international.casualDescription": "Format japonais général : équipes de 2 à 5.",
  "international.worldCupTitle": "World Cup",
  "international.worldCupDescription": "World Cup : équipes de 3.",
  "international.cleanMyMapRole": "Rôle local de CleanMyMap.",
};

function renderUnderstanding() {
  return <SpogomiUnderstanding locale="fr" t={(key) => copy[key] ?? key} />;
}

describe("SpogomiUnderstanding", () => {
  it("renders four compact accessible tabs and preserves the sourced content", () => {
    const markup = renderToStaticMarkup(renderUnderstanding());

    expect(markup.match(/role="tab"/g)).toHaveLength(4);
    expect(markup.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain("Présentation du mouvement.");
    expect(markup).toContain("Présentation");
    expect(markup).toContain("Formats &amp; compétitions");
    expect(markup).toContain("Règlement &amp; sécurité");
    expect(markup).toContain("Le mouvement dans le monde");
    expect(markup).toContain('id="spogomi-international"');
    expect(markup.match(/data-cmm-card-tone="slate"/g)).toHaveLength(1);
    expect(markup).not.toContain('data-cmm-card-tone="indigo"');
  });

  describe("keyboard navigation", () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      act(() => {
        root = createRoot(container);
        root.render(renderUnderstanding());
      });
    });

    afterEach(() => {
      act(() => root.unmount());
      container.remove();
    });

    it("changes panels on click and moves through tabs with ArrowRight", () => {
      const tabs = () => [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      expect(tabs()[0]?.getAttribute("aria-selected")).toBe("true");

      act(() => { tabs()[1]?.click(); });
      expect(tabs()[1]?.getAttribute("aria-selected")).toBe("true");
      expect(container.textContent).toContain("Format japonais général : équipes de 2 à 5.");
      expect(container.querySelector("#spogomi-international")).not.toBeNull();
      expect(container.textContent).toContain("Octobre 2027 — date précise à confirmer");

      act(() => {
        tabs()[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
      });
      expect(tabs()[2]?.getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(tabs()[2]);
      expect(container.textContent).toContain("Sanctions : pénalités et disqualification.");
      expect(container.textContent).toContain("Note confidentialité : les données nominatives restent privées.");
      expect(container.querySelector('a[href="https://www.artema-network.com/spogomi-nice"]')).not.toBeNull();
      expect(container.querySelector('a[href="https://www.artema-network.com/evenements-passes"]')).not.toBeNull();
      expect(container.querySelector("#spogomi-international")).toBeNull();

      act(() => { tabs()[3]?.click(); });
      expect(container.querySelector("#spogomi-international")).not.toBeNull();
      expect(container.querySelectorAll('[data-cmm-card-tone="slate"]')).toHaveLength(1);
      expect(container.textContent).toContain("40 pays et régions annoncés");
    });
  });
});

describe("SpogomiPublicEvents", () => {
  it("groups active editions before finished editions and exposes a separate Cachan demonstration", () => {
    const events = [
      { id: "active", slug: "active", name: "SPOGOMI en cours", locationLabel: "Paris", mode: "casual", state: "in_progress", lifecycle: "in_progress", calendarStatus: "in_progress", registrationStatus: "open", resultsStatus: "unavailable", provenance: "published_event", startsAt: "2026-11-08T08:00:00.000Z", endsAt: null, officialTimezone: "Europe/Paris", actionHref: null, divisions: [], teams: [], route: null, results: null, organizer: null, gallery: [] },
      { id: "finished", slug: "finished", name: "SPOGOMI terminée", locationLabel: "Nice", mode: "world_cup", state: "in_progress", lifecycle: "finished", calendarStatus: "finished", registrationStatus: "closed", resultsStatus: "unavailable", provenance: "published_event", startsAt: "2026-10-08T08:00:00.000Z", endsAt: "2026-10-08T12:00:00.000Z", officialTimezone: "Europe/Paris", actionHref: null, divisions: [], teams: [], route: null, results: null, organizer: null, gallery: [] },
    ] as Parameters<typeof SpogomiPublicEvents>[0]["events"];
    const markup = renderToStaticMarkup(<SpogomiPublicEvents events={events} loadError={false} />);

    expect(markup).toContain("À venir et en cours");
    expect(markup).toContain("Éditions terminées");
    expect(markup.indexOf("À venir et en cours")).toBeLessThan(markup.indexOf("Éditions terminées"));
    expect(markup.match(/data-testid="spogomi-published-event-card"/g)).toHaveLength(2);
    expect(markup).toContain("Voir la démonstration Cachan");
    expect(markup).toContain("/spogomi/demonstration/cachan");
    expect(markup).toContain("Résultats indisponibles");
    expect(markup).toContain("Édition publiée · données de l’organisateur");
  });
});
