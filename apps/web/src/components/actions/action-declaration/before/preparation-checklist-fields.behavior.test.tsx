/** @vitest-environment jsdom */

import { useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActionInterventionMode } from "@/lib/actions/intervention-mode";
import { clearDraft, loadDraftSnapshot } from "../draft-storage";
import { createInitialFormState } from "../payload";
import type { FormState } from "../model";
import type { BeforeValidationField } from "./form-logic";
import { useBeforeActionFieldUpdates } from "./use-before-action-workflow";
import { PreparationChecklistFields } from "./preparation-checklist-fields";

vi.mock("@/lib/analytics/funnel-client", () => ({ trackFunnel: vi.fn().mockResolvedValue(undefined) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function ChecklistHarness({ initialForm, onFormChange }: { initialForm: FormState; onFormChange: (form: FormState) => void }) {
  const [form, setForm] = useState(initialForm);
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [persistenceStatus, setPersistenceStatus] = useState<"clean" | "local" | "account" | "unsaved" | "read-error" | "error">("clean");
  const [, setErrorMessage] = useState<string | null>(null);
  const [, setValidationIssues] = useState<string[]>([]);
  const [, setValidationIssueFields] = useState<BeforeValidationField[]>([]);
  const { updateField } = useBeforeActionFieldUpdates({
    form,
    draftActionId: null,
    creationRequestId: "creation-checklist-test",
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
  return <PreparationChecklistFields form={form} updateField={updateField} />;
}

let host: HTMLDivElement;
let root: Root;

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

describe("PreparationChecklistFields with the real form update manager", () => {
  it("adds contextual checks unconfirmed, transitions their state, and restores the saved draft", () => {
    const initialForm = createInitialFormState("Organisateur", "action");
    initialForm.interventionMode = createActionInterventionMode("itinerary");
    initialForm.actionDate = "2026-11-23";
    initialForm.departureLocationLabel = "Place centrale";
    initialForm.meetingTime = "09:30";
    initialForm.departureTime = "10:00";
    initialForm.preparationChecklist[0]!.checked = true;
    const onFormChange = vi.fn<(form: FormState) => void>();
    act(() => root.render(<ChecklistHarness initialForm={initialForm} onFormChange={onFormChange} />));

    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
    expect(host.querySelectorAll('input[type="date"], input[type="time"]')).toHaveLength(0);
    expect(host.textContent).toContain("Confirmés : 1");
    expect(host.textContent).toContain("À confirmer : 3");
    expect(host.textContent).toContain("Horaires canoniques : rendez-vous 09:30 · départ 10:00");
    expect(host.textContent).toContain("Parcours et points de sortie reconnus");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Contrôle confirmé : Matériel vérifié"]')?.checked).toBe(true);
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Confirmer : Parcours et points de sortie reconnus"]')).toBeNull();
    const addSuggestion = Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Ajouter" && button.parentElement?.textContent?.includes("Parcours et points de sortie reconnus"));
    expect(addSuggestion).not.toBeUndefined();
    act(() => addSuggestion?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(onFormChange).toHaveBeenLastCalledWith(expect.objectContaining({
      preparationChecklist: expect.arrayContaining([
        expect.objectContaining({ key: "custom_before_1", checked: false, label: "Parcours et points de sortie reconnus" }),
      ]),
    }));
    expect(host.textContent).toContain("À confirmer : 4");

    const participantsCheckbox = host.querySelector<HTMLInputElement>('input[aria-label="Confirmer : Participants informés"]');
    expect(participantsCheckbox).not.toBeNull();
    act(() => participantsCheckbox!.click());
    expect(host.textContent).toContain("Confirmés : 2");
    expect(host.textContent).toContain("À confirmer : 3");
    act(() => participantsCheckbox!.click());
    expect(host.textContent).toContain("Confirmés : 1");
    expect(host.textContent).toContain("À confirmer : 4");

    const resumed = loadDraftSnapshot(createInitialFormState("Organisateur", "action"), "action");
    expect(resumed?.form.preparationChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "materials_checked", checked: true }),
      expect.objectContaining({ key: "custom_before_1", checked: false, label: "Parcours et points de sortie reconnus" }),
    ]));
  });

  it("keeps historical custom checks editable and removable without changing their checked state", () => {
    const initialForm = createInitialFormState("Organisateur", "action");
    initialForm.preparationChecklist.push({ key: "custom_legacy", label: "Contrôle historique", checked: true });
    const onFormChange = vi.fn<(form: FormState) => void>();
    act(() => root.render(<ChecklistHarness initialForm={initialForm} onFormChange={onFormChange} />));

    expect(host.textContent).toContain("Éléments historiques à classer");
    expect(host.querySelector<HTMLInputElement>('[aria-label="Libellé de l\'élément personnalisé 5"]')?.value).toBe("Contrôle historique");
    expect(host.textContent).toContain("Confirmés : 1");
  });
});
