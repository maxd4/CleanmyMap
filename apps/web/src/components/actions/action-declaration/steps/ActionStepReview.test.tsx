import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CreateActionPayload } from "@/lib/actions/types";
import { ActionStepReview } from "./ActionStepReview";

const payload = {
  recordType: "action",
  actionDate: "2026-08-27",
  locationLabel: "Quai de test",
  associationName: "Action spontanée",
  wasteKg: 100,
  volunteersCount: 1,
  durationMinutes: 60,
  placeType: "Monument",
  wasteBreakdown: { megotsKg: 0 },
} as CreateActionPayload;

describe("ActionStepReview", () => {
  it("présente les mesures brutes sans heuristique comparative", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionStepReview, {
        payload,
        dataQuality: { warnings: [] },
        isSubmitting: false,
        onSubmit: () => undefined,
      }),
    );

    expect(markup).toContain("Aide à la relecture");
    expect(markup).toContain("valeurs brutes déclarées");
    expect(markup).toContain("Masse de mégots");
    expect(markup).toContain("Nombre de mégots");
    expect(markup).toContain("Organisateur principal");
    expect(markup).toContain("Non renseigné");
    expect(markup).not.toContain("Repère indicatif");
    expect(markup).not.toContain("kg moyen");
    expect(markup).not.toContain("Compte connecté automatiquement");
    expect(markup).not.toContain("Compte admin par défaut");
    expect(markup).not.toContain("Analyse de fiabilité");
    expect(markup).not.toContain("Excellent");
    expect(markup).not.toContain("Niveau A");
    expect(markup).not.toMatch(/>\s*\d+(?:[,.]\d+)?\s*%\s*</);
  });
});
