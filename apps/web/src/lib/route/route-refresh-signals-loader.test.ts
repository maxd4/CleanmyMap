import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadRouteFreshnessSignal } from "./route-refresh-signals-loader";
import type { ActionRouteVersion } from "./route-active-version";

function version(): ActionRouteVersion {
  return {
    versionId: "route-v1-current",
    appliedAt: "2026-09-20T10:00:00.000Z",
    appliedByUserId: "owner-1",
    calculation: {
      snapshotHash: "a".repeat(64),
      parameters: {} as ActionRouteVersion["calculation"]["parameters"],
      engineVersion: "route-planner-v2",
      modelVersions: {} as ActionRouteVersion["calculation"]["modelVersions"],
      provenance: {
        dataStatus: "complete",
        dataLayers: { observed: "complete", prediction: "unavailable", recommendation: "ok" },
        sourceHealth: { partial: false, failedSources: [], availableSources: ["spots"], warnings: [] },
        prediction: null,
      },
      metrics: { distanceKm: 1, walkingMinutes: 10, collectionMinutes: 20, totalMinutes: 35 },
      stops: [{ id: "spot-1", label: "Spot", score: 80, priorityReason: "observé", sourceFamily: "observed" }],
      explanation: null,
    },
    operationalRoute: {} as ActionRouteVersion["operationalRoute"],
  };
}

function supabaseRows(rows: unknown[], error: unknown = null) {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(async () => ({ data: rows, error })),
  };
  return { from: vi.fn(() => chain) };
}

describe("route freshness signals", () => {
  it("detects a selected observed source updated after the active version", async () => {
    const result = await loadRouteFreshnessSignal(
      supabaseRows([{ id: "spot-1", updated_at: "2026-09-21T10:00:00.000Z" }]) as never,
      version(),
    );
    expect(result).toEqual({
      status: "newer",
      latestSourceAt: "2026-09-21T10:00:00.000Z",
    });
  });

  it("keeps the signal current when the selected source has not changed", async () => {
    const result = await loadRouteFreshnessSignal(
      supabaseRows([{ id: "spot-1", updated_at: "2026-09-19T10:00:00.000Z" }]) as never,
      version(),
    );
    expect(result).toEqual({
      status: "current",
      latestSourceAt: "2026-09-19T10:00:00.000Z",
    });
  });

  it("does not invent freshness when the source comparison is unavailable", async () => {
    const result = await loadRouteFreshnessSignal(
      supabaseRows([], new Error("source unavailable")) as never,
      version(),
    );
    expect(result).toEqual({ status: "unknown", latestSourceAt: null });
  });
});
