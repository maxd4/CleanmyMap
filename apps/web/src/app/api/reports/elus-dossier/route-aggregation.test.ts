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
    expect(payload.zoneComparisons[0]?.deltaActionsPercent).toBeNull();
    expect(payload.zoneComparisons[0]?.deltaKgPercent).toBeNull();
    expect(payload.zoneComparisons[0]?.urgency).toBe("moderee");

    const mdResponse = buildDossierResponse(payload, "md");
    const md = await mdResponse.text();
    expect(md).toContain("Non renseigné (0/1 actions renseignées)");
    expect(md).toContain("Non renseignée (0/1 actions renseignées)");
    expect(md).toContain("indisponible");
  });
});
