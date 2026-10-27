import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HarvestBenchmarkSummary } from "./harvest-benchmark-summary";

describe("HarvestBenchmarkSummary", () => {
  it.each([
    ["higher", 12, "text-orange-500", "lucide-trending-up"],
    ["lower", -8, "text-emerald-600", "lucide-trending-down"],
    ["stable", 0, "text-slate-400", "lucide-minus"],
  ])("keeps the benchmark contract for the %s trend", (_label, deltaPercent, trendColor, expectedIcon) => {
    const markup = renderToStaticMarkup(
      <HarvestBenchmarkSummary
        currentPerVolunteer={1.25}
        benchmarkPerVolunteer={1}
        deltaPercent={deltaPercent}
        trendColor={trendColor}
        sourceLabel="Mesure directe"
        confidenceLabel="élevée"
      />,
    );

    expect(markup).toContain("Par bénévole");
    expect(markup).toContain("1,3 kg");
    expect(markup).toContain("vs 1,0 kg moyen");
    expect(markup).toContain("Mesure directe · élevée");
    expect(markup).toContain(expectedIcon);
    expect(markup).toContain(trendColor);
  });
});
