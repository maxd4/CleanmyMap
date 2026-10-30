import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "./payload";
import { ActionDeclarationFormSections, ActionDeclarationValidationSummary } from "./action-declaration-form-sections";

vi.mock("./steps/action-step-identity.collection", () => ({
  ActionCollectionSection: () => <div>environment fields</div>,
}));
vi.mock("./steps/action-step-identity.organizer", () => ({
  ActionOrganizerSection: () => <div>organizer fields</div>,
}));
vi.mock("./steps/action-step-identity.participants", () => ({
  ActionParticipantSection: () => <div>participant fields</div>,
}));
vi.mock("./steps/action-step-identity.time", () => ({
  ActionTimeSection: () => <div>time fields</div>,
}));
vi.mock("./steps/ActionStepHarvest", () => ({
  ActionStepHarvest: () => <div>harvest fields and photos</div>,
}));
vi.mock("./steps/ActionStepIdentity", () => ({
  ActionStepIdentity: () => <div>identity fields</div>,
}));
vi.mock("./steps/ActionStepLocation", () => ({
  ActionStepLocation: () => <div>location and geometry fields</div>,
}));

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
    expect(markup).toContain('href="#action-location-geometry"');
    expect(markup).toContain("Choisissez un type.");
    expect(markup).toContain("Renseignez une mesure.");
    expect(markup).toContain("Ajoutez une localisation.");
  });

  it("renders the five groups once and keeps the primary CTA unique", () => {
    const form = createInitialFormState("Alice", "action");
    const markup = renderToStaticMarkup(
      <ActionDeclarationFormSections
        form={form}
        identity={{
          form,
          updateField: vi.fn(),
          updateFields: vi.fn(),
          userMetadata: { userId: "user-1" },
          recordType: "action",
          hasAttemptedSubmit: false,
        }}
        harvest={{} as never}
        location={{} as never}
        showPreparationSummary
        hasAttemptedSubmit={false}
        validationIssues={[]}
        submissionState="idle"
        onOpenExport={() => undefined}
      />,
    );

    expect(markup.indexOf('id="action-declaration-identify"')).toBeGreaterThan(-1);
    expect(markup.indexOf('id="action-declaration-participants"')).toBeGreaterThan(markup.indexOf('id="action-declaration-identify"'));
    expect(markup.indexOf('id="action-declaration-results"')).toBeGreaterThan(markup.indexOf('id="action-declaration-participants"'));
    expect(markup.indexOf('id="action-declaration-terrain"')).toBeGreaterThan(markup.indexOf('id="action-declaration-results"'));
    expect(markup.indexOf('id="action-declaration-review"')).toBeGreaterThan(markup.indexOf('id="action-declaration-terrain"'));
    expect(markup.match(/Vérifier et envoyer/g)).toHaveLength(1);
    expect(markup).not.toContain("action-disclosure-");
    expect(markup).toContain("Exporter le récapitulatif");
  });
});
