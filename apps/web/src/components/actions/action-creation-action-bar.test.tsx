/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionCreationActionBar, type ActionCreationActionBarConfig } from "./action-creation-action-bar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let host: HTMLDivElement;
let root: Root;

function config(overrides: Partial<ActionCreationActionBarConfig> = {}): ActionCreationActionBarConfig {
  return {
    actionId: null,
    onConfirmDiscard: vi.fn(() => true),
    onPrevious: vi.fn(),
    previousDisabled: false,
    onNext: vi.fn(),
    isFinalStep: false,
    isAuthenticated: true,
    ...overrides,
  };
}

function renderActionBar(value: ActionCreationActionBarConfig) {
  act(() => {
    root.render(<form><ActionCreationActionBar config={value} /></form>);
  });
}

function button(label: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.includes(label));
  if (!match) throw new Error(`Missing button ${label}`);
  return match;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("ActionCreationActionBar", () => {
  it("keeps one compact command row with delete on the left and navigation on the right", () => {
    renderActionBar(config());

    const bar = host.querySelector('[data-testid="action-creation-action-bar"]')!;
    expect(bar.className).toContain("flex-col");
    expect(bar.className).toContain("sm:flex-row");
    expect(bar.textContent).toContain("Supprimer le brouillon");
    expect(bar.textContent).toContain("Étape précédente");
    expect(bar.textContent).toContain("Suivant");
    expect(bar.querySelectorAll('button[type="submit"]')).toHaveLength(0);
    expect(bar.querySelectorAll("button")[0]?.textContent).toContain("Supprimer le brouillon");
  });

  it("replaces next with a single save action on the final step", () => {
    renderActionBar(config({ isFinalStep: true, onNext: undefined }));

    const bar = host.querySelector('[data-testid="action-creation-action-bar"]')!;
    expect(bar.textContent).toContain("Enregistrer la préparation");
    expect(bar.textContent).not.toContain("Suivant");
    expect(bar.querySelectorAll('button[type="submit"]')).toHaveLength(1);
  });

  it("requires confirmation, supports cancellation, and clears only after confirmation", () => {
    const onConfirmDiscard = vi.fn(() => true);
    renderActionBar(config({ onConfirmDiscard }));

    act(() => button("Supprimer le brouillon").click());
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("Aucune action ne sera créée ni publiée");
    act(() => button("Annuler").click());
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(onConfirmDiscard).not.toHaveBeenCalled();

    act(() => button("Supprimer le brouillon").click());
    const confirm = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((item) => item.textContent?.includes("Supprimer le brouillon"))!;
    act(() => confirm.click());
    expect(onConfirmDiscard).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it("blocks deletion after a storage error and preserves the server action label and identity", () => {
    const onConfirmDiscard = vi.fn(() => false);
    renderActionBar(config({ actionId: "action-42", onConfirmDiscard }));

    expect(host.textContent).toContain("Abandonner les modifications locales");
    act(() => button("Abandonner les modifications locales").click());
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("L’action enregistrée sur le serveur et son identifiant seront conservés");
    act(() => button("Abandonner mes modifications").click());

    expect(onConfirmDiscard).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Rien n’a été réinitialisé");
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
