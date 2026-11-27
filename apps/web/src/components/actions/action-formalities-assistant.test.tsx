import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deriveActionFormalitiesFacts } from "@/lib/actions/formalities/facts";
import { qualifyActionFormalities } from "@/lib/actions/formalities/qualification";
import { buildFormalitiesWorkflowState } from "@/lib/actions/formalities/workflow";
import type { SupportNeed } from "@/lib/actions/formalities/accompaniment";
import { ActionFormalitiesQualificationView } from "./action-formalities-qualification-view";
import { ActionFormalitiesWorkflowPanel } from "./action-formalities-workflow-panel";

function parisCleanwalk(arrondissementCode: string) {
  const resolvedTerritory = {
    commune: { code: "75056", name: "Paris" },
    department: { code: "75", name: "Paris" },
    region: { code: "11", name: "Île-de-France" },
    specialTerritory: { code: "FR-PARIS", name: "Paris" },
    source: "geo.api.gouv.fr" as const,
  };
  const facts = deriveActionFormalitiesFacts({ departmentCode: "75", departmentName: "Paris", plannedObjective: "nettoyage", resolvedPoint: true, resolvedTerritory });
  return {
    ...facts,
    territory: {
      ...facts.territory,
      arrondissement: { code: arrondissementCode, label: `Paris ${arrondissementCode.slice(-2)}e` },
    },
    publicSpace: "public_domain" as const,
    manager: { kind: "paris_city" as const, label: "Ville de Paris" },
    isPublicRoadwayActivity: true,
    isCortegeOrGathering: false,
    isItinerant: true,
    isClaiming: false,
    hasInstallations: false,
    requiresPhysicalOccupation: false,
    localCustomaryUse: false,
    largeCrowdOrComplexInstallations: false,
  };
}

function renderAssistant(
  facts: ReturnType<typeof parisCleanwalk>,
  selectedArrondissements?: number[],
  supportNeeds: SupportNeed[] = ["notify"],
) {
  const qualification = qualifyActionFormalities(facts);
  const workflow = buildFormalitiesWorkflowState({ facts, qualification });
  return renderToStaticMarkup(
    React.createElement(ActionFormalitiesQualificationView, {
      qualification,
      workflow,
      facts,
      actionEmailData: {
        title: "Nettoyage test",
        organizerName: "Association Test",
        location: "Paris",
        date: "2026-12-02",
        contactAreaMode: selectedArrondissements ? "route_or_area" : "single_location",
        contactArrondissementCode: facts.territory.arrondissement?.code,
      },
      supportNeeds,
      isSaving: false,
      readOnly: true,
      onTransition: () => undefined,
    }),
  );
}

describe("Action formalities assistant", () => {
  it("summarizes the real Paris qualification and keeps detailed questions inside a disclosure", () => {
    const facts = parisCleanwalk("75107");
    const markup = renderToStaticMarkup(React.createElement(ActionFormalitiesWorkflowPanel, { draftFacts: facts }));
    expect(markup).toContain("Contact recommandé");
    expect(markup).toContain("Questions détaillées de qualification");
    expect(markup).toContain("<details");
    expect(markup).toContain("Aucune pièce particulière n&#x27;est listée pour cette démarche.");
  });

  it("shows Paris.fr, the verified 7e/8e phone and the specifically published 7e email when support is requested", () => {
    const markup = renderAssistant(parisCleanwalk("75107"), undefined, ["notify", "association"]);
    expect(markup).toContain("Ouvrir le formulaire officiel Paris.fr");
    expect(markup).toContain("01 45 61 57 00");
    expect(markup).toContain("DPE-STPP-7/8e-Exploitation7e@paris.fr");
    expect(markup).toContain("Copier le courriel");
    expect(markup).toContain("Canal recommandé : formulaire officiel pour les demandes courantes");
    expect(markup).toContain("Copier les informations");
    expect(markup).toContain("Proposer une collaboration");
    expect(markup).toContain("Adresse administrative (pas un dépôt)");
    expect(markup).toContain("Ne laissez aucun sac");
    expect(markup).toContain("Notes logistiques internes exclues.");
    expect(markup).toContain("Ouvrir la messagerie");
    expect(markup).toContain("Nettoyage participatif — Nettoyage test");
    expect(markup).toContain("Imprimer la fiche d&#x27;action");
    expect(markup).toContain("2026-12-02");
  });

  it("does not invent a direct email for the 8e or display unrelated arrondissement contacts", () => {
    const markup = renderAssistant(parisCleanwalk("75108"));
    expect(markup).toContain("01 45 61 57 00");
    expect(markup).not.toContain("DPE-STPP-7/8e-Exploitation7e@paris.fr");
    expect(markup).not.toContain("01 53 34 11 11");
    expect(markup).toContain("Pas de courriel vérifié pour 8e");
  });
});
