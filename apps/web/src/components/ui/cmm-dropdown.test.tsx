import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CmmDropdown } from "./cmm-dropdown";

const source = readFileSync(new URL("./cmm-dropdown.tsx", import.meta.url), "utf8");

describe("CmmDropdown", () => {
  it("renders one centered non-modal panel and arrow contract", () => {
    const markup = renderToStaticMarkup(
      <CmmDropdown
        id="test-dropdown-panel"
        ariaLabel="Menu de test"
        open
        panelRole="region"
        panelClassName="w-64 bg-slate-950"
        renderTrigger={(triggerProps) => (
          <button {...triggerProps} aria-label="Ouvrir le menu">
            Déclencheur
          </button>
        )}
      >
        <span>Contenu</span>
      </CmmDropdown>,
    );

    expect(markup).toContain('id="test-dropdown-panel"');
    expect(markup).toContain('role="region"');
    expect(markup).toContain('class="fixed z-[70]');
    expect(markup).toContain("left:50%");
    expect(markup).toContain("-translate-x-1/2");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('aria-modal="true"');
    expect(markup).toContain("Contenu");
  });

  it("shares the ribbon interaction contract for dismissal and focus", () => {
    expect(source).toContain('document.addEventListener("pointerdown"');
    expect(source).toContain("closeAndRestoreFocus();");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("window.setTimeout(() => triggerRef.current?.focus(), 0)");
  });
});
