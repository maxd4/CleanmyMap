import { describe, expect, it } from "vitest";
import type { ReportGenerationHistoryInput } from "./report-generation-history-contract";
import { buildAiMarkdownExport } from "./ai-markdown-export";
import type { AiReportProjection } from "./report-ai-projection";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "./report-advanced-filters";

const aiProjection: AiReportProjection = {
  context: {
    actionContexts: [{ value: "citizen", count: 1 }],
    plannedObjectives: [{ value: "nettoyage", count: 1 }],
  },
  execution: { actionCount: 1, completedActionCount: 1, observedDateRange: { from: "2025-04-01", to: "2025-04-01" } },
  participation: [{
    id: "participation.volunteers.count", value: 0, unit: "personne", status: "OBSERVED",
    provenance: ["declared_action_volunteers"], coverage: { known: 1, total: 1 },
  }],
  measurements: [
    { id: "waste.mass", value: 0, unit: "kg", status: "OBSERVED", provenance: ["waste_measurement_method:balance_au_sol"], coverage: { known: 1, total: 1 } },
    { id: "cigarette_butts.count", value: null, unit: "mégot", status: "UNKNOWN", provenance: [], coverage: { known: 0, total: 1 }, versions: [] },
    { id: "cigarette_butts.mass_kg", value: null, unit: "kg", status: "UNKNOWN", provenance: [], coverage: { known: 0, total: 1 }, versions: [] },
  ],
  analyses: [
    { id: "impact.co2_avoided", value: 0, unit: "kgCO2e", status: "PROXY", provenance: ["impact_proxy_config"], versions: ["proxy-v3+factors-0123abcd"], factors: { kgCO2ePerWasteKg: 1.2 } },
  ],
  methodology: {
    proxyVersion: "proxy-v3+factors-0123abcd",
    qualityRulesVersion: "quality-v1",
    massConversionVersions: [
      "impact-terrain-2026-butts-mass-v1",
      "impact-terrain-2026-butts-mass-v2",
      "impact-terrain-2026-butts-mass-v3",
    ],
    wasteMeasurementMethods: [{ method: "balance_au_sol", count: 1 }],
    proxyFactors: { waterLitersPerCigaretteButt: 0, co2KgPerWasteKg: 1.2, surfaceM2PerWasteKg: 2.5, surfaceM2PerVolunteerMinute: 0.12, euroSavedPerWasteKg: 2 },
    proxySources: { water: "WHO", co2: "ADEME", surface: "CleanMyMap", roi: "Collectivités" },
    formulaIds: ["co2_avoided"],
  },
  sources: ["public.actions"],
  limitations: ["Aucune valeur absente n’est transformée en zéro."],
};

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
    aiProjection,
  };
}

describe("buildAiMarkdownExport", () => {
  it("projects canonical KPI values while excluding arbitrary text and identifying fields", () => {
    const markdown = buildAiMarkdownExport(input());

    expect(markdown).toContain('"schemaVersion": 2');
    expect(markdown).toContain('"id": "waste.mass"');
    expect(markdown).toContain('"value": 0');
    expect(markdown).toContain('"count": 1');
    expect(markdown).toContain('"status": "OBSERVED"');
    expect(markdown).toContain('"status": "UNKNOWN"');
    expect(markdown).toContain('"id": "impact.co2_avoided"');
    expect(markdown).toContain('"status": "PROXY"');
    expect(markdown.match(/"id": "waste.mass"/g)).toHaveLength(1);
    expect(markdown).toContain('"proxyFactors"');
    expect(markdown).toContain('"filters"');
    expect(markdown).toContain('"photographicEvidence": "any"');
    expect(markdown).toContain('"actionContexts"');
    expect(markdown).toContain('"plannedObjectives"');
    expect(markdown).toContain('"observedDateRange"');
    expect(markdown).toContain('"wasteMeasurementMethods"');
    expect(markdown).toContain('"massConversionVersions"');
    expect(markdown).toContain('"kgCO2ePerWasteKg": 1.2');
    expect(markdown).toContain('"value": 0');
    expect(markdown).toContain('"value": null');
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

  it("respects selected modules and never serializes arbitrary PDF content", () => {
    const markdown = buildAiMarkdownExport(input({
      modules: { dataAndCartography: false, transparencyAndMethods: false, rawData: false, detailedFiles: false },
    }));

    expect(markdown).toContain('"measurements": []');
    expect(markdown).toContain('"methodology": null');
    for (const forbidden of ["private-action-title", "private-location", "PRIVATE_ORGANIZATION_SENTINEL", "private-action-id", "private-account-id", "INJECTED PII", "PII_EMAIL_SENTINEL", "untrusted title", "private", "another-action"]) {
      expect(markdown).not.toContain(forbidden);
    }
  });
});
