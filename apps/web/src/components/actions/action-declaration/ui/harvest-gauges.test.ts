import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ButtsComparisonVisual, TrashBinGauge, WasteComparisonVisual } from "./harvest-gauges";

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

describe("WasteComparisonVisual", () => {
  function renderComparison(
    currentPerVolunteer: number | null,
    benchmarkPerVolunteer: number | null,
    deltaPercent: number | null,
  ) {
    return renderToStaticMarkup(
      React.createElement(WasteComparisonVisual, {
        currentPerVolunteer,
        benchmarkPerVolunteer,
        deltaPercent,
        benchmarkSourceCount: 12,
        comparisonTone: deltaPercent !== null && deltaPercent > 5
          ? "orange"
          : deltaPercent !== null && deltaPercent < -5
            ? "emerald"
            : "slate",
      }),
    );
  }

  it("fills the three bins progressively below the observed reference", () => {
    const markup = renderComparison(4, 8, -50);

    expect(markup).toContain('data-testid="waste-comparison-visual"');
    expect(markup).toContain('data-trend="down"');
    expect(markup).toContain("-50%");
    expect(markup.match(/data-testid="waste-comparison-visual-icon"/g)).toHaveLength(3);
    expect(markup).toContain('data-fill-percent="100"');
    expect(markup).toContain('data-fill-percent="50"');
    expect(markup).toContain('data-fill-percent="0"');
  });

  it("keeps a near-reference result neutral and shows the signed delta", () => {
    const markup = renderComparison(8.1, 8, 1.25);

    expect(markup).toContain('data-trend="neutral"');
    expect(markup).toContain("+1%");
    expect(markup).toContain("moyenne : 8,0 kg");
  });

  it("shows an above-reference result and supports an explicit zero", () => {
    const aboveMarkup = renderComparison(12, 8, 50);
    const zeroMarkup = renderComparison(0, 8, -100);

    expect(aboveMarkup).toContain('data-trend="up"');
    expect(aboveMarkup).toContain("+50%");
    expect(aboveMarkup.match(/data-fill-percent="100"/g)).toHaveLength(3);
    expect(zeroMarkup).toContain('data-trend="down"');
    expect(zeroMarkup).toContain("0,00 kg / bénévole");
    expect(zeroMarkup.match(/data-fill-percent="0"/g)).toHaveLength(3);
  });

  it("does not render a comparison for missing or invalid reference data", () => {
    expect(renderComparison(8, null, null)).toBe("");
    expect(renderComparison(8, 0, Number.POSITIVE_INFINITY)).toBe("");
    expect(renderComparison(Number.NaN, 8, 0)).toBe("");
  });
});

describe("ButtsComparisonVisual", () => {
  it("uses three water drops and the butts comparison labels", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ButtsComparisonVisual, {
        currentPerVolunteer: 3000,
        benchmarkPerVolunteer: 4000,
        deltaPercent: -25,
        benchmarkSourceCount: 12,
        comparisonTone: "emerald",
      }),
    );

    expect(markup).toContain('data-testid="butts-comparison-visual"');
    expect(markup.match(/data-testid="butts-comparison-visual-icon"/g)).toHaveLength(3);
    expect(markup).toContain('data-trend="down"');
    expect(markup).toContain("-25%");
    expect(markup).toContain("3 000 mégots / bénévole");
    expect(markup).toContain("lucide-droplet");
  });

  it("does not render when the observed reference is unavailable", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ButtsComparisonVisual, {
        currentPerVolunteer: 3000,
        benchmarkPerVolunteer: null,
        deltaPercent: null,
        benchmarkSourceCount: 0,
        comparisonTone: "slate",
      }),
    );

    expect(markup).toBe("");
  });
});
