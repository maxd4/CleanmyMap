import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ActionDeclarationEntryFlow } from "./action-declaration-entry-flow";

const source = readFileSync(
  new URL("./action-declaration-entry-flow.tsx", import.meta.url),
  "utf8",
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

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
    expect(html).toContain("Saisir les résultats terrain");
  });

  it("affiche directement le parcours choisi et réserve le chargement au handoff réel", () => {
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("220");
    expect(source).not.toContain("loadingMode");
    expect(source).toContain('setScreen("success");');
    expect(source).toContain(
      'await updateAction(actionId, { actionPhase: "post_action_draft" });',
    );
    expect(source).toContain(
      "router.replace(`/actions/new?actionId=${encodeURIComponent(actionId)}`);",
    );
    expect(source).not.toContain("formulaire actuel");
    expect(source).not.toContain("ouvrira ensuite");
    expect(source).not.toContain("Le bloc Agir reste prioritaire");
    expect(source).toContain("Choisir un parcours ne crée encore aucune action.");
  });
});
