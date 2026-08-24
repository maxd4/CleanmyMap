import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportsPageTabs } from "./reports-page-tabs";

describe("ReportsPageTabs", () => {
  it("marks the requested tab as active", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageTabs, {
        activeTab: "analysis",
      }),
    );

    expect(markup).toContain("aria-current=\"page\"");
    expect(markup).toContain("?tab=analysis");
    expect(markup).toContain("?tab=generation");
  });
});
