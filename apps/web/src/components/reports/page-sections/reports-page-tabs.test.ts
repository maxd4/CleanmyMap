import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportsPageTabs } from "./reports-page-tabs";

describe("ReportsPageTabs", () => {
  it("marks the requested tab as active", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageTabs, {
        activeTab: "pilotage",
      }),
    );

    expect(markup).toContain("aria-current=\"page\"");
    expect(markup).toContain("?tab=pilotage");
    expect(markup).not.toContain("?tab=generation");
  });
});
