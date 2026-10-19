import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EnvironmentalImpactScopeEstimate } from "@/lib/environmental-impact-estimator/types";
import { buildCurveChartGeometry } from "./environmental-impact-curve-chart.model";
import { EnvironmentalImpactCurveChartView } from "./environmental-impact-curve-chart-view";

function makeScope(
  key: "site" | "user",
  label: string,
): EnvironmentalImpactScopeEstimate {
  const curve = [
    {
      index: 0,
      weekLabel: "Semaine 1",
      date: "2026-01-01",
      weeklyKgCo2eProxy: 1.2,
      cumulativeKgCo2eProxy: 1.2,
      lowerKgCo2eProxy: 1,
      upperKgCo2eProxy: 1.4,
      confidencePercent: 80,
      breakdown: {},
      driverBreakdown: {
        pageView: 0,
        community: 0,
        notifications: 0,
        actions: 0,
        pdf: 0,
        ia: 0,
        codex: 0,
      },
    },
    {
      index: 1,
      weekLabel: "Semaine 2",
      date: "2026-01-08",
      weeklyKgCo2eProxy: 2.4,
      cumulativeKgCo2eProxy: 3.6,
      lowerKgCo2eProxy: 3,
      upperKgCo2eProxy: 4.2,
      confidencePercent: 80,
      breakdown: {},
      driverBreakdown: {
        pageView: 0,
        community: 0,
        notifications: 0,
        actions: 0,
        pdf: 0,
        ia: 0,
        codex: 0,
      },
    },
  ];

  return {
    key,
    label,
    periodLabel: "Depuis la mise en ligne",
    accountCreatedAt: null,
    measuredAt: null,
    status: "ready",
    totalKgCo2eProxy: 3.6,
    availablePostCount: 0,
    missingPostCount: 0,
    coveragePercent: 100,
    posts: [],
    curve,
  };
}

describe("EnvironmentalImpactCurveChartView accessibility", () => {
  it("keeps the SVG visual-only and exposes every point through native buttons", () => {
    const site = makeScope("site", "Site total");
    const user = makeScope("user", "Utilisateur");
    const geometry = buildCurveChartGeometry({ site, user });
    const markup = renderToStaticMarkup(
      <EnvironmentalImpactCurveChartView
        site={site}
        user={user}
        geometry={geometry}
        selectedPointIndex={1}
        selectedLinePoint={geometry.sitePoints[1] ?? null}
        onSitePointClick={vi.fn()}
        onUserPointClick={vi.fn()}
      />,
    );

    const svgMarkup = markup.slice(markup.indexOf("<svg"), markup.indexOf("</svg>") + 6);
    const controlsMarkup = markup.slice(markup.indexOf("</svg>") + 6);

    expect(svgMarkup).toContain('role="img"');
    expect(svgMarkup.match(/<circle\b/g)).toHaveLength(4);
    expect(svgMarkup).not.toContain('role="button"');
    expect(svgMarkup).not.toContain('tabindex="0"');
    expect(svgMarkup).toContain('aria-hidden="true"');

    expect(controlsMarkup.match(/<button\b/g)).toHaveLength(4);
    expect(controlsMarkup.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(controlsMarkup).toContain("Sélectionner le site: Semaine 1");
    expect(controlsMarkup).toContain("Sélectionner l&#x27;utilisateur: Semaine 2");
    expect(controlsMarkup).toContain("focus-visible:outline-2");
  });
});
