import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodexUsagePanel } from "./codex-usage-panel";

describe("CodexUsagePanel", () => {
  it("renders the weekly Codex journal controls", () => {
    const markup = renderToStaticMarkup(React.createElement(CodexUsagePanel));

    expect(markup).toContain("Journal Codex hebdomadaire");
    expect(markup).toContain("Enregistrer la semaine");
    expect(markup).toContain("Sessions");
    expect(markup).toContain("Historique");
    expect(markup).toContain("Aucun journal Codex");
  });
});
