import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmPopover } from "./cmm-popover";

const popoverSource = readFileSync(new URL("./cmm-popover.tsx", import.meta.url), "utf8");
const dropdownSource = readFileSync(new URL("./cmm-dropdown.tsx", import.meta.url), "utf8");

function renderOpenPopover() {
  return renderToStaticMarkup(
    <CmmPopover
      id="test-popover"
      ariaLabel="Actions contextuelles"
      defaultOpen
      renderTrigger={(triggerProps) => <button {...triggerProps}>Ouvrir</button>}
    >
      <button type="button">Action</button>
    </CmmPopover>,
  );
}

describe("CmmPopover", () => {
  it("exposes a named non-modal dialog with dialog trigger semantics", () => {
    const markup = renderOpenPopover();

    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls="test-popover"');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-label="Actions contextuelles"');
    expect(markup).not.toContain("aria-modal");
  });

  it("delegates placement, dismissal and focus restoration to CmmDropdown", () => {
    expect(popoverSource).toContain("<CmmDropdown");
    expect(popoverSource).toContain("openOnHover={false}");
    expect(dropdownSource).toContain("useDropdownPlacement");
    expect(dropdownSource).toContain("onClick");
    expect(dropdownSource).toContain('event.key === "Enter"');
    expect(dropdownSource).toContain('event.key === " "');
    expect(dropdownSource).toContain('event.key === "Escape"');
    expect(dropdownSource).toContain('document.addEventListener("pointerdown"');
    expect(dropdownSource).toContain('document.addEventListener("keydown"');
    expect(dropdownSource).toContain("triggerRef.current?.focus()");
  });

  it("does not open from hover", () => {
    expect(popoverSource).toContain("openOnHover={false}");
    expect(dropdownSource).toContain("openOnHover = true");
    expect(dropdownSource).toContain("openOnHover && canHover");
  });
});
