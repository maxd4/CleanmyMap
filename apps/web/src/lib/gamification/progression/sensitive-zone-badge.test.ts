import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import {
  computeSensitiveZoneApaisementSummary,
  deriveSensitiveAreasFromContracts,
} from "./sensitive-zone-badge";
import { SENSITIVE_ZONE_RULE_VERSION } from "./sensitive-zone-qualification";

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
          locationLabel: `Lyon 10e - Rue ${index}`,
          observedAt: "2026-05-10",
          wasteKg: 18,
        }),
      ),
      buildContract({
        id: "zone-11-1",
        locationLabel: "Lyon 11e - Rue B",
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
  it("summarizes validated sensitive-zone evidence without an XP award", () => {
    const summary = computeSensitiveZoneApaisementSummary({
      qualifications: [
        {
          actionId: "action-1",
          qualified: true,
          area: "10e",
          ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
          assessedAt: "2026-01-01T00:00:00.000Z",
          actionDate: "2026-01-01",
        },
        {
          actionId: "action-2",
          qualified: true,
          area: "10e",
          ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
          assessedAt: "2026-01-01T00:00:00.000Z",
          actionDate: "2026-01-02",
        },
        {
          actionId: "action-3",
          qualified: true,
          area: "10e",
          ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
          assessedAt: "2026-01-01T00:00:00.000Z",
          actionDate: "2026-01-03",
        },
        {
          actionId: "action-4",
          qualified: false,
          area: "11e",
          ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
          assessedAt: "2026-01-01T00:00:00.000Z",
          actionDate: "2026-01-04",
        },
        {
          actionId: "action-5",
          qualified: false,
          area: "10e",
          ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
          assessedAt: "2026-01-01T00:00:00.000Z",
          actionDate: "2026-01-05",
        },
      ],
    });

    expect(summary.eligibleValidatedActions).toBe(3);
    expect(summary.sensitiveAreaCount).toBe(1);
    expect(summary.currentGrade.label).toBe("Topaze");
    expect(summary.nextLabel).toBe("Saphir");
    expect(summary.progressPercent).toBe(0);
    expect(summary.currentGrade.xp).toBe(0);
    expect(summary.nextGrade?.xp).toBe(0);
  });
});
