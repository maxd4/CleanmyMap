import { describe, expect, it } from "vitest";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "./report-advanced-filters";
import {
  buildReportGenerationResumeConfig,
} from "./report-generation-resume";
import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";

const modules = {
  dataAndCartography: true,
  transparencyAndMethods: false,
  rawData: true,
  detailedFiles: false,
} as const;

const currentSnapshot = {
  title: "Rapport repris",
  rubrique: "reporting",
  periode: "custom_range",
  organizationType: "multi_action",
  snapshotSchemaVersion: 2 as const,
  snapshotMetadata: {
    snapshotSchemaVersion: 2 as const,
    templateVersion: "reports-template-v1",
    rendererVersion: "official-report-html-v1",
    generationId: "11111111-1111-4111-8111-111111111111",
    sourceGenerationId: null,
    filtersVersion: "reports-filters-v1",
    advancedFiltersVersion: "reports-advanced-filters-v1",
    filters: REPORT_ADVANCED_FILTER_DEFAULTS,
    generatedAt: "2026-08-27T10:30:00.000Z",
    period: { id: "custom_range" as const, from: "2026-01-01", to: "2026-03-31", timeZone: "UTC" as const },
    scope: { kind: "association" as const, value: "Association historique", label: "Association historique" },
    detailLevel: "exhaustif" as const,
    modules,
    provenance: { type: "multi_action" as const, source: "public.actions" as const, resolvedAt: "2026-08-27T10:30:00.000Z", actionCount: 2 },
    methodology: { proxyVersion: "impact-proxy-v1", qualityRulesVersion: "quality-v1" },
    dataAvailability: { truncated: false, availableSources: ["actions"], failedSources: [], communityEvents: "available" as const },
  },
  data: {
    generatedAt: "2026-08-27T10:30:00.000Z",
    periodRange: { from: "2026-01-01", to: "2026-03-31", timeZone: "UTC" as const },
  },
};

function record(overrides: Partial<ReportGenerationSnapshotRecord> = {}): ReportGenerationSnapshotRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    filename: "rapport_reporting_custom_range.pdf",
    generatedAt: "2026-08-27T10:30:00.000Z",
    scopeKind: "association",
    scopeValue: "Association historique",
    scopeLabel: "Association historique",
    detailLevel: "exhaustif",
    modules,
    theme: "scientific",
    snapshot: currentSnapshot,
    ...overrides,
  };
}

describe("report generation resume configuration", () => {
  it("restores current custom dates, scope, detail, modules, filters and theme", () => {
    expect(buildReportGenerationResumeConfig(record())).toMatchObject({
      period: { id: "custom_range", from: "2026-01-01", to: "2026-03-31" },
      scope: { kind: "association", value: "Association historique" },
      detailLevel: "exhaustif",
      modules,
      filters: REPORT_ADVANCED_FILTER_DEFAULTS,
      theme: "scientific",
      unknownParameters: [],
    });
  });

  it("uses verifiable legacy columns and marks absent history explicitly", () => {
    const legacy = {
      title: "Legacy",
      rubrique: "reporting",
      periode: "six_months",
      organizationType: "Global",
      data: { generatedAt: "2026-08-27T10:30:00.000Z" },
    };
    const result = buildReportGenerationResumeConfig(record({
      scopeKind: "global",
      scopeValue: "",
      scopeLabel: "Global",
      detailLevel: "default",
      modules,
      theme: null,
      snapshot: legacy,
    }));

    expect(result.period).toEqual({ id: "six_months", from: null, to: null });
    expect(result.scope).toEqual({ kind: "global", value: "", label: "Global" });
    expect(result.detailLevel).toBe("default");
    expect(result.modules).toEqual(modules);
    expect(result.theme).toBeNull();
    expect(result.unknownParameters).toEqual([
      "Les filtres avancés d'origine sont inconnus.",
      "Le thème PDF d'origine n'est pas enregistré.",
    ]);
  });

  it("keeps v1 configuration readable without upgrading the source snapshot", () => {
    const v1Snapshot = {
      title: "V1",
      rubrique: "reporting",
      periode: "full_history",
      organizationType: "Global",
      snapshotSchemaVersion: 1 as const,
      data: { generatedAt: "2026-08-27T10:30:00.000Z" },
    };
    const before = structuredClone(v1Snapshot);
    const result = buildReportGenerationResumeConfig(record({ snapshot: v1Snapshot, theme: "impact" }));

    expect(result.period.id).toBe("full_history");
    expect(result.modules).toEqual(modules);
    expect(result.theme).toBe("impact");
    expect(v1Snapshot).toEqual(before);
  });

  it("does not invent incomplete custom bounds or an inaccessible scope", () => {
    const result = buildReportGenerationResumeConfig(record({
      scopeKind: "account",
      scopeValue: "account-missing",
      scopeLabel: "Compte historique",
      snapshot: {
        ...currentSnapshot,
        periode: "custom_range",
        snapshotMetadata: undefined,
        data: { generatedAt: "2026-08-27T10:30:00.000Z", periodRange: undefined },
      },
      theme: null,
    }));

    expect(result.period).toEqual({ id: "custom_range", from: null, to: null });
    expect(result.scope).toEqual({ kind: "account", value: "account-missing", label: "Compte historique" });
    expect(result.unknownParameters).toContain("Les bornes de la période personnalisée d'origine sont incomplètes.");
    expect(result.unknownParameters).toContain("Le thème PDF d'origine n'est pas enregistré.");
  });
});
