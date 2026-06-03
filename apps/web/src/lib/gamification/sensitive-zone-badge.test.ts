import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import {
  computeSensitiveZoneApaisementSummary,
  deriveSensitiveAreasFromContracts,
} from "./sensitive-zone-badge";

function buildContract(params: {
  id: string;
  locationLabel: string;
  observedAt: string;
  wasteKg: number;
}) {
  return buildActionDataContract({
    id: params.id,
    type: "action",
    status: "approved",
    source: "actions",
    observedAt: params.observedAt,
    createdAt: params.observedAt,
    importedAt: null,
    locationLabel: params.locationLabel,
    latitude: 48.85,
    longitude: 2.35,
    wasteKg: params.wasteKg,
    cigaretteButts: 20,
    volunteersCount: 2,
    durationMinutes: 45,
    actorName: "Alice",
    associationName: "Action spontanée",
    notes: "note",
    notesPlain: "note",
  });
}

describe("deriveSensitiveAreasFromContracts", () => {
  it("identifies the critical area from approved historical contracts", () => {
    const contracts = [
      ...Array.from({ length: 5 }, (_, index) =>
        buildContract({
          id: `zone-10-${index}`,
          locationLabel: `Paris 10e - Rue ${index}`,
          observedAt: "2026-05-10",
          wasteKg: 18,
        }),
      ),
      buildContract({
        id: "zone-11-1",
        locationLabel: "Paris 11e - Rue B",
        observedAt: "2026-05-10",
        wasteKg: 1,
      }),
    ];

    const sensitiveAreas = deriveSensitiveAreasFromContracts(
      contracts,
      new Date("2026-06-01T00:00:00.000Z"),
    );

    expect(sensitiveAreas).toContain("10e");
    expect(sensitiveAreas.length).toBeGreaterThan(0);
  });
});

describe("computeSensitiveZoneApaisementSummary", () => {
  it("counts only validated approved actions in sensitive zones and advances by gem thresholds", () => {
    const summary = computeSensitiveZoneApaisementSummary({
      rows: [
        {
          id: "action-1",
          location_label: "Paris 10e - Rue A",
          status: "approved",
        },
        {
          id: "action-2",
          location_label: "Paris 10e - Rue B",
          status: "approved",
        },
        {
          id: "action-3",
          location_label: "Paris 10e - Rue C",
          status: "approved",
        },
        {
          id: "action-4",
          location_label: "Paris 11e - Rue D",
          status: "approved",
        },
        {
          id: "action-5",
          location_label: "Paris 10e - Rue E",
          status: "rejected",
        },
      ],
      validatedActionIds: new Set(["action-1", "action-2", "action-3", "action-4"]),
      sensitiveAreas: ["10e"],
    });

    expect(summary.eligibleValidatedActions).toBe(3);
    expect(summary.sensitiveAreaCount).toBe(1);
    expect(summary.currentGrade.label).toBe("Topaze");
    expect(summary.nextLabel).toBe("Saphir");
    expect(summary.progressPercent).toBe(0);
  });
});
