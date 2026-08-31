import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionDeclarationVisionFields } from "./action-declaration-form.vision-fields";
import { initialState } from "./model";

describe("ActionDeclarationVisionFields", () => {
  it("keeps the IA fields inside the canonical emerald disclosure", () => {
    const markup = renderToStaticMarkup(
      <ActionDeclarationVisionFields
        form={initialState}
        onVisionBagsCountChange={vi.fn()}
        onVisionFillLevelChange={vi.fn()}
        onVisionDensityChange={vi.fn()}
      />,
    );

    expect(markup).toContain("<details");
    expect(markup).toContain('data-disclosure-tone="emerald"');
    expect(markup).toContain("Précisions IA (optionnel)");
    expect(markup).toContain("Nombre de sacs");
    expect(markup).toContain("Taux de remplissage (%)");
    expect(markup).toContain("Densité (kg/L)");
  });
});
