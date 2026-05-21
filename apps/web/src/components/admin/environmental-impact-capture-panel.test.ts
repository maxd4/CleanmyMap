import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnvironmentalImpactCapturePanel } from "./environmental-impact-capture-panel";

describe("EnvironmentalImpactCapturePanel", () => {
  it("renders the manual capture controls", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EnvironmentalImpactCapturePanel),
    );

    expect(markup).toContain("Capture d&#x27;impact environnemental");
    expect(markup).toContain("Capturer maintenant");
    expect(markup).toContain("Déclenche une capture manuelle");
    expect(markup).toContain("Historique");
    expect(markup).toContain("Aucune capture manuelle");
  });
});
