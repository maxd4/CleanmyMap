import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import { buildSelectedActionCardModel } from "./actions-map-selected-card.utils";

describe("selected action card utils", () => {
  it("builds a compact summary for the selected action", () => {
    const contract = buildActionDataContract({
      id: "action-selected",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-12",
      locationLabel: "Rue de Rivoli",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: 12.4,
      cigaretteButts: 320,
      volunteersCount: 8,
      durationMinutes: 90,
      notes: "Sélection test",
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.856, 2.351],
          [48.8566, 2.3522],
          [48.857, 2.353],
        ],
      },
    });

    const item = toActionMapItem(contract);
    const summary = buildSelectedActionCardModel(item);

    expect(summary.id).toBe("action-selected");
    expect(summary.title).toBe("Rue de Rivoli");
    expect(summary.statusLabel).toBe("Validée");
    expect(summary.geometryModeLabel).toContain("Géométrie");
    expect(summary.geometryPointLabel).toBe("3 points");
    expect(summary.wasteLabel).toBe("12.4 kg");
    expect(summary.buttsLabel).toBe("320");
    expect(summary.volunteersLabel).toBe("8");
    expect(summary.durationLabel).toBe("90 min");
    expect(summary.coordinatesLabel).toContain("48.8566");
    expect(summary.notes).toBe("Sélection test");
  });
});
