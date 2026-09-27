import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { qualifyActionFormalities } from "@/lib/actions/formalities-qualification";
import {
  buildFormalitiesWorkflowState,
  deriveActionFormalitiesFacts,
} from "@/lib/actions/formalities-workflow";
import { ActionFormalitiesQualificationView } from "./action-formalities-workflow-panel";

describe("ActionFormalitiesQualificationView", () => {
  it("renders the qualification facts, explanation, authority, deadline and official link", () => {
    const facts = {
      ...deriveActionFormalitiesFacts({
        departmentCode: "75",
        departmentName: "Paris",
        plannedObjective: "nettoyage",
      }),
      publicSpace: "public_domain" as const,
      manager: { kind: "paris_city" as const, label: "Ville de Paris" },
      hasInstallations: true,
      requiresPhysicalOccupation: true,
      isPublicRoadwayActivity: false,
      isItinerant: false,
      isClaiming: false,
      localCustomaryUse: false,
      largeCrowdOrComplexInstallations: false,
    };
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });
    const markup = renderToStaticMarkup(
      React.createElement(ActionFormalitiesQualificationView, {
        qualification,
        workflow,
        isSaving: false,
        onTransition: () => undefined,
      }),
    );

    expect(markup).toContain('data-testid="action-formalities-qualification"');
    expect(markup).toContain("Obligatoire selon la règle");
    expect(markup).toContain("Ville de Paris — domaine public municipal");
    expect(markup).toContain("La Ville de Paris décrit une AOT préalable");
    expect(markup).toContain("Délai indicatif");
    expect(markup).toContain("2 mois");
    expect(markup).toContain("Message préparé");
    expect(markup).toContain("https://www.paris.fr/pages/evenements-dans-l-espace-public-33659");
  });

  it("presents an unknown national fallback without suggesting a local obligation", () => {
    const facts = {
      ...deriveActionFormalitiesFacts({ departmentCode: "69", departmentName: "Rhône" }),
      publicSpace: "public_domain" as const,
    };
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });
    const markup = renderToStaticMarkup(
      React.createElement(ActionFormalitiesQualificationView, {
        qualification,
        workflow,
        isSaving: false,
        onTransition: () => undefined,
      }),
    );

    expect(markup).toContain("Formalités locales");
    expect(markup).toContain("Cadre national disponible");
    expect(markup).toContain("règle locale suffisamment vérifiée");
    expect(markup).toContain("https://www.service-public.gouv.fr/particuliers/vosdroits/F21899");
    expect(markup).toContain("À confirmer");
  });
});
