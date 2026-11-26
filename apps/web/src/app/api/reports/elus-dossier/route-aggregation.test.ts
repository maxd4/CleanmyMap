import { describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";

const fetchUnifiedMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedMock,
}));

import { buildElusDossierPayload } from "./route-aggregation";
import { buildDossierResponse } from "./route-response";

describe("elus-dossier aggregation scientific contracts", () => {
  it("does not count null wasteKg or volunteersCount as known and distinguishes observed zero", async () => {
    const today = new Date().toISOString().slice(0, 10);
    fetchUnifiedMock.mockResolvedValueOnce({
      items: [
        buildActionDataContract({
          id: "null-measures",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: today,
          createdAt: `${today}T10:00:00.000Z`,
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: null,
          volunteersCount: null,
        }),
        buildActionDataContract({
          id: "zero-measures",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: today,
          createdAt: `${today}T11:00:00.000Z`,
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 0,
          volunteersCount: 0,
        }),
      ],
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });

    const payload = await buildElusDossierPayload({
      supabase: {} as never,
      days: 30,
      limit: 500,
      floorDate: "2026-01-01",
      scope: { kind: "global", value: null },
    });

    expect(payload.summary.totalActions).toBe(2);
    expect(payload.summary.knownWasteActions).toBe(1);
    expect(payload.summary.volunteersKnownActions).toBe(1);
    expect(payload.comparison.deltas.actionsCount.percent).toBeNull();
  });

  it("propagates truncation to zoneComparisons and renders non-reported summary in markdown", async () => {
    const today = new Date().toISOString().slice(0, 10);
    fetchUnifiedMock.mockResolvedValueOnce({
      items: [
        buildActionDataContract({
          id: "only-null",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: today,
          createdAt: `${today}T10:00:00.000Z`,
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: null,
          volunteersCount: null,
        }),
      ],
      isTruncated: true,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });

    const payload = await buildElusDossierPayload({
      supabase: {} as never,
      days: 30,
      limit: 500,
      floorDate: "2026-01-01",
      scope: { kind: "global", value: null },
    });

    expect(payload.summary.knownWasteActions).toBe(0);
    expect(payload.summary.volunteersKnownActions).toBe(0);
    expect(payload.decisionPriorities).toEqual([]);
    expect(payload.comparison.deltas.actionsCount.absolute).toBeNull();
    expect(payload.zoneComparisons[0]?.deltaActionsAbsolute).toBeNull();
    expect(payload.zoneComparisons[0]?.deltaActionsPercent).toBeNull();
    expect(payload.zoneComparisons[0]?.deltaKgPercent).toBeNull();
    expect(payload.zoneComparisons[0]?.urgency).toBe("moderee");

    const mdResponse = buildDossierResponse(payload, "md");
    const md = await mdResponse.text();
    expect(md).toContain("Non renseigné (0/1 actions renseignées)");
    expect(md).toContain("Non renseignée (0/1 actions renseignées)");
    expect(md).toContain("kg non renseigné/");
    expect(md).toContain("indisponible");
  });

  it("handles failed actions source and previous-only actions across summary, priorities, and exports", async () => {
    const prevDate = new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 10);
    fetchUnifiedMock.mockResolvedValueOnce({
      items: [
        buildActionDataContract({
          id: "prev-only",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: prevDate,
          createdAt: `${prevDate}T10:00:00.000Z`,
          locationLabel: "Paris 11e",
          latitude: 48.86,
          longitude: 2.38,
          wasteKg: 25,
          volunteersCount: 5,
        }),
      ],
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });

    const prevOnlyPayload = await buildElusDossierPayload({
      supabase: {} as never,
      days: 30,
      limit: 500,
      floorDate: "2026-01-01",
      scope: { kind: "global", value: null },
    });

    expect(prevOnlyPayload.summary.totalActions).toBe(0);
    expect(prevOnlyPayload.territorialPriorities).toEqual([]);
    expect(prevOnlyPayload.zoneComparisons[0]?.currentActions).toBe(0);
    expect(prevOnlyPayload.zoneComparisons[0]?.previousActions).toBe(1);
    expect(prevOnlyPayload.zoneComparisons[0]?.urgency).toBe("moderee");

    fetchUnifiedMock.mockResolvedValueOnce({
      items: [],
      isTruncated: false,
      sourceHealth: {
        partial: true,
        failedSources: ["actions"],
        availableSources: [],
        warnings: ["actions_failed"],
      },
    });

    const failedPayload = await buildElusDossierPayload({
      supabase: {} as never,
      days: 30,
      limit: 500,
      floorDate: "2026-01-01",
      scope: { kind: "global", value: null },
    });

    expect(failedPayload.territorialPriorities).toEqual([]);
    expect(failedPayload.decisionPriorities).toEqual([]);
    expect(failedPayload.zoneComparisons).toEqual([]);
    expect(failedPayload.comparison.deltas.actionsCount.absolute).toBeNull();
    const jsonResponse = buildDossierResponse(failedPayload, "json");
    expect(jsonResponse.headers.get("X-Export-Warning")).toContain("actions_failed");
  });
});
