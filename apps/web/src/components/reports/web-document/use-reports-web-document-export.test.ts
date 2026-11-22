import { describe, expect, it } from "vitest";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "@/lib/reports/report-advanced-filters";
import { buildGenerationRequest } from "./use-reports-web-document-export";

const baseConfig = {
  advancedFilters: REPORT_ADVANCED_FILTER_DEFAULTS,
  detailLevel: "default" as const,
  modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
  periodSelection: { id: "custom_range" as const, from: "2026-01-01", to: "2026-02-01" },
  reportTheme: "scientific" as const,
  singleAction: undefined,
  model: { scopeKind: "arrondissement" as const, scopeValue: "75011" },
};

describe("buildGenerationRequest", () => {
  it("uses the exact canonical multi-action configuration for PDF and AI export", () => {
    expect(buildGenerationRequest(baseConfig)).toEqual({
      input: {
        type: "multi_action",
        period: { id: "custom_range", from: "2026-01-01", to: "2026-02-01" },
        scope: { kind: "arrondissement", value: "75011" },
        filters: REPORT_ADVANCED_FILTER_DEFAULTS,
      },
      detailLevel: "default",
      modules: baseConfig.modules,
      theme: "scientific",
    });
  });

  it("locks single-action mode to the canonical action identifier", () => {
    expect(buildGenerationRequest({
      ...baseConfig,
      singleAction: { actionId: "00000000-0000-4000-8000-000000000001", scopeLabel: "private" },
    })).toEqual({
      input: { type: "single_action", actionId: "00000000-0000-4000-8000-000000000001" },
      detailLevel: "default",
      modules: baseConfig.modules,
      theme: "scientific",
    });
  });
});
