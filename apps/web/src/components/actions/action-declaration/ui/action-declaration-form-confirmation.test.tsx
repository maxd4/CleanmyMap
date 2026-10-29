import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CreateActionPayload } from "@/lib/actions/types";
import { createInitialFormState } from "../payload";
import { ActionDeclarationFormConfirmation } from "./action-declaration-form-confirmation";

function makePayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actionDate: "2026-08-27",
    locationLabel: "Quai de Loire",
    wasteKg: 12,
    cigaretteButts: 10,
    cigaretteButtsCount: 10,
    cigaretteButtsKg: 0.2,
    volunteersCount: 4,
    durationMinutes: 60,
    recordType: "action",
    ...overrides,
  };
}

function renderConfirmation(payload: CreateActionPayload): string {
  return renderToStaticMarkup(
    React.createElement(ActionDeclarationFormConfirmation, {
      form: createInitialFormState("Alice"),
      payload,
      userMetadata: { userId: "user-1", displayName: "Alice" },
      onModify: () => undefined,
      onConfirm: () => undefined,
      isSubmitting: false,
    }),
  );
}

describe("ActionDeclarationFormConfirmation", () => {
  it("keeps raw waste and butt measurements separate and removes impact proxies from confirmation", () => {
    const payload = makePayload({ wasteBreakdown: { plastiqueKg: 2.4 } });
    const markup = renderConfirmation(payload);

    expect(markup).toContain("Mesure déclarée — déchets collectés");
    expect(markup).toContain("Nombre de mégots : 10");
    expect(markup).toContain("Masse de mégots : 0.2 kg");
    expect(markup).not.toContain("dont 10 mégots");
    expect(markup).not.toContain("Proxys d&#x27;impact");
    expect(markup).not.toContain("CO₂e évité");
    expect(markup).not.toContain("Eau protégée");
    expect(markup).not.toContain("compte connecté sera compté");
    expect(markup).not.toContain("compte admin par défaut");
    expect(markup).toContain("Aucun coorganisateur n’est déclaré");
    expect(markup).toContain("Le nombre de participants présents est déclaré séparément des comptes.");
  });

  it("keeps absent measurements distinct from explicit zero", () => {
    const unknownMarkup = renderConfirmation(makePayload({
      wasteKg: null,
      cigaretteButts: null,
      cigaretteButtsCount: null,
      cigaretteButtsKg: null,
    }));
    expect(unknownMarkup).toContain("Non renseigné");
    expect(unknownMarkup).toContain("Masse de mégots : Non renseignée");
    expect(unknownMarkup).not.toContain("null kg");

    const zeroMarkup = renderConfirmation(makePayload({
      wasteKg: 0,
      cigaretteButts: 0,
      cigaretteButtsCount: 0,
      cigaretteButtsKg: 0,
    }));

    expect(zeroMarkup).toContain("0 kg");
    expect(zeroMarkup).toContain("Nombre de mégots : 0");
    expect(zeroMarkup).toContain("Masse de mégots : 0 kg");
  });
});
