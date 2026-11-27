// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { normalizeActionOrganizationalRelations } from "@/lib/actions/preparation-contract";
import { createInitialFormState, type FormState } from "../model";
import { ActionOrganizationalRelationsSection } from "./action-organizational-relations-section";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function RelationsHarness() {
  const [form, setForm] = useState(() => createInitialFormState("Test", "action"));
  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  return <ActionOrganizationalRelationsSection form={form} updateField={updateField} />;
}

function setTextValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("ActionOrganizationalRelationsSection typing behavior", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    document.body.replaceChildren();
  });

  function mount() {
    container = document.createElement("div");
    document.body.appendChild(container);
    const nextRoot = createRoot(container);
    root = nextRoot;
    act(() => nextRoot.render(<RelationsHarness />));
  }

  it("keeps partner focus and caret stable while typing names with spaces", () => {
    mount();
    act(() => (container.querySelector("button") as HTMLButtonElement).click());
    let typed = "";

    for (const character of "Équipe locale") {
      const input = container.querySelector("#org-partner-name-0") as HTMLInputElement;
      input.focus();
      typed += character;
      act(() => {
        setTextValue(input, typed);
        input.setSelectionRange(typed.length, typed.length);
      });
      expect(container.querySelector("#org-partner-name-0")).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(typed.length);
    }
    expect((container.querySelector("#org-partner-name-0") as HTMLInputElement).value).toBe("Équipe locale");
  });

  it("preserves spaces and blank lines while editing origins, then normalizes for persistence", () => {
    mount();
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const intermediate = "Membres associatifs  \n\nSalariés et élèves\n";
    let typed = "";

    for (const character of intermediate) {
      typed += character;
      act(() => setTextValue(textarea, typed));
      expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toBe(typed);
    }

    expect(normalizeActionOrganizationalRelations({ participantOrigins: intermediate.split(/\r?\n/).map((category) => ({ category })) })).toEqual({
      participantOrigins: [{ category: "Membres associatifs" }, { category: "Salariés et élèves" }],
    });
  });

  it("keeps partner order and row identity through removal and addition", () => {
    mount();
    const add = () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Ajouter un partenaire")) as HTMLButtonElement;
    act(() => add().click());
    act(() => add().click());
    const first = container.querySelector("#org-partner-name-0") as HTMLInputElement;
    const second = container.querySelector("#org-partner-name-1") as HTMLInputElement;
    act(() => setTextValue(first, "Association A"));
    act(() => setTextValue(second, "Collectif B"));
    const secondBeforeRemoval = container.querySelector("#org-partner-name-1");
    act(() => (container.querySelectorAll("button")[0] as HTMLButtonElement).click());

    const remaining = container.querySelector("#org-partner-name-0") as HTMLInputElement;
    expect(remaining).toBe(secondBeforeRemoval);
    expect(remaining.value).toBe("Collectif B");
    act(() => add().click());
    expect(container.querySelectorAll("#org-partner-name-0, #org-partner-name-1")).toHaveLength(2);
    expect((container.querySelector("#org-partner-name-0") as HTMLInputElement).value).toBe("Collectif B");
  });
});
