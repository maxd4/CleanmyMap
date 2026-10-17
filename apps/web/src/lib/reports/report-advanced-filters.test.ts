import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  filterActionContractsByAdvancedFilters,
  REPORT_ADVANCED_FILTER_DEFAULTS,
  ReportAdvancedFilterSourceUnavailableError,
} from "./report-advanced-filters";

function makeContract(id: string, overrides: Record<string, unknown> = {}) {
  return buildActionDataContract({
    id,
    type: "action",
    status: "approved",
    source: "actions",
    sourceStatus: "approved",
    createdByClerkId: "user-1",
    publishedAt: "2026-08-20T12:00:00.000Z",
    observedAt: "2026-08-15T12:00:00.000Z",
    createdAt: "2026-08-15T12:00:00.000Z",
    locationLabel: "Paris 1er",
    latitude: 48.86,
    longitude: 2.34,
    wasteKg: 4,
    cigaretteButts: 10,
    volunteersCount: 2,
    durationMinutes: 30,
    actionPhase: "post_action_complete",
    moderationVisibility: "visible",
    submissionMode: "complete",
    geometrySource: "manual",
    manualDrawing: { kind: "polyline", coordinates: [[2.34, 48.86], [2.35, 48.87]] },
    ...overrides,
  });
}

describe("report advanced filters", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");

  it("keeps exact threshold bounds and rejects null values", () => {
    const contracts = [
      makeContract("lower", { wasteKg: 2, cigaretteButts: 5 }),
      makeContract("upper", { wasteKg: 4, cigaretteButts: 10 }),
      makeContract("missing", { wasteKg: null, cigaretteButts: null }),
    ];

    const result = filterActionContractsByAdvancedFilters({
      contracts,
      filters: {
        ...REPORT_ADVANCED_FILTER_DEFAULTS,
        wasteKgMin: 2,
        wasteKgMax: 4,
        cigaretteButtsMin: 5,
        cigaretteButtsMax: 10,
      },
      now,
    });

    expect(result.map((contract) => contract.id)).toEqual(["lower", "upper"]);
  });

  it("uses canonical quality, provenance, geometry and declaration fields", () => {
    const contracts = [
      makeContract("canonical", {
        wasteKg: 4,
        submissionMode: "complete",
        geometrySource: "gps_tracking",
      }),
      makeContract("invalid", { latitude: null, longitude: 2.34 }),
      makeContract("estimated", {
        visionEstimate: {
          modelVersion: "test",
          source: "heuristic",
          provisional: true,
          bagsCount: { value: 1, confidence: 0.5 },
          fillLevel: { value: 1, confidence: 0.5 },
          density: { value: "sec", confidence: 0.5 },
          wasteKg: { value: 4, confidence: 0.5 },
        },
      }),
    ];

    const result = filterActionContractsByAdvancedFilters({
      contracts,
      filters: {
        ...REPORT_ADVANCED_FILTER_DEFAULTS,
        dataQuality: "without_blocking_anomaly",
        validCoordinates: "required",
        geometryProvenance: "observed",
        declarationOrigin: "complete",
        measureProvenance: "measured",
      },
      now,
    });

    expect(result.map((contract) => contract.id)).toEqual(["canonical"]);
  });

  it("uses only the structured waste breakdown for category filters", () => {
    const contracts = [
      makeContract("structured", {
        notes: "categorie:glass",
        wasteBreakdown: { glassKg: 1 },
      }),
      makeContract("text-only", { notes: "categorie:glass", wasteBreakdown: null }),
    ];

    const result = filterActionContractsByAdvancedFilters({
      contracts,
      filters: { ...REPORT_ADVANCED_FILTER_DEFAULTS, wasteCategory: "glass" },
      now,
    });

    expect(result.map((contract) => contract.id)).toEqual(["structured"]);
  });

  it("treats only ready evidence counts as photographic proof and fails closed when unavailable", () => {
    const contracts = [makeContract("ready"), makeContract("not-ready")];
    const filters = { ...REPORT_ADVANCED_FILTER_DEFAULTS, photographicEvidence: "with" as const };

    expect(filterActionContractsByAdvancedFilters({
      contracts,
      filters,
      now,
      actionMediaReadyCountByActionId: new Map([["ready", 1]]),
      actionMediaAvailability: "available",
    }).map((contract) => contract.id)).toEqual(["ready"]);

    expect(() => filterActionContractsByAdvancedFilters({
      contracts,
      filters,
      now,
      actionMediaAvailability: "unavailable",
    })).toThrow(ReportAdvancedFilterSourceUnavailableError);
  });
});
