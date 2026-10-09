import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ActionBeforeDeclarationForm } from "./form";
import { IdentityAndSharingSection } from "./identity-and-sharing-section";
import { createInitialFormState } from "../payload";

describe("ActionBeforeDeclarationForm", () => {
  it("renders the lightweight pre-action form", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActionBeforeDeclarationForm, {
        actorNameOptions: ["Aperçu local"],
        defaultActorName: "Aperçu local",
        userMetadata: {
          userId: "preview-local",
          username: "preview-local",
          displayName: "Aperçu local",
          email: undefined,
        },
        linkedEventId: undefined,
        initialRecordType: "action",
        isAuthenticated: true,
        onPassToComplete: () => undefined,
      } as ComponentProps<typeof ActionBeforeDeclarationForm>),
    );

    expect(html).toContain("Préparer une action future");
    expect(html).not.toContain('data-testid="before-action-stepper"');
    expect(html).not.toContain("Déclarer avant l&#x27;action");
    expect(html).not.toContain("Préparer le formulaire de groupe");
    expect(html).toContain("Enregistrer la préparation");
    expect(html).toContain("publication sera déclenchée explicitement");
    expect(html).toContain("Identité et organisation");
    expect(html).toContain("Type de structure");
    expect(html).toContain("Sélectionnez un type de structure");
    expect(html).toContain("Action prévue");
    expect(html).toContain("Préparation et sécurité");
    expect(html).toContain("Déchets attendus");
    expect(html).toContain("Point de rendez-vous précis");
    expect(html).toContain("Zone cible prévue");
    expect(html).toContain("Bénévoles attendus par catégorie");
    expect(html).toContain("Enfants");
    expect(html).toContain("Adultes");
    expect(html).toContain("Retraités");
    expect(html).toContain("Total attendu");
    expect(html).toContain("Message pour les participants");
    expect(html).toContain("Commentaire logistique");
    expect(html).toContain("Checklist avant départ");
    expect(html).toContain("Localisation du rendez-vous");
    expect(html).not.toContain("État de préparation");
    expect(html).toContain("Sélectionnez un type d&#x27;action");
    expect(html).toContain("Sélectionnez un type de zone");
    expect(html).toContain("Sélectionnez un niveau");
    expect(html).toContain("Date et horaires");
    expect(html).toContain("Début du créneau global");
    expect(html).toContain("Fin du créneau global");
    expect(html).toContain("Inscriptions des bénévoles");
    expect(html).toContain("Membres préinscrits");
    expect(html).toContain("Coordonnées avancées");
    expect(html).toContain('class="cmm-disclosure"');
    expect(html).toContain("Obligatoire");
    expect(html).toContain('id="before-action-title"');
    expect(html).toContain('id="before-action-date"');
    expect(html).toContain('id="before-departure-location"');
    expect(html).toContain("Autoriser les demandes d&#x27;inscription");
    expect(html).not.toContain("Déchets collectés");
    expect(html).not.toContain("Photos de preuve");
    expect(html).not.toContain("Score d'impact");
    expect(html).not.toContain("Confirmer et publier");
  });

  it("keeps the authenticated creator read-only and separates co-organizers from participants", () => {
    const form = createInitialFormState("legacy-alias", "action");
    form.organizerType = "association";
    form.organizerAccounts = "user-organizer, user-organizer";
    form.participantAccounts = ["user-participant", "user-participant"];

    const html = renderToStaticMarkup(
      React.createElement(IdentityAndSharingSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        userMetadata: {
          userId: "user-creator",
          displayName: "Maxence",
          handle: "maxence_deroome",
        },
        showGroupJoinHelp: false,
        onToggleGroupJoinHelp: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      } as ComponentProps<typeof IdentityAndSharingSection>),
    );

    expect(html).toContain('data-clerk-user-id="user-creator"');
    expect(html).toContain('value="Maxence"');
    expect(html).toContain("@maxence_deroome");
    expect(html).toContain("Organisateurs associés");
    expect(html).toContain("Inscriptions des bénévoles");
    expect(html).toContain("Membres préinscrits");
    expect(html).toContain("Autoriser les demandes d&#x27;inscription");
    expect(html).toContain("Les membres ajoutés sont préinscrits à l&#x27;action.");
    expect(html).toContain("Rechercher");
    expect(html).toContain('type="search"');
    expect(html).not.toContain('value="legacy-alias"');
    expect(html).not.toContain("actorNameOptions");
  });

  it.each([
    [false, [], "Facultatif"],
    [false, ["user-one"], "1 membre"],
    [true, [], "Facultatif"],
    [true, ["user-one", "user-two"], "2 membres"],
  ] as const)("keeps public requests and pre-registered members independent (%s / %s)", (groupJoinEnabled, participantAccounts, countLabel) => {
    const form = createInitialFormState("legacy-alias", "action");
    form.groupJoinEnabled = groupJoinEnabled;
    form.participantAccounts = [...participantAccounts];

    const html = renderToStaticMarkup(
      React.createElement(IdentityAndSharingSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        userMetadata: { userId: "user-creator", displayName: "Maxence" },
        showGroupJoinHelp: false,
        onToggleGroupJoinHelp: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      } as ComponentProps<typeof IdentityAndSharingSection>),
    );

    expect(html).toContain('id="before-group-join-enabled"');
    expect(html).toContain('for="before-group-join-enabled"');
    expect(html).toContain(countLabel);
    expect(html).toContain("Les demandes ne deviennent possibles qu&#x27;après sa publication.");
    expect(html).toContain("Les membres ajoutés sont préinscrits à l&#x27;action.");
  });
});
