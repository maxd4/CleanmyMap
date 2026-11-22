/** @vitest-environment jsdom */

import { useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import { clearDraft, loadDraftSnapshot } from "../draft-storage";
import type { FormState } from "../model";
import type { BeforeValidationField } from "./form-logic";
import { useBeforeActionFieldUpdates } from "./use-before-action-workflow";
import { PreparationAccessibilityFields } from "./preparation-accessibility-fields";

vi.mock("@/lib/analytics/funnel-client", () => ({ trackFunnel: vi.fn().mockResolvedValue(undefined) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type OnFormChange = (form: FormState) => void;

function RouteUpdateHarness({
  initialForm,
  onFormChange,
}: {
  initialForm: FormState;
  onFormChange: OnFormChange;
}) {
  const [form, setForm] = useState(initialForm);
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [persistenceStatus, setPersistenceStatus] = useState<"clean" | "local" | "account" | "unsaved" | "read-error" | "error">("clean");
  const [, setErrorMessage] = useState<string | null>(null);
  const [, setValidationIssues] = useState<string[]>([]);
  const [, setValidationIssueFields] = useState<BeforeValidationField[]>([]);
  const { updateField, updateFields } = useBeforeActionFieldUpdates({
    form,
    draftActionId: null,
    creationRequestId: "creation-accessibility-test",
    submissionState,
    persistenceStatus,
    isAuthenticated: false,
    setForm,
    onFormChange,
    setPersistenceStatus,
    setSubmissionState,
    setErrorMessage,
    setValidationIssues,
    setValidationIssueFields,
  });

  return <PreparationAccessibilityFields form={form} updateField={updateField} updateFields={updateFields} />;
}

let host: HTMLDivElement;
let root: Root;

function renderHarness(initialForm: FormState, onFormChange: OnFormChange) {
  act(() => root.render(<RouteUpdateHarness initialForm={initialForm} onFormChange={onFormChange} />));
}

function getAlternativeRouteSelect(): HTMLSelectElement {
  const select = host.querySelector<HTMLSelectElement>("#before-accessibility-alternative-route");
  if (!select) throw new Error("Le sélecteur d’itinéraire alternatif n’est pas rendu.");
  return select;
}

function openAccessibilityDetails() {
  const summary = Array.from(host.querySelectorAll("summary"))
    .find((item) => item.textContent?.includes("Détails, preuves et aménagements"));
  if (!summary) throw new Error("Le résumé des détails d’accessibilité n’est pas rendu.");
  act(() => summary.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

beforeEach(() => {
  clearDraft();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  clearDraft();
  host.remove();
});

describe("PreparationAccessibilityFields behavior with the real form update manager", () => {
  it("atomically changes route and status, clears the verification date, rerenders, and resumes the draft", () => {
    const initialForm = createInitialFormState("Organisateur", "action");
    initialForm.accessibilityStatus = "conditions_reported";
    initialForm.accessibilityConditionsVerifiedAt = "2026-10-30";
    initialForm.accessibilityAlternativeRouteVersionId = "route-a";
    initialForm.accessibilityRouteVersionOptions = [
      { versionId: "route-a", label: "Parcours A" },
      { versionId: "route-b", label: "Parcours B" },
    ];
    const onFormChange = vi.fn();

    renderHarness(initialForm, onFormChange);
    openAccessibilityDetails();

    const routeSelect = getAlternativeRouteSelect();
    act(() => {
      routeSelect.value = "route-b";
      routeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onFormChange).toHaveBeenCalledTimes(1);
    expect(onFormChange).toHaveBeenCalledWith(expect.objectContaining({
      accessibilityAlternativeRouteVersionId: "route-b",
      accessibilityStatus: "to_confirm",
      accessibilityConditionsVerifiedAt: "",
    }));
    expect(getAlternativeRouteSelect().value).toBe("route-b");
    expect(host.querySelector<HTMLSelectElement>("#before-accessibility-status")?.value).toBe("to_confirm");
    expect(host.querySelector<HTMLInputElement>("#before-accessibility-condition-date")?.value).toBe("");

    const resumedDraft = loadDraftSnapshot(createInitialFormState("Organisateur", "action"), "action");
    expect(resumedDraft?.form.accessibilityAlternativeRouteVersionId).toBe("route-b");
    expect(resumedDraft?.form.accessibilityStatus).toBe("to_confirm");
    expect(resumedDraft?.form.accessibilityConditionsVerifiedAt).toBe("");
  });

  it("does not persist or change form state when the selected route is unchanged", () => {
    const initialForm = createInitialFormState("Organisateur", "action");
    initialForm.accessibilityStatus = "conditions_reported";
    initialForm.accessibilityConditionsVerifiedAt = "2026-10-30";
    initialForm.accessibilityAlternativeRouteVersionId = "route-a";
    initialForm.accessibilityRouteVersionOptions = [{ versionId: "route-a", label: "Parcours A" }];
    const onFormChange = vi.fn();

    renderHarness(initialForm, onFormChange);
    openAccessibilityDetails();
    const routeSelect = getAlternativeRouteSelect();
    act(() => routeSelect.dispatchEvent(new Event("change", { bubbles: true })));

    expect(onFormChange).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLSelectElement>("#before-accessibility-status")?.value).toBe("conditions_reported");
    expect(host.querySelector<HTMLInputElement>("#before-accessibility-condition-date")?.value).toBe("2026-10-30");
    expect(loadDraftSnapshot(createInitialFormState("Organisateur", "action"), "action")).toBeNull();
  });
});
