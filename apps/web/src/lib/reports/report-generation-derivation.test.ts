import { describe, expect, it } from "vitest";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import {
  assertReportGenerationCanBeDerived,
  buildDerivedReportGenerationPayload,
  ReportGenerationDerivationUnavailableError,
} from "./report-generation-derivation";

const sourceGenerationId = "11111111-1111-4111-8111-111111111111";
const targetGenerationId = "22222222-2222-4222-8222-222222222222";
const generatedAt = "2026-10-17T12:00:00.000Z";

function currentPayload(overrides: Partial<PdfReportPayload> = {}): PdfReportPayload {
  return {
    title: "Rapport historique",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    snapshotSchemaVersion: 2,
    snapshotMetadata: {
      snapshotSchemaVersion: 2,
      templateVersion: "reports-template-v1",
      rendererVersion: "official-report-html-v1",
      generationId: sourceGenerationId,
      sourceGenerationId: null,
      filtersVersion: "reports-filters-v1",
      generatedAt,
      period: { id: "six_months", from: "2026-04-17", to: "2026-10-17", timeZone: "UTC" },
      scope: { kind: "global", value: "", label: "Global" },
      detailLevel: "default",
      modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
      provenance: { type: "multi_action", source: "public.actions", resolvedAt: generatedAt, actionCount: 1 },
      methodology: { proxyVersion: "impact-proxy-2026.04-v1", qualityRulesVersion: "quality-2026.04-v1" },
      dataAvailability: { truncated: false, availableSources: ["actions"], failedSources: [], communityEvents: "unavailable" },
    },
    data: {
      generatedAt,
      summary: ["Valeur connue", "Mesure inconnue : n/a"],
      stats: [{ label: "Masse", value: "n/a", detail: "kg" }],
      rows: [{ id: "action-1", value: null, unit: "kg" }],
    },
    ...overrides,
  };
}

describe("report generation derivation", () => {
  it("copies the immutable snapshot data and records the immediate lineage", () => {
    const source = currentPayload();
    const sourceBefore = JSON.parse(JSON.stringify(source));

    assertReportGenerationCanBeDerived(source);
    const derived = buildDerivedReportGenerationPayload({
      source,
      generationId: targetGenerationId,
      sourceGenerationId,
      generatedAt: "2026-10-17T12:05:00.000Z",
    });

    expect(source).toEqual(sourceBefore);
    expect(derived.snapshotMetadata).toMatchObject({
      generationId: targetGenerationId,
      sourceGenerationId,
      templateVersion: "reports-template-v1",
      rendererVersion: "official-report-html-v1",
      filtersVersion: "reports-filters-v1",
    });
    expect(derived.data.summary).toEqual(source.data.summary);
    expect(derived.data.stats).toEqual(source.data.stats);
    expect(derived.data.rows).toEqual(source.data.rows);
    expect(derived.data.generatedAt).toBe("2026-10-17T12:05:00.000Z");
  });

  it.each([
    ["legacy snapshot", { title: "Legacy", rubrique: "reporting", periode: "six_months", organizationType: "Global", data: { generatedAt } }],
    ["incompatible renderer", currentPayload({ snapshotMetadata: { ...currentPayload().snapshotMetadata!, rendererVersion: "official-report-html-v9" } })],
    ["missing filter version", currentPayload({ snapshotMetadata: { ...currentPayload().snapshotMetadata!, filtersVersion: undefined } })],
  ])("refuses derivation for %s", (_label, payload) => {
    expect(() => assertReportGenerationCanBeDerived(payload as PdfReportPayload)).toThrow(
      ReportGenerationDerivationUnavailableError,
    );
  });
});
