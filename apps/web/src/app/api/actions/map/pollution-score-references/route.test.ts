import { beforeEach, describe, expect, it, vi } from "vitest";

const loadReferencesMock = vi.hoisted(() => vi.fn());
const loadCollectionReferencesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/pollution/pollution-score-reference-snapshot", () => ({
  loadPollutionScoreReferencesForMap: loadReferencesMock,
}));
vi.mock("@/lib/actions/action-collection-reference-averages", () => ({
  loadActionCollectionReferenceAverages: loadCollectionReferencesMock,
}));

import { GET } from "./route";

describe("map pollution score references route", () => {
  beforeEach(() => {
    loadCollectionReferencesMock.mockResolvedValue(null);
  });

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

  it("expose séparément la moyenne de collecte sans modifier la référence du score", async () => {
    loadReferencesMock.mockResolvedValueOnce({
      references: { wastePerVolunteer: 12, buttsPerVolunteer: 345 },
      source: "weekly_snapshot",
      snapshotDate: "2026-09-07",
      generatedAt: "2026-09-07T03:00:00.000Z",
      warning: null,
    });
    loadCollectionReferencesMock.mockResolvedValueOnce({
      wastePerVolunteer: 6,
      buttsPerVolunteer: 200,
      wasteSourceCount: 2,
      buttsSourceCount: 3,
      eligibleActionCount: 4,
      updatedAt: "2026-10-29T03:00:00.000Z",
    });

    const response = await GET();
    expect(await response.json()).toMatchObject({
      references: { wastePerVolunteer: 12, buttsPerVolunteer: 345 },
      collectionReferences: { wastePerVolunteer: 6, wasteSourceCount: 2 },
    });
  });

  it("conserve la référence du score si la moyenne de collecte est indisponible", async () => {
    loadReferencesMock.mockResolvedValueOnce({
      references: { wastePerVolunteer: 12, buttsPerVolunteer: 345 },
      source: "weekly_snapshot",
      snapshotDate: "2026-09-07",
      generatedAt: "2026-09-07T03:00:00.000Z",
      warning: null,
    });
    loadCollectionReferencesMock.mockRejectedValueOnce(new Error("unavailable"));

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      references: { wastePerVolunteer: 12, buttsPerVolunteer: 345 },
      collectionReferences: null,
    });
  });

  it("retourne 503 lorsque la lecture et le fallback échouent", async () => {
    loadReferencesMock.mockRejectedValueOnce(new Error("unavailable"));
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
