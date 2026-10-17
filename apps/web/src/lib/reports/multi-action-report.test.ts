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
    expect(result.payload.data).not.toHaveProperty("forgedKpi");
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
});
