import { describe, expect, it } from "vitest";
import { buildActionPreparationContext, resolvePreparationSelection } from "./action-preparation-context";

const handoff = {
  actionId: "action-42",
  operationalRoute: {
    version: "operational-route-v1" as const,
    initializedAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
    source: "planner" as const,
    state: "planner_copy" as const,
    plannerGroupCount: 1,
    routes: [],
    zones: {
      departure: { label: "Quai nord", coordinate: [2.35, 48.85] as [number, number] },
      midpoint: { label: null, coordinate: null },
      arrival: { label: null, coordinate: null },
    },
  },
  routeCalibrationContext: null,
  plannerProof: null,
  preparationData: { actionDate: "2026-09-20", departureTime: "09:00" },
  expiresAt: "2099-09-20T10:00:00.000Z",
};

describe("shared action preparation context", () => {
  it("keeps an existing action value ahead of draft and planner defaults", () => {
    const context = buildActionPreparationContext({
      action: {
        id: "action-42",
        actionDate: "2026-09-21",
        locationLabel: "Paris",
        departureLocationLabel: "Bercy",
        latitude: 48.84,
        longitude: 2.38,
        preparationData: { departureTime: "08:30" },
      } as never,
      draft: { actionDate: "2026-09-20", departureTime: "09:00", locationLabel: "Brouillon" },
      plannerHandoff: handoff,
    });

    expect(context.actionDate).toBe("2026-09-21");
    expect(context.departureTime).toBe("08:30");
    expect(context.locationLabel).toBe("Bercy");
    expect(context.latitude).toBe("48.84");
    expect(context.longitude).toBe("2.38");
    expect(context.plannerHandoff).toBe(handoff);
  });

  it("reports a conflict and only replaces it after an explicit decision", () => {
    const context = buildActionPreparationContext({ draft: { actionDate: "2026-09-21", departureTime: "08:00" } });
    const selection = { actionDate: "2026-09-22", departureTime: "09:00", source: "weather-slot" as const };

    expect(resolvePreparationSelection(context, selection).status).toBe("conflict");
    const replaced = resolvePreparationSelection(context, selection, "replace");
    expect(replaced.status).toBe("applied");
    expect(replaced.context.actionDate).toBe("2026-09-22");
    expect(replaced.context.departureTime).toBe("09:00");
    expect(replaced.context.confirmedSelection).toEqual(selection);
  });
});
