import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionDeclarationValidationSummary } from "./action-declaration-form-sections";

describe("ActionDeclarationValidationSummary", () => {
  it("keeps simultaneous issues inside the form and links them to their controls", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationValidationSummary, {
        validationIssues: [
          { field: "organizerType", message: "Choisissez un type." },
          { field: "wasteKg", message: "Renseignez une mesure." },
          { field: "manualDrawing", message: "Ajoutez une localisation." },
        ],
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain('href="#action-organizer-type"');
    expect(markup).toContain('href="#harvest-waste-kg"');
    expect(markup).toContain('href="#action-disclosure-route"');
    expect(markup).toContain("Choisissez un type.");
    expect(markup).toContain("Renseignez une mesure.");
    expect(markup).toContain("Ajoutez une localisation.");
  });
});
