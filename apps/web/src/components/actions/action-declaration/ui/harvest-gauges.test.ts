import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ButtsComparisonVisual, DropletGauge, TrashBinGauge, WasteComparisonVisual } from "./harvest-gauges";

describe("TrashBinGauge", () => {
  it("keeps three outlined bins visible before any declaration", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrashBinGauge, {
        value: null,
      }),
    );

    expect(markup).toContain('data-testid="waste-measurement-visual"');
    expect(markup.match(/data-testid="waste-measurement-visual-icon"/g)).toHaveLength(3);
    expect(markup.match(/data-fill-percent="0"/g)).toHaveLength(3);
    expect(markup).toContain("Repère visuel uniquement");
  });

  it("fills progressively from the declared mass and resets to empty", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrashBinGauge, {
        value: 5,
      }),
    );

    expect(markup).toContain("5,0 kg");
    expect(markup).toContain('data-fill-percent="100"');
    expect(markup).toContain('data-fill-percent="50"');
    expect(markup).toContain('data-fill-percent="0"');

    const resetMarkup = renderToStaticMarkup(React.createElement(TrashBinGauge, { value: 0 }));
    expect(resetMarkup.match(/data-fill-percent="0"/g)).toHaveLength(3);
  });
});

describe("DropletGauge", () => {
  it("uses the retained butt quantity independently of comparisons", () => {
    const markup = renderToStaticMarkup(React.createElement(DropletGauge, { value: 2_500 }));

    expect(markup).toContain('data-testid="butts-measurement-visual"');
    expect(markup.match(/data-testid="butts-measurement-visual-icon"/g)).toHaveLength(3);
    expect(markup).toContain("2 500 mégots");
    expect(markup.match(/data-fill-percent="100"/g)).toHaveLength(1);
    expect(markup).toContain('data-fill-percent="50"');
    expect(markup).toContain('data-fill-percent="0"');
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
    expect(markup).not.toContain('data-testid="waste-comparison-visual-icon"');
    expect(markup).toContain("text-rose-600");
    expect(markup).toContain("La couleur indique uniquement");
  });

  it("keeps a near-reference result neutral and shows the signed delta", () => {
    const markup = renderComparison(8.1, 8, 1.25);

    expect(markup).toContain('data-trend="neutral"');
    expect(markup).toContain("+1%");
    expect(markup).toContain("moyenne : 8,0 kg");
    expect(markup).toContain("text-slate-600");
  });

  it("shows an above-reference result and supports an explicit zero", () => {
    const aboveMarkup = renderComparison(12, 8, 50);
    const zeroMarkup = renderComparison(0, 8, -100);

    expect(aboveMarkup).toContain('data-trend="up"');
    expect(aboveMarkup).toContain("+50%");
    expect(aboveMarkup).toContain("text-emerald-600");
    expect(zeroMarkup).toContain('data-trend="down"');
    expect(zeroMarkup).toContain("0,00 kg / unité opérationnelle");
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
    expect(markup).not.toContain('data-testid="butts-comparison-visual-icon"');
    expect(markup).toContain('data-trend="down"');
    expect(markup).toContain("-25%");
    expect(markup).toContain("3 000 mégots / unité opérationnelle");
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
