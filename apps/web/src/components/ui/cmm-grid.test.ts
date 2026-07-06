import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmGrid, CmmGridItem, createGridSpan } from "./cmm-grid";

describe("CmmGrid", () => {
  it("renders the canonical grid shell and responsive span helpers", () => {
    const html = renderToStaticMarkup(
      createElement(
        CmmGrid,
        { overlay: true },
        createElement(
          CmmGridItem,
          { span: { mobile: 4, tablet: 3, desktop: 8 } },
          createElement("span", null, "Bloc principal"),
        ),
        createElement(
          CmmGridItem,
          { span: { mobile: 4, tablet: 3, desktop: 4 } },
          createElement("span", null, "Bloc secondaire"),
        ),
      ),
    );

    expect(html).toContain("cmm-grid-shell");
    expect(html).toContain("cmm-grid-layout");
    expect(html).toContain("cmm-grid-span");
    expect(html).toContain("cmm-grid-overlay");
    expect(html).toContain("--cmm-grid-span-mobile:4");
    expect(html).toContain("--cmm-grid-span-tablet:3");
    expect(html).toContain("--cmm-grid-span-desktop:8");
  });

  it("clamps invalid span values to the documented bounds", () => {
    expect(createGridSpan({ mobile: 0, tablet: 12, desktop: 99 })).toMatchObject({
      "--cmm-grid-span-mobile": 1,
      "--cmm-grid-span-tablet": 6,
      "--cmm-grid-span-desktop": 12,
    });
  });
});
