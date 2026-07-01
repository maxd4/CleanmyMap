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

    expect(html).toContain("Déclarer avant l'action");
    expect(html).toContain("Préparer un formulaire de groupe");
    expect(html).toContain("Publier le pré-formulaire");
    expect(html).toContain("Ouvrir le formulaire de groupe");
    expect(html).toContain("Objectif, consignes et contexte");
  });
});
