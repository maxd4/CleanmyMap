import { describe, expect, it } from "vitest";
import {
  applyPreparationDataToForm,
  buildCreateActionPayload,
  createInitialFormState,
} from "./payload";
import { deriveRouteTargetDistanceKm } from "@/lib/actions/route-target-distance";
import { buildBaseForm } from "./payload.test-fixtures";

describe("action declaration payload temporalité", () => {
  it("derives an editable route target from duration and ignores legacy unproven values", () => {
    expect(deriveRouteTargetDistanceKm(60)).toBe(1);
    expect(deriveRouteTargetDistanceKm(90)).toBe(1.5);

    const form = createInitialFormState("Alice");
    const prepared = applyPreparationDataToForm(form, {
      estimatedDurationMinutes: 90,
      routeTargetDistanceKm: 2.25,
    });

    expect(prepared.routeTargetDistanceKm).toBe("1.5");
    expect(prepared.routeTargetDistanceKmManuallySet).toBe(false);
  });

  it("prefills empty temporal fields from a planner but never overwrites entered values", () => {
    const emptyForm = createInitialFormState("Alice");
    const fromPlanner = applyPreparationDataToForm(emptyForm, {
      actionDate: "2026-10-12",
      meetingTime: "09:00",
      departureTime: "09:15",
      estimatedDurationMinutes: 45,
    });

    expect(fromPlanner.actionDate).toBe("2026-10-12");
    expect(fromPlanner.meetingTime).toBe("09:00");
    expect(fromPlanner.departureTime).toBe("09:15");
    expect(fromPlanner.durationMinutes).toBe("45");

    const enteredForm = {
      ...emptyForm,
      actionDate: "2026-10-13",
      meetingTime: "10:00",
      departureTime: "10:15",
      durationMinutes: "60",
      eventStartTime: "10:00",
      eventEndTime: "11:30",
    };
    const preserved = applyPreparationDataToForm(enteredForm, {
      actionDate: "2026-10-12",
      meetingTime: "09:00",
      departureTime: "09:15",
      estimatedDurationMinutes: 45,
    });

    expect(preserved.actionDate).toBe("2026-10-13");
    expect(preserved.meetingTime).toBe("10:00");
    expect(preserved.departureTime).toBe("10:15");
    expect(preserved.durationMinutes).toBe("60");
    expect(preserved.eventStartTime).toBe("10:00");
    expect(preserved.eventEndTime).toBe("11:30");
  });

  it("persists a derived target with its source and policy version", () => {
    const form = createInitialFormState("Alice");
    form.durationMinutes = "90";
    form.routeTargetDistanceKm = "1.75";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.preparationData?.routeTargetDistanceKm).toBe(1.5);
    expect(payload.preparationData?.routeTargetDistanceSource).toBe("derived");
    expect(payload.preparationData?.routeTargetDistancePolicyVersion).toBe("route-distance-v1");
  });

  it("persists a manual target without a policy version", () => {
    const form = createInitialFormState("Alice");
    form.durationMinutes = "90";
    form.routeTargetDistanceKm = "1.75";
    form.routeTargetDistanceKmManuallySet = true;

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.preparationData?.routeTargetDistanceKm).toBe(1.75);
    expect(payload.preparationData?.routeTargetDistanceSource).toBe("manual");
    expect(payload.preparationData?.routeTargetDistancePolicyVersion).toBeUndefined();
  });

  it("keeps action time canonical and carries an optional event window", () => {
    const form = buildBaseForm();
    form.eventStartTime = "09:00";
    form.eventEndTime = "10:45";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.durationMinutes).toBe(75);
    expect(payload.eventStartTime).toBe("09:00");
    expect(payload.eventEndTime).toBe("10:45");
    expect(payload.preparationData).not.toHaveProperty("estimatedDurationMinutes");
  });
});
