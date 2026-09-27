import { describe, expect, it } from "vitest";
import type { PlannerActionHandoff } from "@/lib/route/route-operational";
import { createInitialFormState } from "../payload";
import { applyPlannerActionHandoffToForm } from "./action-declaration-draft.model";

describe("action declaration draft handoff model", () => {
  it("applies planner evidence and the three route labels to the form", () => {
    const handoff = {
      operationalRoute: {
        version: "operational-route-v1",
        initializedAt: "2026-09-27T10:00:00.000Z",
        updatedAt: "2026-09-27T10:00:00.000Z",
        source: "planner",
        state: "planner_copy",
        plannerGroupCount: 1,
        routes: [],
        zones: {
          departure: { label: "Départ", coordinate: null },
          midpoint: { label: "Milieu", coordinate: null },
          arrival: { label: "Arrivée", coordinate: null },
        },
      },
      routeCalibrationContext: null,
      plannerProof: null,
      expiresAt: "2026-09-28T10:00:00.000Z",
    } as PlannerActionHandoff;

    const result = applyPlannerActionHandoffToForm(
      createInitialFormState("Alex", "action"),
      handoff,
    );

    expect(result.operationalRoute).toBe(handoff.operationalRoute);
    expect(result.departureLocationLabel).toBe("Départ");
    expect(result.midRouteLocationLabel).toBe("Milieu");
    expect(result.arrivalLocationLabel).toBe("Arrivée");
  });
});
