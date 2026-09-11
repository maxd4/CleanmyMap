import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readSource(relativePath: string): string {
  return readFileSync(path.join(sourceRoot, relativePath), "utf8");
}

describe("dropdown centering contract", () => {
  it("keeps placement, dismissal, and centering in the shared primitive", () => {
    const primitiveSource = readSource("ui/cmm-dropdown.tsx");

    expect(primitiveSource).toContain("useDropdownPlacement");
    expect(primitiveSource).toContain("left: triggerCenter");
    expect(primitiveSource).toContain("-translate-x-1/2");
    expect(primitiveSource).toContain("Escape");
    expect(primitiveSource).toContain("pointerdown");
    expect(primitiveSource).toContain("height: `${verticalGap}px`");
    expect(primitiveSource).not.toContain("top-[calc(100%+0.75rem)]");
    expect(primitiveSource).not.toContain("bottom-[calc(100%+0.75rem)]");
  });

  it("keeps the block consumer free of local alignment and backdrop shells", () => {
    const blockSource = readSource("navigation/app-navigation-block-dropdown.tsx");

    expect(blockSource).toContain("CmmDropdown");
    expect(blockSource).not.toContain("left-1/2");
    expect(blockSource).not.toContain("-translate-x-1/2");
    expect(blockSource).not.toContain("fixed inset-0");
    expect(blockSource).not.toContain("mt-2");
    expect(blockSource).not.toContain("0.75rem");
  });

  it("does not retain edge-alignment decisions in the placement hook", () => {
    const placementSource = readSource("ui/use-dropdown-placement.ts");

    expect(placementSource).not.toContain("alignRight");
    expect(placementSource).not.toContain("minPanelWidth");
  });
});
