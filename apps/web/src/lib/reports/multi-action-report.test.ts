import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  toActionListItem as actualToActionListItem,
  toActionMapItem as actualToActionMapItem,
} from "@/lib/actions/contracts/contract-mappers";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import type { ReportModel } from "@/lib/reports/report-model/types";

const mocks = vi.hoisted(() => ({
  loadReportsGenerationData: vi.fn<typeof import("@/lib/reports/page-data").loadReportsGenerationData>(),
  toActionListItem: vi.fn<(contract: ActionDataContract) => ActionListItem>(),
  toActionMapItem: vi.fn<(contract: ActionDataContract) => ActionMapItem>(),
  computeReportModel: vi.fn<typeof import("@/lib/reports/report-model").computeReportModel>(),
  buildPdfData: vi.fn<typeof import("@/lib/reports/report-pdf-data").buildPdfData>(),
  buildReportTitle: vi.fn<typeof import("@/lib/reports/report-pdf-data").buildReportTitle>(),
  toReportsExportRow: vi.fn<typeof import("@/lib/reports/page-data-export").toReportsExportRow>(),
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

type PdfData = ReturnType<typeof import("@/lib/reports/report-pdf-data").buildPdfData>;
type ReportSourceData = Awaited<ReturnType<typeof import("@/lib/reports/page-data").loadReportsGenerationData>>;

const reportModelFixture = (): ReportModel => ({
  generatedAt: "2026-08-31T12:00:00.000Z",
  totals: { actions: 1, kg: 4, knownWasteActions: 1, butts: 10, buttsKnownActions: 1, volunteers: 2, volunteersKnownActions: 1, hours: 0.5 },
  map: { points: 1, traces: 0, polylines: 0, polygons: 0, geoCoverage: 100, traceCoverage: 0 },
  moderation: { availability: "unavailable", pending: null, approved: 1, rejected: null, conversion: null, delayDays: null },
  quality: { completenessScore: 100, coherenceScore: 100, freshnessDays: 0, geolocRate: 100 },
  areas: [],
  trendPercent: 0,
  monthRows6: [],
  monthRows12: [],
  routeSteps: [],
  routeDistance: 0,
  terrain: { actionCount: 1, spotCount: 0, cleanPlaceCount: 0 },
  recycling: { recyclableKg: 0, triIndex: 0 },
  climate: { six: { actions: 1, kg: 4, butts: 10 }, twelve: { actions: 1, kg: 4, butts: 10 }, waterProtectedLiters: 0, co2AvoidedKg: 0 },
  community: {
    totalEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
    rsvp: { yes: 0, maybe: 0, no: 0 },
    participationRate: 0,
    topLeaderboard: [],
    badgeConfirmed: 0,
    badgeExpert: 0,
    sourceBuckets: { citoyen: 0, associatif: 0, institutionnel: 0 },
    conversion: { eventsCount: 0, rsvpYesTotal: 0, attendanceTotalKnown: 0, linkedActionsTotal: 0, rsvpToAttendanceRate: null, attendanceToActionRate: null, rsvpToActionRate: null },
  },
  impactMethodology: {
    proxyVersion: "impact-proxy-v1",
    qualityRulesVersion: "quality-v1",
    scope: "test",
    pollutionScoreAverage: 0,
    formulas: [],
    approximations: [],
    hypotheses: [],
    errorMargins: { waterSavedLitersPct: 0, co2AvoidedKgPct: 0, surfaceCleanedM2Pct: 0, pollutionScoreMeanPoints: 0 },
  },
  annualRows: [],
  calendar: [],
  highlightPhotos: [],
  highlightActions: [],
  executive: { readinessScore: 100, readinessLabel: "ready", headline: "Test", summary: "Test", evidence: [], budgetUseCases: [], watchouts: [] },
});

const pdfDataFixture = (): PdfData => ({
  title: "Rapport - Association Canonique",
  summary: [],
  stats: [],
  chapters: [],
  rows: [],
  columns: [],
  generatedAt: "2026-08-31T12:00:00.000Z",
  provenance: undefined,
});

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

function sourceData(
  contracts: ReportSourceData["contracts"],
  overrides: Partial<ReportSourceData> = {},
): ReportSourceData {
  return {
    contracts,
    isTruncated: false,
    sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
    communityEvents: [],
    communityEventsAvailability: "available",
    actionMediaReadyCountByActionId: {},
    actionMediaAvailability: "available",
    ...overrides,
  };
}

describe("multi-action report server resolver", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");
  const modules = {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  } as const;

  beforeEach(async () => {
    vi.clearAllMocks();
    const actualPageDataExport = await vi.importActual<typeof import("@/lib/reports/page-data-export")>("@/lib/reports/page-data-export");
    mocks.toActionListItem.mockImplementation(actualToActionListItem);
    mocks.toActionMapItem.mockImplementation(actualToActionMapItem);
    mocks.toReportsExportRow.mockImplementation(actualPageDataExport.toReportsExportRow);
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
      actionMediaReadyCountByActionId: {},
      actionMediaAvailability: "available",
    });
    mocks.computeReportModel.mockReturnValue(reportModelFixture());
    mocks.buildPdfData.mockReturnValue(pdfDataFixture());
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

    const computeCall = mocks.computeReportModel.mock.calls.at(-1)?.[0];
    if (!computeCall) throw new Error("Expected computeReportModel call");
    expect(computeCall.allItems.map((item) => item.contract?.id)).toEqual(["included"]);
    expect(computeCall.approvedItems.map((item) => item.contract?.id)).toEqual(["included"]);
    expect(computeCall.now).toBe(now);
    const pdfCall = mocks.buildPdfData.mock.calls.at(-1)?.[0];
    if (!pdfCall) throw new Error("Expected buildPdfData call");
    expect(pdfCall.period).toBe("custom_range");
    expect(pdfCall.periodRange).toEqual({ from: "2026-08-01", to: "2026-08-31", timeZone: "UTC" });
    expect(typeof pdfCall.surfaceProxy).toBe("number");
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
    const scopedPdfCall = mocks.buildPdfData.mock.calls.at(-1)?.[0];
    if (!scopedPdfCall) throw new Error("Expected scoped buildPdfData call");
    expect(scopedPdfCall.model.dataAvailability?.communityEventsAvailability).toBe("partial");
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
    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([makeContract("ineligible", overrides)]));

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
    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([
        makeContract("included"),
        kind === "account"
          ? makeContract("other-account", { createdByClerkId: "user-2" })
          : makeContract("other-arrondissement", { locationLabel: "Paris 2e" }),
      ]));
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
    if (!modelCall) throw new Error("Expected computeReportModel to be called");
    if (!modelCall.contracts) throw new Error("Expected report contracts to be provided");
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
    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([], {
      sourceHealth: { partial: true, failedSources: ["actions"], availableSources: [], warnings: ["down"] },
      communityEventsAvailability: "unavailable",
    }));
    await expect(buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "six_months" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    })).rejects.toBeInstanceOf(MultiActionReportSourceUnavailableError);

    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([
      makeContract("old", { observedAt: "2020-01-01T00:00:00.000Z" }),
    ]));
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
    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([...candidates].reverse()));

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
    if (!modelCall) throw new Error("Expected computeReportModel to be called");
    if (!modelCall.contracts) throw new Error("Expected report contracts to be provided");
    expect(modelCall.contracts.map((contract: { id: string }) => contract.id)).toEqual(["kept"]);
    expect(modelCall.allItems.map((item) => item.contract?.id)).toEqual(["kept"]);
    expect(modelCall.approvedItems.map((item) => item.contract?.id)).toEqual(["kept"]);
    expect(modelCall.mapItems.map((item) => item.contract?.id)).toEqual(["kept"]);
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
    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([
        makeContract("a", { wasteBreakdown: { megotsKg: 2, plastiqueKg: 1 } }),
        makeContract("b", { wasteBreakdown: { megotsKg: 0, verreKg: 3 } }),
        makeContract("missing", { wasteBreakdown: null }),
      ]));

    await buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "full_history" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    });

    const model = mocks.buildPdfData.mock.calls.at(-1)?.[0]?.model;
    if (!model) throw new Error("Expected buildPdfData to receive a model");
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
    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([
      makeContract("unknown", { wasteKg: 0, volunteersCount: null, wasteBreakdown: null }),
    ], {
      sourceHealth: { partial: true, failedSources: [], availableSources: ["actions"], warnings: ["events unavailable"] },
      communityEventsAvailability: "unavailable",
    }));
    mocks.computeReportModel.mockReturnValueOnce({
      ...reportModelFixture(),
      generatedAt: now.toISOString(),
      totals: {
        ...reportModelFixture().totals,
        actions: 1,
        kg: 0,
        knownWasteActions: 1,
        volunteersKnownActions: 0,
        hours: 0,
      },
    });

    await buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "full_history" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    });

    const model = mocks.buildPdfData.mock.calls.at(-1)?.[0]?.model;
    if (!model) throw new Error("Expected buildPdfData to receive a model");
    expect(model.wasteProfile).toEqual({
      categories: [],
      coveragePercent: 0,
      dominantLabel: "Déchets non typés",
      dominantKg: 0,
    });
    expect(model.dataAvailability).toMatchObject({
      sourceHealth: { partial: true, failedSources: [] },
      communityEventsAvailability: "unavailable",
    });
    expect(mocks.buildPdfData).toHaveBeenCalledWith(expect.objectContaining({ surfaceProxy: null }));
  });

  it("uses action counts as the deterministic tie-breaker for equal waste categories", async () => {
    mocks.loadReportsGenerationData.mockResolvedValueOnce(sourceData([
        makeContract("plastic", { wasteBreakdown: { plastiqueKg: 2 } }),
        makeContract("glass-1", { wasteBreakdown: { verreKg: 1 } }),
        makeContract("glass-2", { id: "glass-2", wasteBreakdown: { verreKg: 1 } }),
      ]));

    await buildMultiActionReportGenerationInput({
      request: { type: "multi_action", period: { id: "full_history" }, scope: { kind: "global" } },
      detailLevel: "default",
      modules,
      now,
    });

    const model = mocks.buildPdfData.mock.calls.at(-1)?.[0]?.model;
    if (!model) throw new Error("Expected buildPdfData to receive a model");
    expect(model.wasteProfile.categories).toEqual([
      expect.objectContaining({ key: "verreKg", kg: 2, actions: 2 }),
      expect.objectContaining({ key: "plastiqueKg", kg: 2, actions: 1 }),
    ]);
  });
});
