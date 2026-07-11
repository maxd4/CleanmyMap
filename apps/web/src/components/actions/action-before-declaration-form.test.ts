import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { ActionBeforeDeclarationForm } from "./action-before-declaration-form";

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
        isAutoApprovedSubmission: false,
        onReturnToChoice: () => undefined,
        onPassToComplete: () => undefined,
      } as ComponentProps<typeof ActionBeforeDeclarationForm>),
    );

    expect(html).toContain("Déclarer avant l&#x27;action");
    expect(html).toContain("Préparer le formulaire de groupe");
    expect(html).toContain("Publier le pré-formulaire");
    expect(html).toContain("Identité et partage");
    expect(html).toContain("Action prévue");
    expect(html).toContain("Préparation et sécurité");
    expect(html).toContain("Point de rendez-vous précis");
    expect(html).toContain("Zone cible prévue");
    expect(html).toContain("Nombre de bénévoles attendus");
    expect(html).toContain("Message pour les participants");
    expect(html).toContain("Commentaire logistique");
    expect(html).toContain("Checklist avant départ");
    expect(html).toContain("Localisation du rendez-vous");
    expect(html).toContain("Statut du formulaire");
    expect(html).toContain("Membres de l&#x27;action");
    expect(html).toContain("Publier en tant que formulaire de groupe");
    expect(html).not.toContain("Déchets collectés");
    expect(html).not.toContain("Photos de preuve");
    expect(html).not.toContain("Score d'impact");
  });
});
