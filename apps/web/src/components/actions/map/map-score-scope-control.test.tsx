import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MapScoreScopeControl } from "./map-score-scope-control";

describe("MapScoreScopeControl", () => {
  it("exposes an accessible Global/Département button group", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MapScoreScopeControl, {
        value: "global",
        onChange: vi.fn(),
      }),
    );

    expect(markup).toContain("Référence du score");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("Global");
    expect(markup).toContain("Département");
    expect(markup).toContain("focus-visible:ring-2");
    expect(markup).toContain('type="button"');
  });
});
