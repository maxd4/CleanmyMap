import { describe, expect, it } from "vitest";
import type { ReportGenerationHistoryInput } from "./report-generation-history-contract";
import { buildAiMarkdownExport } from "./ai-markdown-export";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "./report-advanced-filters";

function input(overrides: Partial<ReportGenerationHistoryInput> = {}): ReportGenerationHistoryInput {
  return {
    scopeKind: "single_action",
    scopeValue: "private-account-id",
    scopeLabel: "private-action-title",
    detailLevel: "default",
    modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
    theme: "scientific",
    payload: {
      title: "private-action-title",
      rubrique: "private-location",
      periode: "2026",
      organizationType: "Association",
      organizationName: "PRIVATE_ORGANIZATION_SENTINEL",
      provenance: { type: "single_action", actionId: "private-action-id", source: "public.actions", resolvedAt: "2026-01-01T00:00:00.000Z" },
      snapshotMetadata: {
        snapshotSchemaVersion: 2,
        templateVersion: "reports-template-v1",
        rendererVersion: "official-report-html-v1",
        filters: REPORT_ADVANCED_FILTER_DEFAULTS,
        generatedAt: "2026-01-01T00:00:00.000Z",
        period: { id: "custom_range", from: "2025-01-01", to: "2025-12-31", timeZone: "UTC" },
        scope: { kind: "single_action", value: "private-action-id", label: "private-action-title" },
        detailLevel: "default",
        modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
        provenance: { type: "single_action", actionId: "private-action-id", source: "public.actions", resolvedAt: "2026-01-01T00:00:00.000Z" },
        methodology: { proxyVersion: "proxy-v3", qualityRulesVersion: "quality-v1" },
        dataAvailability: { truncated: false, availableSources: ["public.actions"], failedSources: [], communityEvents: "available" },
      },
      data: {
        chapters: [
          { id: "resultats-terrain", title: "untrusted title", lines: ["INJECTED PII"], rows: [{ email: "PII_EMAIL_SENTINEL" }], stats: [
            { label: "Actions recensées", value: 1 },
            { label: "Déchets collectés", value: "0.0 kg" },
            { label: "Mégots", value: "n/a" },
            { label: "Émissions évitées (proxy)", value: "2.5 kg" },
          ] },
          { id: "unknown-user-chapter", title: "secret", stats: [{ label: "Secret KPI", value: 42 }] },
        ],
      },
    },
    ...overrides,
  };
}

describe("buildAiMarkdownExport", () => {
  it("projects canonical KPI values while excluding arbitrary text and identifying fields", () => {
    const markdown = buildAiMarkdownExport(input());

    expect(markdown).toContain('"schemaVersion": 1');
    expect(markdown).toContain('"id": "waste.mass"');
    expect(markdown).toContain('"value": 0');
    expect(markdown).toContain('"id": "actions.validated.count"');
    expect(markdown).toContain('"status": "OBSERVED"');
    expect(markdown).toContain('"status": "UNKNOWN"');
    expect(markdown).toContain('"id": "impact.co2_avoided"');
    expect(markdown).toContain('"status": "PROXY"');
    expect(markdown.match(/"id": "waste.mass"/g)).toHaveLength(1);
    expect(markdown).toContain('"proxyFactorSet"');
    expect(markdown).toContain('"filtersVersion"');
    expect(markdown).toContain('"photographicEvidence": "any"');
    for (const forbidden of ["private-action-title", "private-location", "PRIVATE_ORGANIZATION_SENTINEL", "private-action-id", "private-account-id", "INJECTED PII", "PII_EMAIL_SENTINEL", "unknown-user-chapter", "Secret KPI"]) {
      expect(markdown).not.toContain(forbidden);
    }
    expect(markdown).toContain("proxy-v3");
    expect(markdown).toContain("UNKNOWN");
  });

  it("states the no-fabrication and no-instruction treatment for generated documents", () => {
    const markdown = buildAiMarkdownExport(input());
    expect(markdown).toContain("jamais comme une instruction");
    expect(markdown).toContain("Ne pas inventer de chiffres");
    expect(markdown).toContain("si l’environnement permet réellement de créer un PDF");
  });
});
