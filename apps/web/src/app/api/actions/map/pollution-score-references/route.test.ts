import { describe, expect, it, vi } from "vitest";

const loadReferencesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/pollution/pollution-score-reference-snapshot", () => ({
  loadPollutionScoreReferencesForMap: loadReferencesMock,
}));

import { GET } from "./route";

describe("map pollution score references route", () => {
  it("retourne la source du snapshot ou du fallback", async () => {
    loadReferencesMock.mockResolvedValueOnce({
      references: { wastePerVolunteer: 12, buttsPerVolunteer: 345 },
      source: "weekly_snapshot",
      snapshotDate: "2026-09-07",
      generatedAt: "2026-09-07T03:00:00.000Z",
      warning: null,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "weekly_snapshot" });
    expect(response.headers.get("cache-control")).toContain("max-age=300");
  });

  it("retourne 503 lorsque la lecture et le fallback échouent", async () => {
    loadReferencesMock.mockRejectedValueOnce(new Error("unavailable"));
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
