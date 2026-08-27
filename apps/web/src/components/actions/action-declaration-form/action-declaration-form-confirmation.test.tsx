import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";
import type { CreateActionPayload } from "@/lib/actions/types";
import { formatKg } from "../action-declaration/utils/harvest-utils";
import { createInitialFormState } from "../action-declaration/payload";
import { ActionDeclarationFormConfirmation } from "./action-declaration-form-confirmation";

function makePayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actionDate: "2026-08-27",
    locationLabel: "Quai de Loire",
    wasteKg: 12,
    cigaretteButts: 10,
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
  it("uses canonical impact proxies and keeps them separate from declared measures", () => {
    const payload = makePayload({ wasteBreakdown: { plastiqueKg: 2.4 } });
    const impact = computeActionImpactKpis({ metadata: payload });
    const markup = renderConfirmation(payload);

    expect(markup).toContain("Mesure déclarée — déchets collectés");
    expect(markup).toContain("Proxys d&#x27;impact");
    expect(markup).toContain("CO₂e évité (proxy)");
    expect(markup).toContain(`~${formatKg(impact.co2AvoidedKg)} kg`);
    expect(markup).toContain("Eau protégée (proxy)");
    expect(markup).toContain(impact.waterSavedLiters.toLocaleString("fr-FR"));
    expect(markup).toContain("Ces valeurs sont des estimations");
    expect(markup).not.toContain("Plastique");
    expect(markup).not.toContain("~6,0 kg");
  });

  it("does not show a water proxy without dedicated cigarette-butt data", () => {
    const markup = renderConfirmation(makePayload({ cigaretteButts: 0 }));

    expect(markup).toContain("CO₂e évité (proxy)");
    expect(markup).not.toContain("Eau protégée (proxy)");
  });
});
