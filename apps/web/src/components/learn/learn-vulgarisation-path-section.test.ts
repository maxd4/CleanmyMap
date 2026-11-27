import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LearnVulgarisationPathSection } from "./learn-vulgarisation-path-section";

describe("LearnVulgarisationPathSection", () => {
  it("preserves the four useful destinations without fabricated progress", () => {
    const markup = renderToStaticMarkup(React.createElement(LearnVulgarisationPathSection, { locale: "fr" }));
    for (const href of ["/methodologie", "/reports", "/actions/new", "/actions/map"]) expect(markup).toContain(`href="${href}"`);
    expect(markup).not.toContain("Progression de lecture");
    expect(markup).not.toContain("width:25%");
  });
});
