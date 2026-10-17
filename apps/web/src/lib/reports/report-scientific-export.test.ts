import { describe, expect, it } from "vitest";
import { buildOfficialReportHtml } from "@/lib/pdf-export/official-report-html";
import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";
import {
  buildReportScientificCsv,
  buildReportScientificExport,
  buildReportScientificReference,
} from "./report-scientific-export";

function generation(overrides: Partial<ReportGenerationSnapshotRecord> = {}): ReportGenerationSnapshotRecord {
  const snapshot = {
    title: "Rapport scientifique — Échantillon",
    rubrique: "reporting" as const,
    periode: "six_months" as const,
    organizationType: "multi_action",
    snapshotSchemaVersion: 2 as const,
    snapshotMetadata: {
      snapshotSchemaVersion: 2 as const,
      templateVersion: "reports-template-v1",
      rendererVersion: "official-report-html-v1",
      generationId: "11111111-1111-4111-8111-111111111111",
      sourceGenerationId: null,
      filtersVersion: "reports-generation-filters-v1",
      advancedFiltersVersion: "reports-advanced-filters-v1",
      generatedAt: "2026-10-17T12:00:00.000Z",
      period: { id: "six_months" as const, from: "2026-04-01", to: "2026-10-17", timeZone: "UTC" as const },
      scope: { kind: "global" as const, value: "", label: "Toutes les actions" },
      detailLevel: "exhaustif" as const,
      modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: true, detailedFiles: true },
      provenance: { type: "multi_action" as const, source: "public.actions" as const, resolvedAt: "2026-10-17T12:00:00.000Z", actionCount: 2 },
      methodology: { proxyVersion: "impact-proxy-v1", qualityRulesVersion: "quality-v1" },
      dataAvailability: { truncated: false, availableSources: ["public.actions"], failedSources: [], communityEvents: "available" as const },
    },
    data: {
      generatedAt: "2026-10-17T12:00:00.000Z",
      columns: [
        { key: "Date", label: "Date" },
        { key: "Masse_Kg", label: "Masse (kg)" },
        { key: "CO2e_Proxy_Kg", label: "CO₂e proxy (kg)" },
        { key: "Megots", label: "Mégots" },
      ],
      rows: [{ Date: "2026-10-01", Masse_Kg: 3.5, CO2e_Proxy_Kg: 1.2, Megots: null }],
      chapters: [{ id: "methodologie-fiabilite", title: "Méthodologie & fiabilité", rows: [{ metric: "Couverture", value: "100 %" }], columns: [{ key: "metric", label: "Métrique" }, { key: "value", label: "Valeur" }] }],
    },
  };
  return { id: "11111111-1111-4111-8111-111111111111", filename: "rapport_reporting_six_months.pdf", generatedAt: "2026-10-17T12:00:00.000Z", scopeKind: "global", scopeValue: "", scopeLabel: "Toutes les actions", detailLevel: "exhaustif", snapshot, ...overrides };
}

describe("report scientific exports", () => {
  it("keeps the reference, versions, units and known data statuses tied to the snapshot", () => {
    const record = generation();
    const exported = buildReportScientificExport(record);

    expect(exported.schemaVersion).toBe("reports-scientific-export-v1");
    expect(exported.snapshot).toBe(record.snapshot);
    expect(exported.reference.citationText).toContain("Rapport scientifique — Échantillon");
    expect(exported.reference.citationText).toContain(record.id);
    expect(exported.reference.citationText).toContain("templateVersion=reports-template-v1");
    expect(exported.reference.period).toEqual({ id: "six_months", from: "2026-04-01", to: "2026-10-17", timeZone: "UTC" });
    expect(exported.reference.scope.label).toBe("Toutes les actions");
    expect(exported.reference.versions.proxyVersion).toBe("impact-proxy-v1");
    expect(exported.tables[0]?.columns.find((column) => column.id === "Masse_Kg")?.unit).toBe("kg");
    expect(exported.tables[0]?.rows[0]?.values.Masse_Kg.status).toBe("DECLARED");
    expect(exported.tables[0]?.rows[0]?.values.CO2e_Proxy_Kg.status).toBe("PROXY");
    expect(exported.tables[0]?.rows[0]?.values.Megots).toEqual({ value: null, status: "NA" });
    expect(exported.tables[1]?.rows[0]?.values.metric.value).toBe("Couverture");
    expect(exported.limitations.some((limitation) => limitation.includes("OBSERVED"))).toBe(true);
  });

  it("exports the same visible table values as the official HTML without converting missing values to zero", () => {
    const record = generation();
    const html = buildOfficialReportHtml(record.snapshot, { theme: "scientific" });
    const csv = buildReportScientificCsv(record);

    expect(html).toContain("Rapport scientifique — Échantillon");
    expect(html).toContain("Masse (kg)");
    expect(html).toContain("3.5");
    expect(html).toContain("CO₂e proxy (kg)");
    expect(csv).toContain("Masse (kg)");
    expect(csv).toContain("3.5");
    expect(csv).toContain("PROXY");
    expect(csv).toContain("NA");
    expect(csv).not.toContain(",0,NA");
    expect(csv).toContain("Méthodologie & fiabilité");
  });

  it("keeps legacy snapshots readable and marks unavailable version metadata explicitly", () => {
    const legacy = generation({
      snapshot: {
        ...generation().snapshot,
        snapshotSchemaVersion: undefined,
        snapshotMetadata: undefined,
      },
    });
    const reference = buildReportScientificReference(legacy);
    const exported = buildReportScientificExport(legacy);

    expect(reference.versions).toEqual({
      snapshotSchemaVersion: null,
      templateVersion: null,
      rendererVersion: null,
      filtersVersion: null,
      advancedFiltersVersion: null,
      proxyVersion: null,
      qualityRulesVersion: null,
    });
    expect(reference.lineageAvailability).toBe("unavailable");
    expect(exported.limitations[0]).toContain("métadonnées structurées");
    expect(exported.snapshot.data.rows?.[0]?.Megots).toBeNull();
  });
});
