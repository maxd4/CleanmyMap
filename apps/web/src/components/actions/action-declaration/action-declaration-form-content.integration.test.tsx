// @vitest-environment jsdom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { buildCreateActionPayload, createInitialFormState } from "./payload";
import type { FormState, ValidationIssue } from "./model";
import {
  getActionDeclarationSubmissionIssues,
} from "./utils/action-declaration-submission.model";
import {
  getActionValidationFieldErrorId,
} from "./action-declaration-form.model";
import { useActionDeclarationFormPresentation } from "./hooks/use-action-declaration-form-presentation";

vi.mock("./ui/action-declaration-form.feedback", () => ({
  ActionDeclarationFormFeedback: () => null,
}));

vi.mock("./action-declaration-form-sections", () => ({
  ActionDeclarationFormSections: ({
    form,
    identity,
    validationIssues,
    hasAttemptedSubmit,
    onSetGeometryValid,
  }: {
    form: FormState;
    identity: { updateField: (field: keyof FormState, value: string) => void };
    validationIssues: ValidationIssue[];
    hasAttemptedSubmit: boolean;
    onSetGeometryValid: () => void;
  }) => (
    <div>
      <label htmlFor="action-organizer-type">Type de structure</label>
      <select
        id="action-organizer-type"
        required
        value={form.organizerType}
        onChange={(event) => identity.updateField("organizerType", event.target.value)}
      >
        <option value="">Choisissez</option>
        <option value="association">Association</option>
      </select>

      <label htmlFor="action-volunteers-count">Participants</label>
      <input
        id="action-volunteers-count"
        type="number"
        min={1}
        max={500}
        value={form.volunteersCount}
        onChange={(event) => identity.updateField("volunteersCount", event.target.value)}
      />

      <label htmlFor="harvest-waste-kg">Déchets hors mégots</label>
      <input
        id="harvest-waste-kg"
        type="number"
        min={0}
        max={100000}
        value={form.wasteKg}
        onChange={(event) => identity.updateField("wasteKg", event.target.value)}
      />

      <div id="action-location-geometry">
        <button id="manual-drawing-control" type="button" onClick={onSetGeometryValid}>
          Ajouter un tracé manuel
        </button>
      </div>

      {hasAttemptedSubmit && validationIssues.length > 0 ? (
        <section id="action-declaration-validation-summary" role="alert">
          <h2>Corrigez les points suivants</h2>
          <ul>
            {validationIssues.map((issue) => (
              <li id={getActionValidationFieldErrorId(issue.field)} key={`${issue.field}-${issue.message}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button type="submit">Vérifier et envoyer</button>
    </div>
  ),
}));

import { ActionDeclarationFormSurface } from "./action-declaration-form-content";

function buildInvalidForm(): FormState {
  return {
    ...createInitialFormState("Alex", "action"),
    associationName: "Association locale",
    actionDate: "2026-10-09",
    locationLabel: "Quai nord",
    departureLocationLabel: "Quai nord",
    volunteersCount: "0",
    wasteKg: "",
  };
}

function buildSubmissionIssues(form: FormState, hasValidDrawing: boolean) {
  return getActionDeclarationSubmissionIssues({
    form,
    payload: buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: hasValidDrawing,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    }),
    isAuthenticated: true,
    declarationMode: "complete",
    hasValidDrawing,
    hasServerRouteInput: false,
    isCleanPlaceMode: false,
    manualDrawingSource: null,
  });
}

function FormSubmissionHarness() {
  const [form, setForm] = useState(buildInvalidForm);
  const [hasValidDrawing, setHasValidDrawing] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const presentation = useActionDeclarationFormPresentation({
    validationIssues,
    hasAttemptedSubmit,
    initialActionId: null,
    loadedActionPhase: null,
  });

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = buildSubmissionIssues(form, hasValidDrawing);
    setHasAttemptedSubmit(true);
    setValidationIssues(issues);
    setShowConfirmation(issues.length === 0);
  }

  const sections = {
    form,
    identity: { form, updateField, updateFields: vi.fn(), userMetadata: { userId: "user-1" }, recordType: "action", hasAttemptedSubmit },
    harvest: {},
    location: {},
    showPreparationSummary: presentation.showPreparationSummary,
    hasAttemptedSubmit,
    validationIssues,
    submissionState: "idle",
    onOpenExport: vi.fn(),
    onSetGeometryValid: () => setHasValidDrawing(true),
  } as never;

  return (
    <>
      <ActionDeclarationFormSurface
        actClasses={getBlockClasses("act")}
        showDraftBanner={false}
        draftStorageReadError={false}
        isCompletionBlocked={false}
        formattedPendingDraftSavedAt={null}
        onResumeDraft={vi.fn()}
        onIgnoreDraft={vi.fn()}
        onRetryDraftLoad={vi.fn()}
        onSubmit={handleSubmit}
        sections={sections}
        feedback={{} as never}
        onReset={vi.fn()}
      />
      <output id="confirmation-state">{showConfirmation ? "open" : "closed"}</output>
    </>
  );
}

function renderHarness() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<FormSubmissionHarness />));
  return { container, root };
}

function setControlValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = Object.getPrototypeOf(element) as object;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("ActionDeclarationFormSurface native submission boundary", () => {
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    document.body.replaceChildren();
  });

  it("lets the application validator aggregate native-invalid controls before confirmation", async () => {
    const { container, root } = renderHarness();
    const form = container.querySelector("form");
    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    const organizerType = container.querySelector("#action-organizer-type") as HTMLSelectElement;
    const volunteersCount = container.querySelector("#action-volunteers-count") as HTMLInputElement;

    expect(form?.noValidate).toBe(true);
    expect(form?.checkValidity()).toBe(false);

    await act(async () => {
      submit.click();
      await Promise.resolve();
    });

    expect(container.querySelector("#confirmation-state")?.textContent).toBe("closed");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Sélectionnez un type de structure");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("nombre total de participants");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("au moins une mesure de déchets");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("tracé manuel valide");
    expect(organizerType.getAttribute("aria-invalid")).toBe("true");
    expect(organizerType.getAttribute("aria-describedby")).toContain("action-validation-error-organizerType");
    expect(volunteersCount.getAttribute("aria-invalid")).toBe("true");
    expect(volunteersCount.getAttribute("aria-describedby")).toContain("action-validation-error-volunteersCount");
    expect(document.activeElement).toBe(organizerType);

    await act(async () => root.unmount());
  });

  it("opens confirmation after the same form is corrected", async () => {
    const { container, root } = renderHarness();
    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    const organizerType = container.querySelector("#action-organizer-type") as HTMLSelectElement;
    const volunteersCount = container.querySelector("#action-volunteers-count") as HTMLInputElement;
    const wasteKg = container.querySelector("#harvest-waste-kg") as HTMLInputElement;
    const geometry = container.querySelector("#manual-drawing-control") as HTMLButtonElement;

    await act(async () => {
      submit.click();
      await Promise.resolve();
    });

    await act(async () => {
      setControlValue(organizerType, "association");
      setControlValue(volunteersCount, "12");
      setControlValue(wasteKg, "2");
      geometry.click();
      await Promise.resolve();
    });

    await act(async () => {
      submit.click();
      await Promise.resolve();
    });

    expect(container.querySelector("#confirmation-state")?.textContent).toBe("open");
    expect(container.querySelector('[role="alert"]')).toBeNull();

    await act(async () => root.unmount());
  });

  it("runs application measurement validation even when the native range is invalid", async () => {
    const { container, root } = renderHarness();
    const form = container.querySelector("form") as HTMLFormElement;
    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    const organizerType = container.querySelector("#action-organizer-type") as HTMLSelectElement;
    const volunteersCount = container.querySelector("#action-volunteers-count") as HTMLInputElement;
    const wasteKg = container.querySelector("#harvest-waste-kg") as HTMLInputElement;
    const geometry = container.querySelector("#manual-drawing-control") as HTMLButtonElement;

    await act(async () => {
      setControlValue(organizerType, "association");
      setControlValue(volunteersCount, "12");
      setControlValue(wasteKg, "-1");
      geometry.click();
      await Promise.resolve();
    });

    expect(form.checkValidity()).toBe(false);

    await act(async () => {
      submit.click();
      await Promise.resolve();
    });

    expect(container.querySelector("#confirmation-state")?.textContent).toBe("closed");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("masse de déchets");
    expect(wasteKg.getAttribute("aria-invalid")).toBe("true");
    expect(wasteKg.getAttribute("aria-describedby")).toContain("action-validation-error-wasteKg");

    await act(async () => root.unmount());
  });
});
