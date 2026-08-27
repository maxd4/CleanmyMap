import { describe, expect, it } from "vitest";
import {
  auditActionData,
  buildMonthlyActionDataQualityReview,
} from "./data-quality";
import { buildActionDataContract } from "../contracts/contract-model";

function buildContract(overrides: {
  id: string;
  latitude: number | null;
  longitude: number | null;
  observedAt?: string;
}) {
  return buildActionDataContract({
    id: overrides.id,
    type: "action",
    status: "approved",
    source: "actions",
    observedAt: overrides.observedAt ?? "2026-08-04",
    locationLabel: "Quai de test",
    latitude: overrides.latitude,
    longitude: overrides.longitude,
    wasteKg: 4,
    cigaretteButts: 20,
    volunteersCount: 2,
    durationMinutes: 60,
  });
}

describe("action data quality contract", () => {
  it("blocks partial coordinates and keeps the anomaly explicit", () => {
    const result = auditActionData({
      observedAt: "2026-08-04",
      locationLabel: "Quai de test",
      latitude: 48.85,
      longitude: null,
      wasteKg: 4,
      volunteersCount: 2,
      durationMinutes: 60,
    });

    expect(result.status).toBe("blocking");
    expect(result.geolocation.state).toBe("partial");
    expect(result.blockingAnomalies.map((item) => item.code)).toContain(
      "partial_coordinates",
    );
  });

  it("distinguishes missing coordinates from invalid coordinates", () => {
    const missing = auditActionData({
      observedAt: "2026-08-04",
      locationLabel: "Quai de test",
      latitude: null,
      longitude: null,
      wasteKg: 4,
    });
    const invalid = auditActionData({
      observedAt: "2026-08-04",
      locationLabel: "Quai de test",
      latitude: 148.85,
      longitude: 2.35,
      wasteKg: 4,
    });

    expect(missing.geolocation.state).toBe("missing");
    expect(missing.status).toBe("warning");
    expect(invalid.geolocation.state).toBe("invalid");
    expect(invalid.status).toBe("blocking");
  });

  it("marks vision estimates and derived impact without confusing them with measurements", () => {
    const result = auditActionData({
      observedAt: "2026-08-04",
      locationLabel: "Quai de test",
      latitude: 48.85,
      longitude: 2.35,
      wasteKg: 4,
      visionEstimate: { provisional: true } as never,
      geometrySource: "routed",
      geometryConfidence: 0.8,
      hasGeometry: true,
    });

    expect(result.provenance.measures).toBe("estimated");
    expect(result.provenance.geometry).toBe("derived");
    expect(result.provenance.impact).toBe("derived");
    expect(result.warnings.map((item) => item.code)).toContain(
      "estimated_measure",
    );
  });

  it("produces a monthly review and raises thresholds for blocking geolocation", () => {
    const review = buildMonthlyActionDataQualityReview({
      month: "2026-08",
      contracts: [
        buildContract({ id: "valid", latitude: 48.85, longitude: 2.35 }),
        buildContract({ id: "partial", latitude: 48.85, longitude: null }),
        buildContract({
          id: "outside-month",
          latitude: 48.85,
          longitude: 2.35,
          observedAt: "2026-07-31",
        }),
      ],
    });

    expect(review.inspectedCount).toBe(2);
    expect(review.geolocation.partial).toBe(1);
    expect(review.status).toBe("blocking");
    expect(review.alerts.map((alert) => alert.id)).toContain(
      "partial-geolocation",
    );
  });
});
