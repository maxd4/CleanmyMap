import { describe, expect, it } from "vitest";
import { buildPostActionSummary } from "./post-action-summary";
import type { ActionEditorRecord } from "./http";

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

  it.each([
    ["null", null],
    ["undefined", undefined],
  ] as const)("keeps a missing waste measurement unavailable for %s", (_label, wasteKg) => {
    const summary = buildPostActionSummary({
      ...action,
      wasteKg,
    } as unknown as ActionEditorRecord);

    expect(summary.action.wasteKg).toBeNull();
    expect(summary.action.cigaretteButts).toBe(10);
    expect(summary.impact.find((metric) => metric.id === "co2")?.value).toBeNull();
    expect(summary.impact.find((metric) => metric.id === "surface")?.value).toBeNull();
  });

  it("keeps a missing cigarette-butt measurement unavailable while preserving zero", () => {
    const missing = buildPostActionSummary({ ...action, cigaretteButts: null });
    const absent = buildPostActionSummary({
      ...action,
      cigaretteButts: undefined,
    } as unknown as ActionEditorRecord);
    const zero = buildPostActionSummary({ ...action, cigaretteButts: 0 });

    expect(missing.action.cigaretteButts).toBeNull();
    expect(absent.action.cigaretteButts).toBeNull();
    expect(missing.impact.find((metric) => metric.id === "water")?.value).toBeNull();
    expect(zero.action.cigaretteButts).toBe(0);
    expect(zero.impact.find((metric) => metric.id === "water")?.value).toBe(0);
  });

  it("preserves positive and explicit zero waste measurements", () => {
    const zero = buildPostActionSummary({ ...action, wasteKg: 0 });
    const positive = buildPostActionSummary({ ...action, wasteKg: 2.5 });

    expect(zero.action.wasteKg).toBe(0);
    expect(zero.impact.find((metric) => metric.id === "co2")?.value).toBe(0);
    expect(positive.action.wasteKg).toBe(2.5);
    expect(positive.impact.find((metric) => metric.id === "co2")?.value).toBe(3);
  });
});
