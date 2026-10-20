import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/contracts/contract-model";

const mocks = vi.hoisted(() => ({
  loadReportsGenerationData: vi.fn(),
  toActionListItem: vi.fn((contract) => ({
    status: contract.status,
    created_by_clerk_id: contract.createdByClerkId,
    actor_name: contract.metadata.actorName,
    association_name: contract.metadata.associationName,
    location_label: contract.location.label,
    action_date: contract.dates.observedAt,
    contract,
  })),
  toActionMapItem: vi.fn((contract) => ({ status: contract.status, contract })),
  computeReportModel: vi.fn(),
  buildPdfData: vi.fn(),
  buildReportTitle: vi.fn((scopeLabel: string) => `Rapport - ${scopeLabel}`),
  toReportsExportRow: vi.fn((contract) => ({ id: contract.id })),
}));

vi.mock("@/lib/reports/page-data", () => ({
  loadReportsGenerationData: mocks.loadReportsGenerationData,
}));
vi.mock("@/lib/actions/data-contract", () => ({
  toActionListItem: mocks.toActionListItem,
  toActionMapItem: mocks.toActionMapItem,
}));
vi.mock("@/lib/reports/report-model", () => ({
  computeReportModel: mocks.computeReportModel,
}));
vi.mock("@/lib/reports/report-pdf-data", () => ({
  buildPdfData: mocks.buildPdfData,
  buildReportTitle: mocks.buildReportTitle,
}));
vi.mock("@/lib/reports/page-data-export", () => ({
  toReportsExportRow: mocks.toReportsExportRow,
}));

import {
  buildMultiActionReportGenerationInput,
  MultiActionReportEmptyError,
  MultiActionReportPeriodInvalidError,
  MultiActionReportScopeUnavailableError,
  MultiActionReportSourceUnavailableError,
} from "./multi-action-report";

function makeContract(id: string, overrides: Record<string, unknown> = {}) {
  return buildActionDataContract({
    id,
    type: "action",
    status: "approved",
    source: "actions",
    sourceStatus: "approved",
    createdByClerkId: "user-1",
    publishedAt: "2026-08-16T12:00:00.000Z",
    observedAt: "2026-08-15T12:00:00.000Z",
    createdAt: "2026-08-15T12:00:00.000Z",
    importedAt: null,
    locationLabel: "Paris 1er",
    latitude: 48.86,
    longitude: 2.34,
    wasteKg: 4,
    cigaretteButts: 10,
    volunteersCount: 2,
    durationMinutes: 30,
    actorName: "Alice",
    associationName: "Association Canonique",
    actionPhase: "post_action_complete",
    moderationVisibility: "visible",
    ...overrides,
  });
}

describe("multi-action report server resolver", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");
  const modules = {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadReportsGenerationData.mockResolvedValue({
      contracts: [
        makeContract("included"),
        makeContract("outside", { observedAt: "2026-07-31T12:00:00.000Z" }),
        makeContract("other-association", { associationName: "Autre association" }),
      ],
      isTruncated: true,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
      communityEvents: [],
      communityEventsAvailability: "available",
    });
    mocks.computeReportModel.mockReturnValue({
      generatedAt: now.toISOString(),
      totals: {
        actions: 1,
        kg: 4,
        knownWasteActions: 1,
        volunteersKnownActions: 1,
        hours: 0.5,
      },
      impactMethodology: { proxyVersion: "impact-proxy-v1", qualityRulesVersion: "quality-v1" },
    });
    mocks.buildPdfData.mockReturnValue({
      title: "Rapport - Association Canonique",
      generatedAt: now.toISOString(),
      summary: [],
    });
  });

  it("resolves canonical actions, period, scope and server model without a browser payload", async () => {
    const result = await buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "custom_range", from: "2026-08-01", to: "2026-08-31" },
        scope: { kind: "association", value: "Association Canonique" },
      },
      detailLevel: "default",
      modules,
      now,
    });

    expect(mocks.computeReportModel).toHaveBeenCalledWith(expect.objectContaining({
      allItems: [expect.objectContaining({ contract: expect.objectContaining({ id: "included" }) })],
      approvedItems: [expect.objectContaining({ contract: expect.objectContaining({ id: "included" }) })],
      now,
    }));
    expect(mocks.buildPdfData).toHaveBeenCalledWith(expect.objectContaining({
      period: "custom_range",
      periodRange: { from: "2026-08-01", to: "2026-08-31", timeZone: "UTC" },
      surfaceProxy: expect.any(Number),
    }));
    expect(result.scopeKind).toBe("association");
    expect(result.scopeValue).toBe("Association Canonique");
    expect(result.payload.organizationType).toBe("multi_action");
    expect(result.payload.snapshotSchemaVersion).toBe(2);
    expect(result.payload.snapshotMetadata).toMatchObject({
      templateVersion: "reports-template-v1",
      rendererVersion: "official-report-html-v1",
      scope: { kind: "association", value: "Association Canonique" },
      provenance: { type: "multi_action", actionCount: 1 },
      modules,
    });
    expect(result.payload.data).not.toHaveProperty("forgedKpi");
    expect(mocks.buildPdfData).toHaveBeenCalledWith(expect.objectContaining({
      model: expect.objectContaining({
        dataAvailability: expect.objectContaining({ communityEventsAvailability: "partial" }),
      }),
    }));
  });

  it("applies advanced filters before the server model and records the exact selection", async () => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [
        makeContract("with-ready-media"),
        makeContract("without-ready-media", { wasteKg: 1 }),
      ],
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
      communityEvents: [],
      communityEventsAvailability: "available",
      actionMediaReadyCountByActionId: { "with-ready-media": 1 },
      actionMediaAvailability: "available",
    });

    const filters = {
      dataQuality: "all" as const,
      qualityGradeAtLeast: "any" as const,
      measureProvenance: "any" as const,
      validCoordinates: "required" as const,
      geometryProvenance: "any" as const,
      declarationOrigin: "any" as const,
      wasteKgMin: 4,
      wasteKgMax: null,
      cigaretteButtsMin: null,
      cigaretteButtsMax: null,
      wasteCategory: "any" as const,
      exploitableGeometry: "any" as const,
      photographicEvidence: "with" as const,
    };
    const result = await buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "full_history" },
        scope: { kind: "global" },
        filters,
      },
      detailLevel: "default",
      modules,
      now,
    });

    expect(mocks.computeReportModel).toHaveBeenCalledWith(expect.objectContaining({
      contracts: [expect.objectContaining({ id: "with-ready-media" })],
    }));
    expect(result.payload.snapshotMetadata).toMatchObject({
      advancedFiltersVersion: "reports-advanced-filters-v1",
      filters,
      provenance: { actionCount: 1 },
    });
  });

  it("rejects unknown association names instead of treating them as membership", async () => {
    await expect(buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "six_months" },
        scope: { kind: "association", value: "Nom libre non canonique" },
      },
      detailLevel: "default",
      modules,
      now,
    })).rejects.toBeInstanceOf(MultiActionReportScopeUnavailableError);
  });

  it.each([
    ["account", null],
    ["association", ""],
    ["arrondissement", undefined],
  ] as const)("rejects a non-global scope without a canonical value (%s)", async (kind, value) => {
    await expect(buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "six_months" },
        scope: { kind, value },
      },
      detailLevel: "default",
      modules,
      now,
    })).rejects.toBeInstanceOf(MultiActionReportScopeUnavailableError);
    expect(mocks.computeReportModel).not.toHaveBeenCalled();
  });

  it.each([
    ["unpublished", { publishedAt: null }],
    ["draft", { actionPhase: "post_action_draft" }],
    ["hidden", { moderationVisibility: "hidden" }],
  ] as const)("excludes %s actions from the public completed corpus", async (_label, overrides) => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [makeContract("ineligible", overrides)],
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
      communityEvents: [],
      communityEventsAvailability: "available",
    });

    await expect(buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "six_months" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    })).rejects.toBeInstanceOf(MultiActionReportEmptyError);
  });

  it.each([
    ["account", "user-1"],
    ["arrondissement", "1"],
  ] as const)("selects the canonical corpus for a %s scope", async (kind, value) => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [
        makeContract("included"),
        kind === "account"
          ? makeContract("other-account", { createdByClerkId: "user-2" })
          : makeContract("other-arrondissement", { locationLabel: "Paris 2e" }),
      ],
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
      communityEvents: [],
      communityEventsAvailability: "available",
    });
    const result = await buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "six_months" },
        scope: { kind, value },
      },
      detailLevel: "default",
      modules,
      now,
    });

    const modelCall = mocks.computeReportModel.mock.calls.at(-1)?.[0];
    expect(modelCall.contracts.map((contract: { id: string }) => contract.id)).toEqual(["included"]);
    expect(result.scopeKind).toBe(kind);
    expect(result.scopeValue).toBe(value);
  });

  it("keeps approved-only reports from fabricating moderation statistics", async () => {
    await buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "six_months" },
        scope: { kind: "global" },
      },
      detailLevel: "default",
      modules,
      now,
    });

    expect(mocks.computeReportModel).toHaveBeenCalledWith(expect.objectContaining({
      moderationAvailability: "unavailable",
    }));
  });

  it("keeps source, empty-window and truncation states explicit", async () => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [],
      isTruncated: false,
      sourceHealth: { partial: true, failedSources: ["actions"], availableSources: [], warnings: ["down"] },
      communityEvents: [],
      communityEventsAvailability: "unavailable",
    });
    await expect(buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "six_months" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    })).rejects.toBeInstanceOf(MultiActionReportSourceUnavailableError);

    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [makeContract("old", { observedAt: "2020-01-01T00:00:00.000Z" })],
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
      communityEvents: [],
      communityEventsAvailability: "available",
    });
    await expect(buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "thirty_days" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    })).rejects.toBeInstanceOf(MultiActionReportEmptyError);
  });

  it("never expands the canonical corpus when period, scope and filters are combined", async () => {
    const candidates = [
      makeContract("kept", { wasteKg: 4, associationName: "Association Canonique" }),
      makeContract("outside-period", { observedAt: "2026-01-01T00:00:00.000Z" }),
      makeContract("other-association", { associationName: "Autre association" }),
      makeContract("below-filter", { wasteKg: 1 }),
      makeContract("hidden", { moderationVisibility: "hidden" }),
      makeContract("unpublished", { publishedAt: null }),
      makeContract("draft", { actionPhase: "post_action_draft" }),
      makeContract("rejected", { status: "rejected" }),
    ];
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [...candidates].reverse(),
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
      communityEvents: [],
      communityEventsAvailability: "available",
    });

    const filters = {
      ...{
        dataQuality: "all" as const,
        qualityGradeAtLeast: "any" as const,
        measureProvenance: "any" as const,
        validCoordinates: "any" as const,
        geometryProvenance: "any" as const,
        declarationOrigin: "any" as const,
        wasteKgMin: 4,
        wasteKgMax: 4,
        cigaretteButtsMin: null,
        cigaretteButtsMax: null,
        wasteCategory: "any" as const,
        exploitableGeometry: "any" as const,
        photographicEvidence: "any" as const,
      },
    };
    const result = await buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "custom_range", from: "2026-08-01", to: "2026-08-31" },
        scope: { kind: "association", value: "Association Canonique" },
        filters,
      },
      detailLevel: "default",
      modules,
      now,
      generationId: "generation-selection-order",
    });

    const modelCall = mocks.computeReportModel.mock.calls.at(-1)?.[0];
    expect(modelCall.contracts.map((contract: { id: string }) => contract.id)).toEqual(["kept"]);
    expect(modelCall.allItems.map((item: { contract: { id: string } }) => item.contract.id)).toEqual(["kept"]);
    expect(modelCall.approvedItems.map((item: { contract: { id: string } }) => item.contract.id)).toEqual(["kept"]);
    expect(modelCall.mapItems.map((item: { contract: { id: string } }) => item.contract.id)).toEqual(["kept"]);
    expect(result.payload.snapshotMetadata).toMatchObject({ provenance: { actionCount: 1 }, filters });
  });

  it("rejects invalid custom periods before reading the source", async () => {
    await expect(buildMultiActionReportGenerationInput({
      request: {
        type: "multi_action",
        period: { id: "custom_range", from: "2026-09-01", to: "2026-08-01" },
        scope: { kind: "global" },
      },
      detailLevel: "default",
      modules,
      now,
    })).rejects.toBeInstanceOf(MultiActionReportPeriodInvalidError);
    expect(mocks.loadReportsGenerationData).not.toHaveBeenCalled();
  });

  it("computes multi-action waste coverage from structured rows without counting missing breakdowns", async () => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [
        makeContract("a", { wasteBreakdown: { megotsKg: 2, plastiqueKg: 1 } }),
        makeContract("b", { wasteBreakdown: { megotsKg: 0, verreKg: 3 } }),
        makeContract("missing", { wasteBreakdown: null }),
      ],
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
      communityEvents: [],
      communityEventsAvailability: "available",
    });

    await buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "full_history" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    });

    const model = mocks.buildPdfData.mock.calls.at(-1)?.[0]?.model;
    expect(model.wasteProfile).toMatchObject({
      coveragePercent: (2 / 3) * 100,
      dominantLabel: "Verre",
      dominantKg: 3,
    });
    expect(model.wasteProfile.categories).toEqual([
      expect.objectContaining({ key: "verreKg", kg: 3, actions: 1 }),
      expect.objectContaining({ key: "megotsKg", kg: 2, actions: 1 }),
      expect.objectContaining({ key: "plastiqueKg", kg: 1, actions: 1 }),
    ]);
  });

  it("keeps an entirely unknown waste profile and impact proxy unavailable", async () => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [makeContract("unknown", { wasteKg: 0, volunteersCount: null, wasteBreakdown: null })],
      isTruncated: false,
      sourceHealth: { partial: true, failedSources: ["community_events"], availableSources: ["actions"], warnings: ["events unavailable"] },
      communityEvents: [],
      communityEventsAvailability: "unavailable",
    });
    mocks.computeReportModel.mockReturnValueOnce({
      generatedAt: now.toISOString(),
      totals: { actions: 1, kg: 0, knownWasteActions: 1, volunteersKnownActions: 0, hours: 0 },
      impactMethodology: { proxyVersion: "impact-proxy-v1", qualityRulesVersion: "quality-v1" },
    });

    await buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "full_history" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    });

    const model = mocks.buildPdfData.mock.calls.at(-1)?.[0]?.model;
    expect(model.wasteProfile).toEqual({
      categories: [],
      coveragePercent: 0,
      dominantLabel: "Déchets non typés",
      dominantKg: 0,
    });
    expect(model.dataAvailability).toMatchObject({
      sourceHealth: { partial: true, failedSources: ["community_events"] },
      communityEventsAvailability: "unavailable",
    });
    expect(mocks.buildPdfData).toHaveBeenCalledWith(expect.objectContaining({ surfaceProxy: null }));
  });

  it("uses action counts as the deterministic tie-breaker for equal waste categories", async () => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce({
      contracts: [
        makeContract("plastic", { wasteBreakdown: { plastiqueKg: 2 } }),
        makeContract("glass-1", { wasteBreakdown: { verreKg: 1 } }),
        makeContract("glass-2", { id: "glass-2", wasteBreakdown: { verreKg: 1 } }),
      ],
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
      communityEvents: [],
      communityEventsAvailability: "available",
    });

    await buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "full_history" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    });

    const model = mocks.buildPdfData.mock.calls.at(-1)?.[0]?.model;
    expect(model.wasteProfile.categories).toEqual([
      expect.objectContaining({ key: "verreKg", kg: 2, actions: 2 }),
      expect.objectContaining({ key: "plastiqueKg", kg: 2, actions: 1 }),
    ]);
  });
});
