import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { ActionDeclarationEntryFlow } from "./action-declaration-entry-flow";

describe("ActionDeclarationEntryFlow", () => {
  it("affiche le choix initial avec les deux parcours", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActionDeclarationEntryFlow, {
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
        isAuthenticated: false,
        isAutoApprovedSubmission: false,
      } as ComponentProps<typeof ActionDeclarationEntryFlow>),
    );

    expect(html).toContain("Choisissez votre parcours");
    expect(html).toContain("Déclarer avant");
    expect(html).toContain("Déclarer après");
    expect(html).toContain("Préparer ce parcours");
    expect(html).toContain("Ouvrir le formulaire actuel");
  });
});
