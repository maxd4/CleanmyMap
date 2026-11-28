/** @vitest-environment jsdom */

import { act, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";
import { createInitialFormState } from "../payload";
import type { FormState } from "../model";

type ParticipantPickerTestProps = {
  title?: string;
  onChange: (next: string[]) => void;
  onRoleSelectionsChange?: (next: Record<string, string[]>) => void;
  readOnly?: boolean;
};

vi.mock("../../action-participant-picker", () => ({
  ActionParticipantPicker: (props: ParticipantPickerTestProps) => {
    const picker = props.title === "Comptes coorganisateurs" ? "organizer" : "participant";
    return (
      <section data-testid={`${picker}-picker`} data-read-only={String(props.readOnly ?? false)}>
        <button type="button" data-testid={`${picker}-select`} onClick={() => props.onChange(["member-2"])}>Sélectionner</button>
        {props.onRoleSelectionsChange ? (
          <button type="button" data-testid="role-change" onClick={() => props.onRoleSelectionsChange?.({ "member-2": ["group_lead", "group_lead"] })}>Attribuer un rôle</button>
        ) : null}
      </section>
    );
  },
}));

import { ActionParticipantSection } from "./action-step-identity.participants";

function ControlledParticipantFields({ hasAttemptedSubmit = false, initialCollectorsCount = "", initialCollectorsProvenance = null, initialVolunteersCount = "" }: { hasAttemptedSubmit?: boolean; initialCollectorsCount?: string; initialCollectorsProvenance?: FormState["collectorsCountProvenance"]; initialVolunteersCount?: string }) {
  const [form, setForm] = useState(() => ({
    ...createInitialFormState("Alice", "action"),
    collectorsCount: initialCollectorsCount,
    collectorsCountProvenance: initialCollectorsProvenance,
    volunteersCount: initialVolunteersCount,
  }));
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  return (
    <ActionParticipantSection
      form={form}
      updateField={updateField}
      userId="user-1"
      variant="counts"
      isActionMode
      hasAttemptedSubmit={hasAttemptedSubmit}
    />
  );
}

function ParticipantLifecycleHarness() {
  const [form, setForm] = useState(() => createInitialFormState("Alice", "action"));
  const [formIdentityKey, setFormIdentityKey] = useState(0);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const resetForm = () => {
    setForm(createInitialFormState("Alice", "action"));
    setFormIdentityKey((current) => current + 1);
    setHasAttemptedSubmit(false);
  };
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  return (
    <>
      <button type="button" data-testid="new-declaration" onClick={resetForm}>Nouvelle déclaration</button>
      <button type="button" data-testid="ignore-draft" onClick={resetForm}>Ignorer le brouillon</button>
      <button type="button" data-testid="submit" onClick={() => setHasAttemptedSubmit(true)}>Envoyer</button>
      <ActionParticipantSection
        form={form}
        updateField={updateField}
        userId="user-1"
        variant="counts"
        isActionMode
        hasAttemptedSubmit={hasAttemptedSubmit}
        formIdentityKey={formIdentityKey}
      />
    </>
  );
}

function PreparationParticipantHarness() {
  const [form, setForm] = useState(() => createInitialFormState("Alice", "action"));
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };
  return (
    <>
      <output data-testid="action-context-value">{form.actionContext}</output>
      <ActionParticipantSection form={form} updateField={updateField} userId="user-1" variant="compact" isActionMode />
    </>
  );
}

function SupportingParticipantHarness({ participantReadOnly = false, isActionMode = true }: { participantReadOnly?: boolean; isActionMode?: boolean }) {
  const [form, setForm] = useState(() => createInitialFormState("Alice", "action"));
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };
  return (
    <>
      <output data-testid="organizer-accounts">{form.organizerAccounts}</output>
      <output data-testid="participant-accounts">{form.participantAccounts.join(",")}</output>
      <output data-testid="field-role-selections">{JSON.stringify(form.fieldRoleSelections)}</output>
      <ActionParticipantSection
        form={form}
        updateField={updateField}
        userId="user-1"
        variant="supporting"
        isActionMode={isActionMode}
        supportingFull
        participantReadOnly={participantReadOnly}
        participantTitle="Collaborateurs"
      />
    </>
  );
}

function setControlValue(element: HTMLInputElement, value: string): void {
  const prototype = Object.getPrototypeOf(element) as object;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function renderParticipantFields(options: { hasAttemptedSubmit?: boolean; initialCollectorsCount?: string; initialCollectorsProvenance?: FormState["collectorsCountProvenance"]; initialVolunteersCount?: string } = {}): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(<ControlledParticipantFields {...options} />);
  });
  return { container, root };
}

describe("final participant composition fields", () => {
  it("renders the total first and keeps the category details optional", () => {
    const form = createInitialFormState("Alice", "action");
    form.volunteersCount = "3";
    form.retiredCount = "0";
    form.childrenCount = "1";

    const markup = renderToStaticMarkup(
      <ActionParticipantSection
        form={form}
        updateField={() => undefined}
        userId="user-1"
        variant="counts"
        isActionMode
      />,
    );

    expect(markup).toContain('id="action-volunteers-count"');
    expect(markup).not.toContain('id="action-adult-count"');
    expect(markup).toContain('id="action-retired-count"');
    expect(markup).toContain('placeholder="Retraités"');
    expect(markup).toContain('id="action-children-count"');
    expect(markup).toContain('placeholder="Enfants"');
    expect(markup).toContain("Les catégories sont facultatives");
  });

  it("keeps preparation composition behavior unchanged", () => {
    const form = createInitialFormState("Alice", "action");
    form.volunteersCount = "15";
    form.childrenCount = "1";
    form.retiredCount = "1";
    const markup = renderToStaticMarkup(
      <ActionParticipantSection
        form={form}
        updateField={() => undefined}
        userId="user-1"
        variant="compact"
        isActionMode
      />,
    );
    expect(markup).toContain("13 adulte");
    expect(markup).toContain("13 adultes calculés automatiquement");
  });

  it("does not show the composition error before interaction or submit", () => {
    const { container, root } = renderParticipantFields();

    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("#action-volunteers-count")?.getAttribute("aria-invalid")).toBe("false");

    root.unmount();
  });

  it("prefills collectors from the total, preserves manual zero, and restores the assumption explicitly", () => {
    const { container, root } = renderParticipantFields();
    const total = container.querySelector("#action-volunteers-count") as HTMLInputElement;
    const collectors = container.querySelector("#action-collectors-count") as HTMLInputElement;

    act(() => setControlValue(total, "3"));
    expect(collectors.value).toBe("3");
    expect(container.textContent).toContain("Proposition à vérifier");

    act(() => setControlValue(total, "4"));
    expect(collectors.value).toBe("4");
    act(() => setControlValue(collectors, "0"));
    expect(container.textContent).toContain("Valeur confirmée");
    act(() => setControlValue(total, "5"));
    expect(collectors.value).toBe("0");

    act(() => (Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Rétablir")) as HTMLButtonElement).click());
    expect(collectors.value).toBe("5");
    expect(container.textContent).toContain("Proposition à vérifier");

    root.unmount();
  });

  it("prefills an already entered total on entering the final composition step", () => {
    const { container, root } = renderParticipantFields({ initialVolunteersCount: "15" });
    expect((container.querySelector("#action-collectors-count") as HTMLInputElement).value).toBe("15");
    expect(container.textContent).toContain("Proposition à vérifier");
    root.unmount();
  });

  it("keeps a cleared collector count unknown instead of refilling it or turning it into zero", () => {
    const { container, root } = renderParticipantFields();
    const total = container.querySelector("#action-volunteers-count") as HTMLInputElement;
    const collectors = container.querySelector("#action-collectors-count") as HTMLInputElement;
    act(() => setControlValue(total, "15"));
    act(() => setControlValue(collectors, ""));
    expect(collectors.value).toBe("");
    act(() => setControlValue(total, "16"));
    expect(collectors.value).toBe("");
    root.unmount();
  });

  it("requires explicit acceptance before applying the historical total default", () => {
    const { container, root } = renderParticipantFields({ initialVolunteersCount: "15", initialCollectorsProvenance: "historical_unknown" });
    const collectors = container.querySelector("#action-collectors-count") as HTMLInputElement;
    expect(collectors.value).toBe("");
    act(() => (Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Utiliser le total")) as HTMLButtonElement).click());
    expect(collectors.value).toBe("15");
    expect(container.textContent).toContain("Total historique accepté");
    root.unmount();
  });

  it("does not replace a historical collector count when the total is edited", () => {
    const { container, root } = renderParticipantFields({
      initialCollectorsCount: "2",
      initialCollectorsProvenance: "historical_unknown",
    });
    const total = container.querySelector("#action-volunteers-count") as HTMLInputElement;
    const collectors = container.querySelector("#action-collectors-count") as HTMLInputElement;

    act(() => setControlValue(total, "5"));
    expect(collectors.value).toBe("2");
    expect(container.textContent).toContain("Utiliser le total présent");

    root.unmount();
  });

  it("accepts an unknown composition and rejects categories exceeding the total", () => {
    const { container, root } = renderParticipantFields();
    const total = container.querySelector("#action-volunteers-count") as HTMLInputElement;
    const retired = container.querySelector("#action-retired-count") as HTMLInputElement;
    const children = container.querySelector("#action-children-count") as HTMLInputElement;

    act(() => setControlValue(total, "3"));
    expect(container.querySelector('[role="alert"]')).toBeNull();

    act(() => {
      setControlValue(retired, "1");
      setControlValue(children, "3");
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("ne peut pas dépasser");
    expect(total.getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Adultes : non calculés");

    root.unmount();
  });

  it("shows the same error after a submit attempt without interaction", () => {
    const { container, root } = renderParticipantFields({ hasAttemptedSubmit: true });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("nombre total");
    expect(container.querySelector("#action-volunteers-count")?.getAttribute("aria-invalid")).toBe("true");

    root.unmount();
  });

  it("resets validation when a new declaration replaces the form on the same mount", () => {
    const { container, root } = renderParticipantLifecycleFields();
    const total = container.querySelector("#action-volunteers-count") as HTMLInputElement;

    act(() => {
      setControlValue(total, "2");
      setControlValue(container.querySelector("#action-children-count") as HTMLInputElement, "3");
    });
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    act(() => (container.querySelector('[data-testid="new-declaration"]') as HTMLButtonElement).click());
    expect(total.value).toBe("");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("#action-volunteers-count")?.getAttribute("aria-invalid")).toBe("false");

    act(() => setControlValue(container.querySelector("#action-volunteers-count") as HTMLInputElement, "2"));
    expect(container.querySelector('[role="alert"]')).toBeNull();

    root.unmount();
  });

  it("resets validation when a draft is ignored and allows a later submit error", () => {
    const { container, root } = renderParticipantLifecycleFields();
    const total = container.querySelector("#action-volunteers-count") as HTMLInputElement;

    act(() => {
      setControlValue(total, "2");
      setControlValue(container.querySelector("#action-children-count") as HTMLInputElement, "3");
    });
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    act(() => (container.querySelector('[data-testid="ignore-draft"]') as HTMLButtonElement).click());
    expect((container.querySelector("#action-volunteers-count") as HTMLInputElement).value).toBe("");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("#action-volunteers-count")?.getAttribute("aria-invalid")).toBe("false");

    act(() => (container.querySelector('[data-testid="submit"]') as HTMLButtonElement).click());
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector("#action-volunteers-count")?.getAttribute("aria-invalid")).toBe("true");

    root.unmount();
  });

  it("does not carry a proposed collector default into a different action", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<ParticipantLifecycleHarness />));
    const total = container.querySelector("#action-volunteers-count") as HTMLInputElement;
    const collectors = container.querySelector("#action-collectors-count") as HTMLInputElement;
    act(() => setControlValue(total, "15"));
    expect(collectors.value).toBe("15");
    act(() => (container.querySelector('[data-testid="new-declaration"]') as HTMLButtonElement).click());
    expect((container.querySelector("#action-volunteers-count") as HTMLInputElement).value).toBe("");
    expect((container.querySelector("#action-collectors-count") as HTMLInputElement).value).toBe("");
    root.unmount();
  });
});

describe("preparation and supporting participant sections", () => {
  it("updates preparation totals, categories and the school context", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<PreparationParticipantHarness />));

    act(() => setControlValue(container.querySelector("#action-volunteers-count") as HTMLInputElement, "15"));
    act(() => setControlValue(container.querySelector("#action-children-count") as HTMLInputElement, "1"));
    act(() => setControlValue(container.querySelector("#action-retired-count") as HTMLInputElement, "1"));
    expect(container.textContent).toContain("13 adultes calculés automatiquement");

    const context = container.querySelector("#action-context") as HTMLSelectElement;
    act(() => {
      context.value = "school";
      context.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="action-context-value"]')?.textContent).toBe("school");
    expect(container.textContent).toContain("Parcours école");
    root.unmount();
  });

  it("maps organizer selections and normalized field roles into their form fields", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<SupportingParticipantHarness />));

    act(() => (container.querySelector('[data-testid="organizer-select"]') as HTMLButtonElement).click());
    act(() => (container.querySelector('[data-testid="role-change"]') as HTMLButtonElement).click());
    act(() => (container.querySelector('[data-testid="participant-select"]') as HTMLButtonElement).click());

    expect(container.querySelector('[data-testid="organizer-accounts"]')?.textContent).toBe("member-2");
    expect(container.querySelector('[data-testid="participant-accounts"]')?.textContent).toBe("member-2");
    expect(container.querySelector('[data-testid="field-role-selections"]')?.textContent).toBe('{"member-2":["group_lead"]}');
    root.unmount();
  });

  it("keeps read-only participant accounts unchanged and hides supporting accounts outside action mode", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<SupportingParticipantHarness participantReadOnly />));
    expect(container.querySelector('[data-testid="participant-picker"]')?.getAttribute("data-read-only")).toBe("true");
    act(() => (container.querySelector('[data-testid="participant-select"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="participant-accounts"]')?.textContent).toBe("");
    root.unmount();

    const hidden = renderToStaticMarkup(<ActionParticipantSection
      form={createInitialFormState("Alice", "action")}
      updateField={() => undefined}
      userId="user-1"
      variant="supporting"
      isActionMode={false}
    />);
    expect(hidden).toBe("");
  });
});

function renderParticipantLifecycleFields(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(<ParticipantLifecycleHarness />);
  });
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});
