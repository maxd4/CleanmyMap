import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportsPageTabs } from "./reports-page-tabs";

describe("ReportsPageTabs", () => {
  it("starts on the requested default tab", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageTabs, {
        defaultTab: "pilotage",
        generation: React.createElement("div", null, "generation-section"),
        pilotage: React.createElement("div", null, "pilotage-section"),
      }),
    );

    expect(markup).toContain("pilotage-section");
    expect(markup).not.toContain("generation-section");
  });
});
