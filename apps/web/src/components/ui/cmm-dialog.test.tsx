import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmDialog } from "./cmm-dialog";

const source = readFileSync(new URL("./cmm-dialog.tsx", import.meta.url), "utf8");
const overlaysCss = readFileSync(
  new URL("../../styles/overlays.css", import.meta.url),
  "utf8",
);

describe("CmmDialog", () => {
  it("renders nothing when closed", () => {
    expect(renderToStaticMarkup(<CmmDialog open={false} ariaLabel="Fermé">Contenu</CmmDialog>)).toBe("");
  });

  it("renders dialog semantics and accessible naming", () => {
    const markup = renderToStaticMarkup(
      <CmmDialog
        open
        ariaLabelledBy="dialog-title"
        ariaDescribedBy="dialog-description"
      >
        <h2 id="dialog-title">Titre</h2>
        <p id="dialog-description">Description</p>
      </CmmDialog>,
    );

    expect(markup).toContain('class="cmm-backdrop cmm-dialog-backdrop"');
    expect(markup).toContain('class="cmm-modal-panel cmm-modal-scroll cmm-dialog-panel"');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="dialog-title"');
    expect(markup).toContain('aria-describedby="dialog-description"');
    expect(markup).toContain('tabindex="-1"');
  });

  it("supports an aria-label and every canonical size", () => {
    for (const size of ["sm", "md", "lg", "xl"] as const) {
      const markup = renderToStaticMarkup(
        <CmmDialog open ariaLabel="Boîte de dialogue" size={size}>
          Contenu
        </CmmDialog>,
      );

      expect(markup).toContain('aria-label="Boîte de dialogue"');
      expect(markup).toContain(`data-dialog-size="${size}"`);
    }
  });

  it("rejects an open dialog without an accessible name at runtime", () => {
    expect(() =>
      renderToStaticMarkup(
        React.createElement(CmmDialog, { open: true, children: "Contenu" } as never),
      ),
    ).toThrow("CmmDialog requires ariaLabel or ariaLabelledBy");
  });

  it("keeps the dialog behavior and visual surface in the canonical contracts", () => {
    for (const marker of [
      "document.body.style.overflow",
      "previousOverflow",
      "document.addEventListener(\"keydown\"",
      "event.key === \"Escape\"",
      "dismissibleRef.current && closeOnEscapeRef.current",
      "event.key !== \"Tab\"",
      "event.shiftKey",
      "previousFocusRef.current",
      "event.target === event.currentTarget",
      "event.stopPropagation()",
      "focusWithoutScroll(initialFocusElement ?? firstFocusableElement ?? panel)",
    ]) {
      expect(source).toContain(marker);
    }

    expect(source).toContain("ariaLabel: string");
    expect(source).toContain("ariaLabelledBy: string");
    expect(source).toContain("initialFocusRef?: RefObject<HTMLElement | null>");
    expect(source).toContain("const initialFocusElement = initialFocusRef?.current");
    expect(source).not.toMatch(/(?:bg-|border-|shadow-|rounded-|p-|px-|py-|transition)/);
  });

  it("provides canonical overlay size and motion contracts", () => {
    for (const marker of [
      ".cmm-backdrop",
      ".cmm-modal-panel",
      ".cmm-modal-scroll",
      ".cmm-modal-header-sticky",
      ".cmm-modal-footer-sticky",
      ".cmm-dialog-backdrop",
      ".cmm-dialog-panel",
      'data-dialog-size="sm"',
      'data-dialog-size="md"',
      'data-dialog-size="lg"',
      'data-dialog-size="xl"',
      '[data-display-mode="minimaliste"]',
      '[data-display-mode="sobre"]',
      "prefers-reduced-motion: reduce",
    ]) {
      expect(overlaysCss).toContain(marker);
    }

    expect(overlaysCss).toContain("backdrop-filter: none");
    expect(overlaysCss).toContain("background-image: none");
  });
});
