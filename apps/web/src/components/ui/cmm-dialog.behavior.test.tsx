/** @vitest-environment jsdom */

import { createRef } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CmmDialog } from "./cmm-dialog";

let host: HTMLDivElement;
let root: Root;
let trigger: HTMLButtonElement;

function renderDialog(
  open: boolean,
  onClose: () => void,
  closeRef: React.RefObject<HTMLButtonElement | null>,
  options: Partial<React.ComponentProps<typeof CmmDialog>> = {},
) {
  act(() => {
    root.render(
      <CmmDialog
        open={open}
        onClose={onClose}
        ariaLabelledBy="dialog-title"
        initialFocusRef={closeRef}
        {...options}
      >
        <h2 id="dialog-title">Détail</h2>
        <button ref={closeRef} type="button" aria-label="Fermer le détail">Fermer</button>
      </CmmDialog>,
    );
  });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  trigger = document.createElement("button");
  trigger.type = "button";
  trigger.textContent = "Ouvrir";
  document.body.append(trigger);
  trigger.focus();
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  trigger.remove();
});

describe("CmmDialog interactive accessibility", () => {
  it("moves focus into the dialog, closes on Escape and restores the opener", () => {
    const onClose = vi.fn();
    const closeRef = createRef<HTMLButtonElement>();

    renderDialog(true, onClose, closeRef);
    expect(document.activeElement).toBe(closeRef.current);

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(escape);
    expect(onClose).toHaveBeenCalledOnce();
    expect(escape.defaultPrevented).toBe(true);

    renderDialog(false, onClose, closeRef);
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps keyboard focus inside the open dialog when Tab leaves the last control", () => {
    const closeRef = createRef<HTMLButtonElement>();
    renderDialog(true, vi.fn(), closeRef);
    closeRef.current?.focus();

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(tab);

    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeRef.current);
  });

  it("honors non-dismissible mode and distinguishes backdrop clicks from panel clicks", () => {
    const onClose = vi.fn();
    const closeRef = createRef<HTMLButtonElement>();
    renderDialog(true, onClose, closeRef, { closeOnEscape: false, dismissible: false });

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(escape);
    expect(onClose).not.toHaveBeenCalled();
    expect(escape.defaultPrevented).toBe(false);

    const backdrop = host.querySelector('[role="presentation"]')!;
    const panel = host.querySelector('[role="dialog"]')!;
    panel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
    backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses the dialog panel as the focus target when no control is available", () => {
    act(() => {
      root.render(
        <CmmDialog open ariaLabel="Information">
          Texte informatif
        </CmmDialog>,
      );
    });
    const panel = host.querySelector('[role="dialog"]') as HTMLElement;
    expect(document.activeElement).toBe(panel);

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(panel);
  });
});
