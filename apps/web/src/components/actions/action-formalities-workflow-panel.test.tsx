import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { qualifyActionFormalities } from "@/lib/actions/formalities/qualification";
import {
  buildFormalitiesWorkflowState,
  deriveActionFormalitiesFacts,
} from "@/lib/actions/formalities/workflow";
import {
  ActionFormalitiesQualificationView,
  ActionFormalitiesWorkflowPanel,
} from "./action-formalities-workflow-panel";

const verifiedParisFacts = () => deriveActionFormalitiesFacts({
  departmentCode: "75",
  departmentName: "Paris",
  plannedObjective: "nettoyage",
  resolvedPoint: true,
  resolvedTerritory: {
    commune: { code: "75056", name: "Paris" },
    department: { code: "75", name: "Paris" },
    specialTerritory: { code: "FR-PARIS", name: "Paris" },
    source: "geo.api.gouv.fr",
  },
});

describe("ActionFormalitiesQualificationView", () => {
  it("clarifies the difference between an ordinary itinerant cleanwalk and a cortège in the preparation questions", () => {
    const facts = {
      ...verifiedParisFacts(),
      publicSpace: "public_domain" as const,
      manager: { kind: "paris_city" as const, label: "Ville de Paris" },
    };
    const markup = renderToStaticMarkup(
      React.createElement(ActionFormalitiesWorkflowPanel, { draftFacts: facts }),
    );

    expect(markup).toContain("Activité sur la voie publique");
    expect(markup).toContain("Cortège, défilé ou rassemblement organisé");
    expect(markup).toContain("Une cleanwalk en déplacement ne devient pas un cortège pour ce seul motif");
    expect(markup).toContain("Les gants et sacs de collecte ne sont pas une installation événementielle");
    expect(markup).toContain("pas une formalité administrative obligatoire");
  });

  it("renders the qualification facts, explanation, authority, deadline and official link", () => {
    const facts = {
      ...verifiedParisFacts(),
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
    expect(markup).toContain("Délai minimum");
    expect(markup).toContain("2 mois");
    expect(markup).toContain("Pièces listées pour la démarche requise");
    expect(markup).toContain("https://www.paris.fr/pages/evenements-dans-l-espace-public-33659");
  });

  it("keeps obligations visible while optional contacts appear only for selected needs", () => {
    const facts = {
      ...verifiedParisFacts(),
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
    const base = React.createElement(ActionFormalitiesQualificationView, {
      qualification, workflow, facts, isSaving: false, onTransition: () => undefined,
    });
    const withoutNeeds = renderToStaticMarkup(base);
    expect(withoutNeeds).toContain("Obligations et démarches requises");
    expect(withoutNeeds).toContain("2 mois");
    expect(withoutNeeds).not.toContain("Ouvrir le formulaire officiel Paris.fr");

    const withNeeds = renderToStaticMarkup(React.cloneElement(base, { supportNeeds: ["equipment"] }));
    expect(withNeeds).toContain("Obligations et démarches requises");
    expect(withNeeds).toContain("Ouvrir le formulaire officiel Paris.fr");
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

    expect(markup).toContain("Formalités et accompagnement");
    expect(markup).toContain("Cadre national disponible");
    expect(markup).toContain("règle locale suffisamment vérifiée");
    expect(markup).toContain("https://www.service-public.gouv.fr/particuliers/vosdroits/F21899");
    expect(markup).toContain("À confirmer");
  });

  it("keeps optional details and persisted workflow statuses visible for each requirement kind", () => {
    const facts = {
      ...verifiedParisFacts(),
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
    const baseQualification = qualifyActionFormalities(facts);
    const baseFormality = baseQualification.formalities[0];
    const formality = (
      overrides: Partial<typeof baseFormality>,
    ): typeof baseFormality => ({ ...baseFormality, ...overrides });
    const qualification = {
      ...baseQualification,
      formalities: [
        formality({
          id: "required-with-details",
          requirementStatus: "required",
          procedureKind: "city_aot",
          recipient: "Ville de Paris",
          officialChannel: {
            kind: "official_email",
            label: "Canal officiel",
            url: null,
          },
          requestedInformation: ["date et horaires"],
          requestedDocuments: ["plan du site"],
        }),
        formality({
          id: "recommended-manager",
          requirementStatus: "recommended",
          procedureKind: "other_manager",
          competentAuthority: {
            kind: "other_manager",
            label: "Gestionnaire du lieu",
          },
          recipient: null,
          officialChannel: {
            kind: "manager_to_confirm",
            label: "Canal à confirmer",
            url: null,
          },
          source: null,
          deadline: null,
          requestedInformation: [],
          requestedDocuments: [],
        }),
        formality({
          id: "not-required",
          requirementStatus: "not_required",
          procedureKind: "none",
          competentAuthority: { kind: "unknown", label: "Aucune formalité" },
          recipient: null,
          source: null,
          officialChannel: null,
          deadline: null,
          requestedInformation: [],
          requestedDocuments: [],
        }),
        formality({
          id: "unknown-scope",
          requirementStatus: "unknown",
          procedureKind: "unknown",
          competentAuthority: { kind: "unknown", label: "À confirmer" },
          recipient: null,
          source: null,
          officialChannel: null,
          deadline: null,
          requestedInformation: [],
          requestedDocuments: [],
        }),
      ],
    };
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });
    workflow.progress = qualification.formalities.map((item, index) => ({
      ...workflow.progress[0],
      formalityId: item.id,
      userStatus: index === 0 ? "prepared" : index === 1 ? "sent" : "not_started",
      validForQualification: index !== 1,
    }));

    const markup = renderToStaticMarkup(
      React.createElement(ActionFormalitiesQualificationView, {
        qualification,
        workflow,
        isSaving: false,
        onTransition: () => undefined,
      }),
    );

    expect(markup).toContain("Obligatoire selon la règle");
    expect(markup).toContain("Recommandé");
    expect(markup).toContain("Non requis dans ce cas");
    expect(markup).toContain("À confirmer");
    expect(markup).toContain("Informations demandées");
    expect(markup).toContain("Pièces listées pour la démarche requise");
    expect(markup).toContain("Canal officiel");
    expect(markup).toContain("Canal à confirmer");
    expect(markup).toContain("Déclarer l’envoi");
    expect(markup).toContain("Requalifier cette démarche");
    expect(markup).toContain("Les faits ont changé : cette démarche doit être revue.");
  });
});
