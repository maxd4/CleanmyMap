import { describe, expect, it } from "vitest";
import {
  buildCreateActionPayload,
  createInitialFormState,
  isDrawingValid,
  isLocationLikelyPark,
  prepareCreateActionPayload,
  toOptionalNumber,
  toRequiredNumber,
} from "./payload";
import type { ActionDrawing } from "@/lib/actions/types";

function buildBaseForm() {
  const form = createInitialFormState("Alice");
  form.locationLabel = "Jardin du Luxembourg";
  form.latitude = "48.8462";
  form.longitude = "2.3372";
  form.wasteKg = "12.7";
  form.wasteMegotsKg = "1.5";
  form.wasteMegotsCondition = "propre";
  form.volunteersCount = "5";
  form.durationMinutes = "75";
  form.notes = "Collecte de test";
  form.routeAdjustmentMessage = "Éviter l'avenue principale";
  return form;
}

describe("action declaration payload helpers", () => {
  it("parses optional/required numbers safely", () => {
    expect(toOptionalNumber("  ")).toBeUndefined();
    expect(toOptionalNumber("12.5")).toBe(12.5);
    expect(toOptionalNumber("abc")).toBeUndefined();

    expect(toRequiredNumber("10", 0)).toBe(10);
    expect(toRequiredNumber("invalid", 3)).toBe(3);
  });

  it("validates drawing minima by kind", () => {
    const polyline: ActionDrawing = {
      kind: "polyline",
      coordinates: [[48.85, 2.35]],
    };
    const polygon: ActionDrawing = {
      kind: "polygon",
      coordinates: [
        [48.85, 2.35],
        [48.851, 2.351],
      ],
    };
    expect(isDrawingValid(polyline)).toBe(false);
    expect(isDrawingValid(polygon)).toBe(false);
    expect(
      isDrawingValid({
        kind: "polyline",
        coordinates: [
          [48.85, 2.35],
          [48.851, 2.351],
        ],
      }),
    ).toBe(true);
  });

  it("builds complete mode payload with drawing centroid and breakdown", () => {
    const form = buildBaseForm();
    const drawing: ActionDrawing = {
      kind: "polygon",
      coordinates: [
        [48.85, 2.35],
        [48.86, 2.36],
        [48.87, 2.37],
      ],
    };

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: true,
      drawingIsValid: true,
      manualDrawing: drawing,
      isEntrepriseMode: false,
      linkedEventId: "EVENT-12345",
    });

    expect(payload.latitude).toBeCloseTo(48.86, 6);
    expect(payload.longitude).toBeCloseTo(2.36, 6);
    expect(payload.manualDrawing).toEqual(drawing);
    expect(payload.wasteBreakdown).toBeDefined();
    expect(payload.routeStyle).toBe("souple");
    expect(payload.routeAdjustmentMessage).toBe("Éviter l'avenue principale");
    expect(payload.notes).toContain("Collecte de test");
    expect(payload.notes).toContain("[EVENT_REF]EVENT-12345");
  });

  it("builds quick mode payload without geo/breakdown and with butts reset", () => {
    const form = buildBaseForm();
    form.departureLocationLabel = "Place des Vosges";
    form.arrivalLocationLabel = "";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "quick",
      effectiveManualDrawingEnabled: true,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: "EVENT-12345",
      photos: [],
      visionEstimate: null,
    });

    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
    expect(payload.departureLocationLabel).toBe("Place des Vosges");
    expect(payload.arrivalLocationLabel).toBeUndefined();
    expect(payload.cigaretteButts).toBe(0);
    expect(payload.durationMinutes).toBe(0);
    expect(payload.wasteBreakdown).toBeUndefined();
    expect(payload.notes).toContain("Collecte de test");
    expect(payload.notes).toContain("[EVENT_REF]EVENT-12345");
  });

  it("prefers a ready route preview before submission", async () => {
    const form = buildBaseForm();
    form.departureLocationLabel = "Place des Vosges";
    form.arrivalLocationLabel = "Rue de Rivoli";

    const previewDrawing: ActionDrawing = {
      kind: "polyline",
      coordinates: [
        [48.855, 2.36],
        [48.856, 2.361],
        [48.857, 2.362],
      ],
    };

    const payload = await prepareCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      routePreviewDrawing: previewDrawing,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.manualDrawing).toEqual(previewDrawing);
  });

  it("detects park-like labels", () => {
    expect(isLocationLikelyPark("Parc des Buttes-Chaumont")).toBe(true);
    expect(isLocationLikelyPark("Rue de Rivoli")).toBe(false);
  });
});
