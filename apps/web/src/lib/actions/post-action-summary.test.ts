import { describe, expect, it } from "vitest";
import { buildPostActionSummary } from "./post-action-summary";

const action = {
  id: "action-42",
  createdAt: "2026-08-04T10:00:00.000Z",
  status: "approved" as const,
  actionPhase: "post_action_complete" as const,
  preparationData: null,
  createdByClerkId: "user-1",
  actorName: "Alex",
  actionDate: "2026-08-04",
  locationLabel: "Quai de Loire",
  latitude: 48.89,
  longitude: 2.37,
  wasteKg: 4,
  cigaretteButts: 10,
  volunteersCount: 2,
  durationMinutes: 30,
  notes: "Collecte vérifiée sur le quai.",
  submissionMode: "complete" as const,
  associationName: "Action spontanée",
  groupJoinEnabled: false,
  participantAccounts: [],
  placeType: "Quai",
  departureLocationLabel: null,
  arrivalLocationLabel: null,
  routeStyle: null,
  routeAdjustmentMessage: null,
  wasteBreakdown: null,
  photos: null,
  visionEstimate: null,
  manualDrawing: {
    kind: "polyline" as const,
    coordinates: [[48.89, 2.37], [48.891, 2.371]] as [number, number][],
  },
  recordType: "action",
};

describe("buildPostActionSummary", () => {
  it("reuses recorded values and exposes proxy method plus confidence", () => {
    const summary = buildPostActionSummary(action);

    expect(summary.action).toMatchObject({
      id: "action-42",
      wasteKg: 4,
      cigaretteButts: 10,
      volunteersCount: 2,
      durationMinutes: 30,
    });
    expect(summary.impactStatus).toBe("validated");
    expect(summary.impact[0]).toMatchObject({
      label: "CO₂e évité",
      value: 4.8,
      unit: "kg CO₂e",
      confidence: expect.any(Number),
    });
    expect(summary.impact[0]?.method).toContain("Proxy");
    expect(summary.methodology.version).toBeTruthy();
  });

  it("marks pending actions as provisional without changing the stored metrics", () => {
    const summary = buildPostActionSummary({ ...action, status: "pending" });

    expect(summary.impactStatus).toBe("provisional");
    expect(summary.action.wasteKg).toBe(4);
    expect(summary.quality.score).toBeGreaterThan(0);
  });
});
