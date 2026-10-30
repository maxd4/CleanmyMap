// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HarvestWasteSection } from "./harvest-waste-section";
import { createInitialFormState, buildCreateActionPayload } from "../payload";
import type { FormState, ValidationIssue } from "../model";
import { getActionDeclarationSubmissionIssues } from "../utils/action-declaration-submission.model";
import { useActionDeclarationFormPresentation } from "../hooks/use-action-declaration-form-presentation";
import { ActionDeclarationValidationSummary } from "../action-declaration-form-sections";

function renderWasteSection(overrides: Partial<React.ComponentProps<typeof HarvestWasteSection>> = {}) {
  return renderToStaticMarkup(
    React.createElement(HarvestWasteSection, {
      wasteKg: "8",
      onWasteKgChange: () => undefined,
      wasteMeasurementMethod: "",
      wasteRecyclablesKg: "",
      wasteGlassKg: "",
      wasteHouseholdKg: "",
      wasteOtherKg: "",
      wasteUnusualObjects: "",
      wasteSpecialHandlingWaste: "",
      onMeasurementMethodChange: () => undefined,
      notes: "",
      wasteCategories: [],
      onTriChange: () => undefined,
      validationIssues: [],
      wasteCurrentPerVolunteer: 8,
      wasteBenchmarkPerVolunteer: 8,
      wasteBenchmarkSourceCount: 12,
      wasteDeltaPercent: 0,
      comparisonTone: "slate",
      ...overrides,
    }),
  );
}

function InteractiveWasteSection({
  onTriChange,
}: {
  onTriChange: (field: string, value: unknown) => void;
}) {
  const [breakdown, setBreakdown] = React.useState({
    wasteRecyclablesKg: "",
    wasteGlassKg: "",
    wasteHouseholdKg: "",
    wasteOtherKg: "",
  });

  return React.createElement(HarvestWasteSection, {
    wasteKg: "8",
    onWasteKgChange: () => undefined,
    wasteMeasurementMethod: "",
    ...breakdown,
    wasteUnusualObjects: "",
    wasteSpecialHandlingWaste: "",
    onMeasurementMethodChange: () => undefined,
    notes: "",
    wasteCategories: [],
    onTriChange: (field, value) => {
      if (field in breakdown) {
        setBreakdown((current) => ({ ...current, [field]: value as string }));
      }
      onTriChange(field, value);
    },
    wasteCurrentPerVolunteer: 8,
    wasteBenchmarkPerVolunteer: 8,
    wasteBenchmarkSourceCount: 12,
    wasteDeltaPercent: 0,
    comparisonTone: "slate",
    validationIssues: [],
  });
}

function buildValidationForm(participantOnly = false): FormState {
  const form: FormState = {
    ...createInitialFormState("Alex", "action"),
    organizerType: "association",
    associationName: "Association locale",
    actionDate: "2026-10-09",
    locationLabel: "Quai nord",
    departureLocationLabel: "Quai nord",
    volunteersCount: "1",
    childrenCount: "0",
    retiredCount: "0",
    durationMinutes: "60",
    wasteKg: "8",
    wasteRecyclablesKg: "-1",
    wasteGlassKg: "100001",
    wasteHouseholdKg: "100001",
    wasteOtherKg: "100001",
  };
  if (participantOnly) {
    form.volunteersCount = "0";
    form.wasteRecyclablesKg = "";
    form.wasteGlassKg = "";
    form.wasteHouseholdKg = "";
    form.wasteOtherKg = "";
  }
  return form;
}

function HarvestValidationHarness({ participantOnly = false }: { participantOnly?: boolean }) {
  const [form, setForm] = React.useState(() => buildValidationForm(participantOnly));
  const [validationIssues, setValidationIssues] = React.useState<ValidationIssue[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
  const presentation = useActionDeclarationFormPresentation({
    validationIssues,
    hasAttemptedSubmit,
    initialActionId: null,
    loadedActionPhase: null,
  });

  function validate() {
    const issues = getActionDeclarationSubmissionIssues({
      form,
      payload: buildCreateActionPayload({
        form,
        declarationMode: "complete",
        effectiveManualDrawingEnabled: false,
        drawingIsValid: false,
        manualDrawing: null,
        isEntrepriseMode: false,
        linkedEventId: undefined,
      }),
      isAuthenticated: true,
      declarationMode: "complete",
      hasValidDrawing: true,
      hasServerRouteInput: false,
      isCleanPlaceMode: false,
      manualDrawingSource: null,
    });
    setHasAttemptedSubmit(true);
    setValidationIssues(issues);
  }

  function updateTriField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <>
      <button type="button" onClick={validate}>Vérifier</button>
      {hasAttemptedSubmit && validationIssues.length > 0 ? (
        <ActionDeclarationValidationSummary validationIssues={validationIssues} />
      ) : null}
      <HarvestWasteSection
        wasteKg={form.wasteKg}
        onWasteKgChange={(value) => updateTriField("wasteKg", value)}
        wasteMeasurementMethod={form.wasteMeasurementMethod}
        wasteRecyclablesKg={form.wasteRecyclablesKg}
        wasteGlassKg={form.wasteGlassKg}
        wasteHouseholdKg={form.wasteHouseholdKg}
        wasteOtherKg={form.wasteOtherKg}
        wasteUnusualObjects={form.wasteUnusualObjects}
        wasteSpecialHandlingWaste={form.wasteSpecialHandlingWaste}
        onMeasurementMethodChange={(value) => updateTriField("wasteMeasurementMethod", value)}
        notes={form.notes}
        wasteCategories={form.wasteCategories ?? []}
        onTriChange={(field, value) => updateTriField(field, String(value))}
        wasteCurrentPerVolunteer={8}
        wasteBenchmarkPerVolunteer={8}
        wasteBenchmarkSourceCount={12}
        wasteDeltaPercent={0}
        comparisonTone="slate"
        validationIssues={validationIssues}
      />
      <output data-testid="confirmation-state">
        {hasAttemptedSubmit && validationIssues.length === 0 ? "open" : "closed"}
      </output>
      <output data-testid="preparation-state">{presentation.showPreparationSummary ? "shown" : "hidden"}</output>
    </>
  );
}

function activateDisclosureWithKeyboard(button: HTMLButtonElement, key: "Enter" | " ") {
  button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  button.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  button.click();
}

function setControlValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    "value",
  )?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("HarvestWasteSection comparison", () => {
  it("announces the optional sorting disclosure state and target", () => {
    const markup = renderWasteSection();

    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("aria-controls");
    expect(markup).not.toContain('id="harvest-waste-tri-details"');
  });

  describe("sorting disclosure interaction", () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;

    beforeEach(() => {
      (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
      container = document.createElement("div");
      document.body.appendChild(container);
    });

    afterEach(() => {
      act(() => root.unmount());
      document.body.replaceChildren();
    });

    it("keeps aria-controls synchronized while opening and closing with the keyboard", () => {
      const onTriChange = vi.fn();
      act(() => {
        root = createRoot(container);
        root.render(<InteractiveWasteSection onTriChange={onTriChange} />);
      });

      const button = () => [...container.querySelectorAll("button")]
        .find((candidate) => candidate.textContent?.includes("Détail du tri")) as HTMLButtonElement;
      expect(button().getAttribute("aria-expanded")).toBe("false");
      expect(button().hasAttribute("aria-controls")).toBe(false);
      expect(container.querySelector("#harvest-waste-tri-details")).toBeNull();

      act(() => activateDisclosureWithKeyboard(button(), "Enter"));
      expect(button().getAttribute("aria-expanded")).toBe("true");
      expect(button().getAttribute("aria-controls")).toBe("harvest-waste-tri-details");
      expect(container.querySelector("#harvest-waste-tri-details")).not.toBeNull();

      const recyclableInput = container.querySelector("#harvest-waste-recyclables-kg") as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(recyclableInput),
        "value",
      )?.set;
      act(() => {
        valueSetter?.call(recyclableInput, "4.5");
        recyclableInput.dispatchEvent(new Event("input", { bubbles: true }));
        recyclableInput.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(onTriChange).toHaveBeenCalledWith("wasteRecyclablesKg", "4.5");

      act(() => activateDisclosureWithKeyboard(button(), " "));
      expect(button().getAttribute("aria-expanded")).toBe("false");
      expect(button().hasAttribute("aria-controls")).toBe(false);
      expect(container.querySelector("#harvest-waste-tri-details")).toBeNull();
    });
  });

  describe("validation accessibility", () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;
    let originalRequestAnimationFrame: typeof window.requestAnimationFrame;

    beforeEach(() => {
      (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
      container = document.createElement("div");
      document.body.appendChild(container);
      originalRequestAnimationFrame = window.requestAnimationFrame;
      window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }) as typeof window.requestAnimationFrame;
    });

    afterEach(() => {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      act(() => root.unmount());
      document.body.replaceChildren();
    });

    it("opens the real disclosure and exposes every invalid breakdown field", async () => {
      act(() => {
        root = createRoot(container);
        root.render(<HarvestValidationHarness />);
      });

      const disclosure = () => [...container.querySelectorAll("button")]
        .find((candidate) => candidate.textContent?.includes("Détail du tri")) as HTMLButtonElement;
      expect(disclosure().getAttribute("aria-expanded")).toBe("false");
      expect(container.querySelector("#harvest-waste-tri-details")).toBeNull();

      await act(async () => {
        (container.querySelector("button") as HTMLButtonElement).click();
        await Promise.resolve();
      });

      expect(disclosure().getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelector("#harvest-waste-tri-details")).not.toBeNull();
      for (const id of [
        "harvest-waste-recyclables-kg",
        "harvest-waste-glass-kg",
        "harvest-waste-household-kg",
        "harvest-waste-other-kg",
      ]) {
        const control = container.querySelector(`#${id}`) as HTMLInputElement;
        expect(control).not.toBeNull();
        expect(control.getAttribute("aria-invalid")).toBe("true");
        const describedBy = control.getAttribute("aria-describedby");
        expect(describedBy).toBeTruthy();
        expect(container.querySelector(`#${describedBy}`)).not.toBeNull();
      }
      expect(document.activeElement?.id).toBe("harvest-waste-recyclables-kg");
      const firstError = container.querySelector("#action-validation-error-wasteRecyclablesKg a") as HTMLAnchorElement;
      expect(firstError.getAttribute("href")).toBe("#harvest-waste-recyclables-kg");
      expect(container.querySelector(firstError.getAttribute("href") ?? "")).not.toBeNull();

      for (const id of [
        "harvest-waste-recyclables-kg",
        "harvest-waste-glass-kg",
        "harvest-waste-household-kg",
        "harvest-waste-other-kg",
      ]) {
        act(() => { setControlValue(container.querySelector(`#${id}`) as HTMLInputElement, "1"); });
      }
      act(() => { (container.querySelector("button") as HTMLButtonElement).click(); });
      expect(container.querySelector('[data-testid="confirmation-state"]')?.textContent).toBe("open");
      expect(container.querySelector("#action-declaration-validation-summary")).toBeNull();
    });

    it("does not open the disclosure for an unrelated participant error", () => {
      act(() => {
        root = createRoot(container);
        root.render(<HarvestValidationHarness participantOnly />);
      });
      const disclosure = [...container.querySelectorAll("button")]
        .find((candidate) => candidate.textContent?.includes("Détail du tri")) as HTMLButtonElement;
      act(() => { (container.querySelector("button") as HTMLButtonElement).click(); });
      expect(disclosure.getAttribute("aria-expanded")).toBe("false");
      expect(container.querySelector("#harvest-waste-tri-details")).toBeNull();
    });
  });

  it("keeps the waste input and renders the compact visual comparison", () => {
    const markup = renderWasteSection();

    expect(markup).toContain('id="harvest-waste-kg"');
    expect(markup).toContain('data-testid="waste-comparison-visual"');
    expect(markup).toContain("Comparaison visuelle");
    expect(markup.match(/data-testid="waste-comparison-visual-icon"/g)).toHaveLength(3);
  });

  it("hides the comparison without a valid benchmark while preserving the input", () => {
    const markup = renderWasteSection({
      wasteBenchmarkPerVolunteer: null,
      wasteDeltaPercent: null,
    });

    expect(markup).toContain('id="harvest-waste-kg"');
    expect(markup).not.toContain('data-testid="waste-comparison-visual"');
  });

  it("keeps an explicit zero visible and does not manufacture a value when absent", () => {
    const zeroMarkup = renderWasteSection({
      wasteKg: "0",
      wasteCurrentPerVolunteer: 0,
      wasteBenchmarkPerVolunteer: 8,
      wasteDeltaPercent: -100,
    });
    const absentMarkup = renderWasteSection({
      wasteKg: "",
      wasteCurrentPerVolunteer: null,
      wasteBenchmarkPerVolunteer: 8,
      wasteDeltaPercent: null,
    });

    expect(zeroMarkup).toContain('value="0"');
    expect(zeroMarkup).toContain('data-testid="waste-comparison-visual"');
    expect(absentMarkup).toContain('value=""');
    expect(absentMarkup).not.toContain('data-testid="waste-comparison-visual"');
  });

  it("does not reapply the former 100 kg UI ceiling to a valid declared mass", () => {
    const markup = renderWasteSection({
      wasteKg: "150",
      wasteCurrentPerVolunteer: 150,
      wasteBenchmarkPerVolunteer: 100,
      wasteDeltaPercent: 50,
    });

    expect(markup).toContain('value="150"');
    expect(markup).toContain('max="100000"');
    expect(markup).toContain('data-testid="waste-comparison-visual"');
  });
});
