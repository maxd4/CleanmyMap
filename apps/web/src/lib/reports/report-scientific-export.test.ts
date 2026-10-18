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

  it("exports concise indicators even when the concise snapshot has no tables", () => {
    const record = generation({
      detailLevel: "concis",
      snapshot: {
        ...generation().snapshot,
        data: {
          ...generation().snapshot.data,
          rows: undefined,
          columns: undefined,
          chapters: [{
            id: "synthese-executive",
            title: "Synthèse exécutive",
            stats: [{ label: "Actions validées", value: 2 }],
          }],
          stats: [{ label: "Couverture", value: "n/a" }],
        },
      },
    });

    const exported = buildReportScientificExport(record);
    const csv = buildReportScientificCsv(record);

    expect(exported.tables.map((table) => table.id)).toEqual([
      "report-stats",
      "synthese-executive-stats",
    ]);
    expect(exported.tables[0]?.source).toBe("snapshot.data.stats");
    expect(exported.tables[0]?.rows[0]?.values.value).toEqual({ value: null, status: "NA" });
    expect(csv).toContain("Actions validées");
    expect(csv).toContain("synthese-executive-stats");
    expect(csv).not.toContain(",n/a,");
  });

  it("keeps indicators and existing table columns without duplicating either projection", () => {
    const exported = buildReportScientificExport(generation());
    const dataTable = exported.tables.find((table) => table.id === "report-data");
    const chapterTable = exported.tables.find((table) => table.id === "methodologie-fiabilite");

    expect(dataTable?.columns.map((column) => column.id)).toEqual(["Date", "Masse_Kg", "CO2e_Proxy_Kg", "Megots"]);
    expect(chapterTable?.columns.map((column) => column.id)).toEqual(["metric", "value"]);
    expect(exported.tables.filter((table) => table.source.endsWith(".stats"))).toHaveLength(0);

    const withIndicators = generation({
      snapshot: {
        ...generation().snapshot,
        data: {
          ...generation().snapshot.data,
          stats: [{ label: "Actions", value: 2 }],
          chapters: [{
            ...generation().snapshot.data.chapters![0],
            stats: [{ label: "Couverture", value: "100 %" }],
          }],
        },
      },
    });
    const projected = buildReportScientificExport(withIndicators);

    expect(projected.tables.filter((table) => table.source.endsWith(".stats")).map((table) => table.id)).toEqual([
      "report-stats",
      "methodologie-fiabilite-stats",
    ]);
    expect(projected.tables.filter((table) => table.id === "report-data")).toHaveLength(1);
    expect(projected.tables.filter((table) => table.id === "methodologie-fiabilite")).toHaveLength(1);
  });

  it("normalizes null and absence sentinels while preserving zero and not inferring provenance from text", () => {
    const record = generation({
      snapshot: {
        ...generation().snapshot,
        data: {
          ...generation().snapshot.data,
          rows: [{ nullValue: null, unavailable: "n/a", zero: 0, observedText: "OBSERVED", derivedText: "DERIVED" }],
          columns: [
            { key: "nullValue", label: "Null" },
            { key: "unavailable", label: "Indisponible" },
            { key: "zero", label: "Zéro" },
            { key: "observedText", label: "Texte observed" },
            { key: "derivedText", label: "Texte derived" },
          ],
          chapters: [],
        },
      },
    });
    const table = buildReportScientificExport(record).tables[0];
    const csv = buildReportScientificCsv(record);

    expect(table?.rows[0]?.values).toMatchObject({
      nullValue: { value: null, status: "NA" },
      unavailable: { value: null, status: "NA" },
      zero: { value: 0, status: null },
      observedText: { value: "OBSERVED", status: null },
      derivedText: { value: "DERIVED", status: null },
    });
    expect(csv).toMatch(/,zero,Zéro,,0,\r\n/);
    expect(csv).not.toContain(",n/a,");
    expect(csv).not.toContain(",OBSERVED,OBSERVED");
  });

  it("keeps HTML and scientific projections aligned for concise, default and exhaustive details", () => {
    for (const detailLevel of ["concis", "default", "exhaustif"] as const) {
      const record = generation({
        detailLevel,
        snapshot: {
          ...generation().snapshot,
          snapshotMetadata: {
            ...generation().snapshot.snapshotMetadata!,
            detailLevel,
          },
          data: {
            ...generation().snapshot.data,
            stats: [{ label: `Indicateur ${detailLevel}`, value: 12 }],
            chapters: [{
              id: "synthese-executive",
              title: "Synthèse exécutive",
              stats: [{ label: `Valeur ${detailLevel}`, value: 3 }],
              ...(detailLevel === "concis" ? {} : {
                rows: [{ valeur: detailLevel }],
                columns: [{ key: "valeur", label: "Valeur" }],
              }),
            }],
          },
        },
      });
      const html = buildOfficialReportHtml(record.snapshot, { theme: "scientific" });
      const exported = buildReportScientificExport(record);

      expect(html).toContain(`Indicateur ${detailLevel}`);
      expect(html).toContain(`Valeur ${detailLevel}`);
      expect(exported.tables.some((table) => table.source === "snapshot.data.stats")).toBe(true);
      expect(exported.tables.some((table) => table.source === "snapshot.data.chapters[0].stats")).toBe(true);
    }
  });

  it("preserves explicit historized indicator statuses when they are present", () => {
    const snapshot = {
      ...generation().snapshot,
      data: {
        ...generation().snapshot.data,
        stats: [
          { label: "Masse déclarée", value: 3, status: "DECLARED" },
          { label: "Impact proxy", value: 4, status: "PROXY" },
        ],
      },
    } as unknown as ReportGenerationSnapshotRecord["snapshot"];
    const record = generation({ snapshot });
    const table = buildReportScientificExport(record).tables.find((item) => item.id === "report-stats");

    expect(table?.rows.map((row) => row.values.value.status)).toEqual(["DECLARED", "PROXY"]);
  });

  it("keeps the original snapshot untouched for legacy and current records", () => {
    const record = generation();
    const before = structuredClone(record.snapshot);

    buildReportScientificExport(record);

    expect(record.snapshot).toEqual(before);
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
