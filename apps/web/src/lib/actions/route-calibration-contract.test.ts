import { describe, expect, it } from "vitest";
import { toContractCreatePayload } from "./contracts/contract-builders";
import { createActionSchema } from "@/lib/validation/action";
import { buildRouteCalibrationContext } from "@/lib/route/route-calibration";

const routeContext = buildRouteCalibrationContext({
  generatedAt: "2026-09-01T09:00:00.000Z",
  routeEngineVersion: "route-planner-v2",
  volunteersExpected: 3,
  groupCount: 1,
  candidates: [],
});

const payload = {
  associationName: "Action spontanée",
  organizerType: "association" as const,
  actionDate: "2026-09-02",
  locationLabel: "Paris",
  wasteKg: 0,
  cigaretteButts: 0,
  volunteersCount: 3,
  durationMinutes: 60,
  routeCalibrationContext: routeContext,
};

describe("route calibration action handoff", () => {
  it("carries the exact route context into preparationData", () => {
    const contract = toContractCreatePayload(payload);

    expect(contract.metadata.preparationData?.routeCalibrationContext).toEqual(routeContext);
  });

  it("validates the context at the action API boundary", () => {
    const contract = toContractCreatePayload(payload);
    const parsed = createActionSchema.safeParse(contract);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.preparationData?.routeCalibrationContext).toEqual(routeContext);
    }
  });

  it("keeps the context on the legacy-compatible creation path", () => {
    const parsed = createActionSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.preparationData?.routeCalibrationContext).toEqual(routeContext);
    }
  });
});
