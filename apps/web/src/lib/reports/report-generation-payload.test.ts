import { describe, expect, it } from "vitest";
import {
  InvalidReportGenerationSnapshotError,
  isReportGenerationPayload,
  parseReportGenerationPayload,
} from "./report-generation-payload";

const payload = {
  title: "Rapport d'impact historique",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  organizationName: "CleanMyMap",
  data: {
    generatedAt: "2026-08-27T10:30:00.000Z",
    summary: ["Résumé immuable"],
    chapters: [
      {
        id: "executive-summary",
        title: "Synthèse exécutive",
        stats: [{ label: "Émissions évitées", value: 12.4, detail: "proxy" }],
      },
    ],
  },
};

describe("report generation payload contract", () => {
  it("accepts the stored PDF payload without changing its content", () => {
    expect(parseReportGenerationPayload(payload)).toEqual(payload);
    expect(isReportGenerationPayload(payload)).toBe(true);
  });

  it("rejects an incompatible historical snapshot explicitly", () => {
    const invalid = {
      ...payload,
      data: { ...payload.data, generatedAt: "not-a-date" },
    };

    expect(isReportGenerationPayload(invalid)).toBe(false);
    expect(() => parseReportGenerationPayload(invalid)).toThrow(
      InvalidReportGenerationSnapshotError,
    );
  });

  it("rejects a snapshot from another rubrique or period contract", () => {
    expect(
      isReportGenerationPayload({ ...payload, rubrique: "mapping" }),
    ).toBe(false);
    expect(
      isReportGenerationPayload({ ...payload, periode: "rolling_90_days" }),
    ).toBe(false);
  });

  it("accepts immutable single-action provenance while preserving historical payloads", () => {
    const singleActionPayload = {
      ...payload,
      organizationType: "single_action",
      snapshotSchemaVersion: 1 as const,
      provenance: {
        type: "single_action",
        actionId: "11111111-1111-4111-8111-111111111111",
        source: "public.actions",
        resolvedAt: payload.data.generatedAt,
      },
    };

    expect(parseReportGenerationPayload(singleActionPayload)).toEqual(singleActionPayload);
    expect(singleActionPayload.snapshotSchemaVersion).toBe(1);
    expect(parseReportGenerationPayload(payload)).toEqual(payload);
  });

  it("accepts a custom civil period in a server-generated snapshot", () => {
    const custom = {
      ...payload,
      periode: "custom_range",
      data: {
        ...payload.data,
        periodRange: { from: "2026-08-01", to: "2026-08-31", timeZone: "UTC" as const },
      },
    };

    expect(parseReportGenerationPayload(custom)).toEqual(custom);
  });

  it("accepts a complete current snapshot and preserves its replay metadata", () => {
    const current = {
      ...payload,
      snapshotSchemaVersion: 2 as const,
      snapshotMetadata: {
        snapshotSchemaVersion: 2 as const,
        templateVersion: "reports-template-v1" as const,
        rendererVersion: "official-report-html-v1" as const,
        generatedAt: payload.data.generatedAt,
        period: { id: "six_months" as const, from: "2026-02-27", to: "2026-08-27", timeZone: "UTC" as const },
        scope: { kind: "global" as const, value: "", label: "Global" },
        detailLevel: "default" as const,
        modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
        provenance: { type: "multi_action" as const, source: "public.actions" as const, resolvedAt: payload.data.generatedAt, actionCount: 3 },
        methodology: { proxyVersion: "impact-proxy-v1", qualityRulesVersion: "quality-v1" },
        dataAvailability: { truncated: false, availableSources: ["actions"], failedSources: [], communityEvents: "available" as const },
      },
    };

    expect(parseReportGenerationPayload(current)).toEqual(current);
    expect(isReportGenerationPayload(current)).toBe(true);
  });

  it("rejects an unknown or incomplete current snapshot version", () => {
    expect(isReportGenerationPayload({ ...payload, snapshotSchemaVersion: 99 })).toBe(false);
    expect(isReportGenerationPayload({ ...payload, snapshotSchemaVersion: 2 })).toBe(false);
    expect(isReportGenerationPayload({
      ...payload,
      snapshotSchemaVersion: 2,
      snapshotMetadata: {
        snapshotSchemaVersion: 2,
        templateVersion: "reports-template-v1",
        rendererVersion: "official-report-html-v1",
        generatedAt: "2026-08-27T11:30:00.000Z",
      },
    })).toBe(false);
  });
});
