import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TrashBinGauge } from "./harvest-gauges";

describe("TrashBinGauge", () => {
  it("clamps the fill and keeps the comparison marker", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrashBinGauge, {
        value: 125,
        comparisonValue: 75,
      }),
    );

    expect(markup).toContain("100,0 kg");
    expect(markup).toContain("top:25%");
    expect(markup).toContain("Poubelle");
  });

  it("omits the marker when there is no comparison value", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrashBinGauge, {
        value: 12,
        comparisonValue: null,
      }),
    );

    expect(markup).toContain("12,0 kg");
    expect(markup).not.toContain("top:");
  });
});
