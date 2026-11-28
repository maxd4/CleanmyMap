/** @vitest-environment jsdom */

import { act, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";
import { createInitialFormState } from "../payload";
import type { FormState } from "../model";
import { ActionParticipantSection } from "./action-step-identity.participants";

function ControlledParticipantFields({ hasAttemptedSubmit = false, initialCollectorsCount = "", initialCollectorsProvenance = null }: { hasAttemptedSubmit?: boolean; initialCollectorsCount?: string; initialCollectorsProvenance?: FormState["collectorsCountProvenance"] }) {
  const [form, setForm] = useState(() => ({
    ...createInitialFormState("Alice", "action"),
    collectorsCount: initialCollectorsCount,
    collectorsCountProvenance: initialCollectorsProvenance,
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

function setControlValue(element: HTMLInputElement, value: string): void {
  const prototype = Object.getPrototypeOf(element) as object;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function renderParticipantFields(options: { hasAttemptedSubmit?: boolean; initialCollectorsCount?: string; initialCollectorsProvenance?: FormState["collectorsCountProvenance"] } = {}): { container: HTMLDivElement; root: Root } {
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
    expect(container.textContent).toContain("par hypothèse");

    act(() => setControlValue(collectors, "0"));
    act(() => setControlValue(total, "4"));
    expect(collectors.value).toBe("0");

    act(() => (Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Rétablir")) as HTMLButtonElement).click());
    expect(collectors.value).toBe("4");
    expect(container.textContent).toContain("par hypothèse");

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
    expect(container.textContent).toContain("Utiliser le total comme valeur proposée");

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
