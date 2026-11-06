// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { ButtsComparisonVisual, DropletGauge, HarvestComparisonTrend, TrashBinGauge, WasteComparisonVisual } from "./harvest-gauges";

let mountedRoot: ReturnType<typeof createRoot> | null = null;

afterEach(() => {
  act(() => mountedRoot?.unmount());
  mountedRoot = null;
  document.body.replaceChildren();
});

describe("TrashBinGauge", () => {
  it("keeps one outlined bin and disables comparison before any declaration", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrashBinGauge, {
        value: null,
      }),
    );

    expect(markup).toContain('data-testid="waste-measurement-visual"');
    expect(markup.match(/data-testid="waste-measurement-visual-icon"/g)).toHaveLength(1);
    expect(markup.match(/data-fill-percent="0"/g)).toHaveLength(1);
    expect(markup).toContain("Non renseigné");
    expect(markup).toContain('aria-label="Quantité de déchets hors mégots : Non renseigné.');
    expect(markup).not.toContain("0,00 kg");
    expect(markup).toContain("Jauge comparative de collecte");
  });

  it("keeps an explicit zero distinct from an absent mass", () => {
    const markup = renderToStaticMarkup(React.createElement(TrashBinGauge, { value: 0 }));

    expect(markup).toContain("0,00 kg");
    expect(markup).toContain('aria-label="Quantité de déchets hors mégots : 0,00 kg.');
    expect(markup.match(/data-fill-percent="0"/g)).toHaveLength(1);
    expect(markup).not.toContain("Non renseigné");
  });

  it("distinguishes an absent reference from missing participants", () => {
    const absentReference = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 8,
      currentPerVolunteer: 8,
      benchmarkPerVolunteer: null,
    }));
    const missingParticipants = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 8,
      currentPerVolunteer: null,
      benchmarkPerVolunteer: 8,
    }));

    expect(absentReference).toContain("Moyenne indisponible");
    expect(missingParticipants).toContain("Participants insuffisamment renseignés");
    expect(missingParticipants).not.toContain("Moyenne indisponible");
  });

  it("distinguishes loading and insufficient reference states", () => {
    const loading = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 8,
      currentPerVolunteer: null,
      benchmarkPerVolunteer: null,
      referenceStatus: "loading",
    }));
    const insufficient = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 8,
      currentPerVolunteer: null,
      benchmarkPerVolunteer: null,
      referenceStatus: "insufficient",
    }));

    expect(loading).toContain("Chargement de la moyenne");
    expect(insufficient).toContain("Référence insuffisante");
  });

  it("fills progressively from the declared mass and resets to explicit zero", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrashBinGauge, {
        value: 5,
        currentPerVolunteer: 10,
        benchmarkPerVolunteer: 5,
        benchmarkSourceCount: 2,
      }),
    );

    expect(markup).toContain("Moyenne · 5,0 kg");
    expect(markup).not.toContain("2 ×");
    expect(markup).toContain("5,0 kg");
    expect(markup).toContain('data-fill-percent="100"');
    expect(markup).not.toContain('data-fill-percent="50"');

    const resetMarkup = renderToStaticMarkup(React.createElement(TrashBinGauge, { value: 0 }));
    expect(resetMarkup.match(/data-fill-percent="0"/g)).toHaveLength(1);
    expect(resetMarkup).toContain("0,00 kg");
  });

  it("clamps the fill to two times the canonical average", () => {
    const halfMarkup = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 5,
      currentPerVolunteer: 5,
      benchmarkPerVolunteer: 5,
    }));
    const overMarkup = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 15,
      currentPerVolunteer: 15,
      benchmarkPerVolunteer: 5,
    }));

    expect(halfMarkup).toContain('data-fill-percent="50"');
    expect(overMarkup).toContain('data-fill-percent="100"');
  });

  it("keeps a valid zero reference visible without inventing a ratio", () => {
    const markup = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 0,
      currentPerVolunteer: 0,
      benchmarkPerVolunteer: 0,
      benchmarkSourceCount: 2,
    }));

    expect(markup).toContain("0,00 kg");
    expect(markup).toContain("Ratio indisponible lorsque la moyenne vaut zéro");
    expect(markup).toContain('data-testid="waste-measurement-visual-comparison-status"');
  });

  it("shows the zero-reference status even when the current measure is absent", () => {
    const markup = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: null,
      currentPerVolunteer: null,
      benchmarkPerVolunteer: 0,
      benchmarkSourceCount: 2,
    }));

    expect(markup).toContain("Ratio indisponible lorsque la moyenne vaut zéro.");
    expect(markup).not.toContain("Mesure à saisir pour comparer.");
  });

  it("shows the measure-required status while keeping the benchmark marker", () => {
    const markup = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: null,
      currentPerVolunteer: null,
      benchmarkPerVolunteer: 8,
      benchmarkSourceCount: 2,
    }));

    expect(markup).toContain("Moyenne · 8,0 kg");
    expect(markup).toContain("Mesure à saisir pour comparer.");
  });

  it("shows missing participants separately when a declared measure exists", () => {
    const markup = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 8,
      currentPerVolunteer: null,
      benchmarkPerVolunteer: 8,
      benchmarkSourceCount: 2,
    }));

    expect(markup).toContain("Participants insuffisamment renseignés.");
    expect(markup).not.toContain("Moyenne indisponible");
  });

  it.each([
    [
      { value: null, currentPerVolunteer: null, benchmarkPerVolunteer: 8 },
      "Mesure à saisir pour comparer.",
    ],
    [
      { value: 8, currentPerVolunteer: null, benchmarkPerVolunteer: 8 },
      "Participants insuffisamment renseignés.",
    ],
    [
      { value: null, currentPerVolunteer: null, benchmarkPerVolunteer: 0 },
      "Ratio indisponible lorsque la moyenne vaut zéro.",
    ],
  ] as const)("renders %s as visible content, not only as an accessible name", (props, expectedStatus) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      mountedRoot = createRoot(container);
      mountedRoot.render(React.createElement(TrashBinGauge, {
        ...props,
        benchmarkSourceCount: 2,
      }));
    });

    const status = container.querySelector<HTMLElement>('[data-testid="waste-measurement-visual-comparison-status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toBe(expectedStatus);
    expect(status?.getAttribute("aria-hidden")).toBeNull();
    expect(status?.className).not.toContain("sr-only");
  });
});

describe("DropletGauge", () => {
  it("keeps one outlined drop and labels an absent quantity as unknown", () => {
    const markup = renderToStaticMarkup(React.createElement(DropletGauge, { value: null }));

    expect(markup).toContain('data-testid="butts-measurement-visual"');
    expect(markup.match(/data-testid="butts-measurement-visual-icon"/g)).toHaveLength(1);
    expect(markup.match(/data-fill-percent="0"/g)).toHaveLength(1);
    expect(markup).toContain("Non renseigné");
    expect(markup).toContain('aria-label="Quantité de mégots retenue : Non renseigné.');
    expect(markup).not.toContain("0 mégots");
  });

  it("keeps an explicit zero distinct from an absent quantity and resets to empty", () => {
    const zeroMarkup = renderToStaticMarkup(React.createElement(DropletGauge, { value: 0 }));

    expect(zeroMarkup).toContain("0 mégots");
    expect(zeroMarkup).toContain('aria-label="Quantité de mégots retenue : 0 mégots.');
    expect(zeroMarkup.match(/data-fill-percent="0"/g)).toHaveLength(1);
    expect(zeroMarkup).not.toContain("Non renseigné");

    const positiveMarkup = renderToStaticMarkup(React.createElement(DropletGauge, { value: 2_500 }));
    expect(positiveMarkup).toContain("2 500 mégots");
    const resetMarkup = renderToStaticMarkup(React.createElement(DropletGauge, { value: 0 }));
    expect(resetMarkup.match(/data-fill-percent="0"/g)).toHaveLength(1);
    expect(resetMarkup).toContain("0 mégots");
  });

  it("uses the retained butt quantity independently of comparisons", () => {
    const markup = renderToStaticMarkup(React.createElement(DropletGauge, {
      value: 2_500,
      currentPerVolunteer: 2_500,
      benchmarkPerVolunteer: 2_500,
    }));

    expect(markup).toContain('data-testid="butts-measurement-visual"');
    expect(markup.match(/data-testid="butts-measurement-visual-icon"/g)).toHaveLength(1);
    expect(markup).toContain("2 500 mégots");
    expect(markup).toContain('data-fill-percent="50"');
    expect(markup).toContain("Moyenne · 2 500 mégots");
  });

  it("keeps the gauge focused on the quantity without lateral secondary KPIs", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DropletGauge, {
        value: 1_000,
      }),
    );

    expect(markup).toContain("1 000 mégots");
    expect(markup).not.toContain("Masse estimée");
    expect(markup).not.toContain("0,22 kg");
  });

  it("opens the benchmark explanation from an accessible button", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      mountedRoot = createRoot(container);
      mountedRoot.render(React.createElement(DropletGauge, {
        value: 2_500,
        currentPerVolunteer: 500,
        benchmarkPerVolunteer: 2_500,
        benchmarkSourceCount: 5,
        currentTotal: 2_500,
        currentUnitDenominator: 5,
        referenceUnitLabel: "unité opérationnelle",
        referenceLabel: "Moyenne contextuelle pondérée",
      }));
    });

    const button = container.querySelector<HTMLButtonElement>("button[aria-controls]");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="note"]')).toBeNull();

    act(() => button?.click());

    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[role="note"]')).not.toBeNull();
    expect(container.querySelector<HTMLAnchorElement>('a[href="/methodologie#methodologie-collecte"]')).not.toBeNull();
    expect(container.textContent).toContain("Moyenne contextuelle pondérée : 2 500 mégots / unité opérationnelle");
    expect(container.textContent).toContain("5 action(s) source");
    expect(container.textContent).toContain("Dénominateur de cette action : 5 unité opérationnelle.");
    expect(container.textContent).toContain("Calcul : 2 500 mégots / 5 = 500 mégots ; 500 mégots / (2 × 2 500 mégots) = 10 %.");
  });
});

describe("HarvestComparisonTrend", () => {
  it.each([
    [12, "up", "+12%"],
    [10.0000001, "up", "+10,000001%"],
    [10.001, "up", "+10,001%"],
    [10.01, "up", "+10,01%"],
    [10.1, "up", "+10,1%"],
    [10, "neutral", "+10%"],
    [5, "neutral", "+5%"],
    [1, "neutral", "+1%"],
    [-1, "neutral", "-1%"],
    [-10, "neutral", "-10%"],
    [-5, "neutral", "-5%"],
    [-10.001, "down", "-10,001%"],
    [-10.01, "down", "-10,01%"],
    [-10.1, "down", "-10,1%"],
    [-25, "down", "-25%"],
    [0, "neutral", "0%"],
  ] as const)("renders the signed %s trend", (delta, direction, label) => {
    const markup = renderToStaticMarkup(React.createElement(HarvestComparisonTrend, {
      currentPerVolunteer: delta === -25 ? 6 : 12,
      benchmarkPerVolunteer: 8,
      deltaPercent: delta,
      benchmarkSourceCount: 12,
      testId: "harvest-trend",
      unitLabel: "par participant",
    }));

    expect(markup).toContain('data-testid="harvest-trend"');
    expect(markup).toContain(`data-trend="${direction}"`);
    expect(markup).toContain(label);
    expect(markup).toContain("par rapport à la moyenne par participant");
    expect(markup).toContain(
      direction === "up" ? "text-emerald-700" : direction === "down" ? "text-rose-700" : "text-slate-600",
    );
    expect(markup).toContain(`aria-label="Tendance ${direction === "up" ? "montante" : direction === "down" ? "descendante" : "neutre"} : ${label} par rapport à la moyenne par participant"`);
    expect(markup).not.toContain("unité opérationnelle");
    expect(markup).not.toContain("rounded-2xl border");
  });

  it("keeps the contextual denominator in the visible and accessible label", () => {
    const markup = renderToStaticMarkup(React.createElement(HarvestComparisonTrend, {
      currentPerVolunteer: 10,
      benchmarkPerVolunteer: 8,
      deltaPercent: 25,
      benchmarkSourceCount: 2,
      testId: "harvest-trend",
      unitLabel: "par unité opérationnelle",
    }));

    expect(markup).toContain("vs moyenne");
    expect(markup).toContain("par rapport à la moyenne par unité opérationnelle");
    expect(markup).not.toContain("par participant");
  });

  it("identifies the historical participant fallback in the gauge explanation", () => {
    const markup = renderToStaticMarkup(React.createElement(TrashBinGauge, {
      value: 15,
      currentPerVolunteer: 1.5,
      benchmarkPerVolunteer: 1.5,
      benchmarkSourceCount: 2,
      currentTotal: 15,
      currentUnitDenominator: 10,
      referenceUnitLabel: "participant",
      referenceLabel: "Moyenne historique par participant",
    }));

    expect(markup).toContain("Moyenne historique par participant");
    expect(markup).toContain("aria-label=\"Expliquer Moyenne historique par participant\"");
  });

  it("does not render when the comparison is not valid", () => {
    expect(renderToStaticMarkup(React.createElement(HarvestComparisonTrend, {
      currentPerVolunteer: 8,
      benchmarkPerVolunteer: null,
      deltaPercent: null,
      benchmarkSourceCount: 0,
      testId: "harvest-trend",
      unitLabel: "par participant",
    }))).toBe("");
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
        comparisonTone: deltaPercent !== null && deltaPercent > 10
          ? "orange"
          : deltaPercent !== null && deltaPercent < -10
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
    expect(markup).toContain("Couleur : quantité relative collectée uniquement");
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
    expect(zeroMarkup).toContain("0,00 kg / participant");
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
    expect(markup).toContain("3 000 mégots / participant");
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
