import { describe, expect, it } from"vitest";
import {
 buildCreateActionPayload,
 createInitialFormState,
 isDrawingValid,
 isLocationLikelyPark,
 prepareCreateActionPayload,
 parseOrganizerAccounts,
 toOptionalNumber,
 toRequiredNumber,
} from"./payload";
import type { ActionDrawing } from"@/lib/actions/types";

function buildBaseForm() {
 const form = createInitialFormState("Alice");
 form.locationLabel ="Jardin du Luxembourg";
 form.latitude ="48.8462";
 form.longitude ="2.3372";
 form.wasteKg ="12.7";
 form.wasteMegotsKg ="1.5";
 form.wasteMegotsCondition ="propre";
 form.volunteersCount ="5";
 form.durationMinutes ="75";
 form.notes ="Collecte de test";
 form.routeAdjustmentMessage ="Éviter l'avenue principale";
 return form;
}

describe("action declaration payload helpers", () => {
  it("parses optional/required numbers safely", () => {
    expect(toOptionalNumber("")).toBeUndefined();
    expect(toOptionalNumber("12.5")).toBe(12.5);
    expect(toOptionalNumber("abc")).toBeUndefined();

 expect(toRequiredNumber("10", 0)).toBe(10);
    expect(toRequiredNumber("invalid", 3)).toBe(3);
  });

  it("normalizes organizer account tokens before payload creation", () => {
    expect(parseOrganizerAccounts("  @alice, bob ; alice\ncarol  ")).toEqual([
      "alice",
      "bob",
      "carol",
    ]);

    const form = buildBaseForm();
    form.associationName = "Association Sans Murs Paris 15";
    form.organizerAccounts = "alice, bob, alice";

    const payload = buildCreateActionPayload({
      form,
      declarationMode:"complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.organizerAccounts).toEqual(["alice", "bob"]);
  });

 it("validates drawing minima by kind", () => {
 const polyline: ActionDrawing = {
 kind:"polyline",
 coordinates: [[48.85, 2.35]],
 };
 const polygon: ActionDrawing = {
 kind:"polygon",
 coordinates: [
 [48.85, 2.35],
 [48.851, 2.351],
 ],
 };
 expect(isDrawingValid(polyline)).toBe(false);
 expect(isDrawingValid(polygon)).toBe(false);
 expect(
 isDrawingValid({
 kind:"polyline",
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
      kind:"polygon",
      coordinates: [
 [48.85, 2.35],
 [48.86, 2.36],
 [48.87, 2.37],
 ],
 };

 const payload = buildCreateActionPayload({
 form,
 declarationMode:"complete",
 effectiveManualDrawingEnabled: true,
 drawingIsValid: true,
 manualDrawing: drawing,
 isEntrepriseMode: false,
 linkedEventId:"EVENT-12345",
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

  it("keeps the record type in the payload", () => {
    const form = buildBaseForm();
    form.recordType = "clean_place";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.recordType).toBe("clean_place");
  });

  it("normalizes the other volunteer UI sentinel before payload creation", () => {
    const form = buildBaseForm();
    form.actorName = "Bénévole invité";
    form.associationName = "__autre_benevole__";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.actorName).toBe("Bénévole invité");
    expect(payload.associationName).toBe("Action spontanée");
  });

  it("drops organizer accounts for spontaneous actions", () => {
    const form = buildBaseForm();
    form.associationName = "Action spontanée";
    form.organizerAccounts = "alice, bob";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.associationName).toBe("Action spontanée");
    expect(payload.organizerAccounts).toBeUndefined();
  });

  it("normalizes duplicate drawing points before building the payload", () => {
    const form = buildBaseForm();
    const drawing: ActionDrawing = {
      kind: "polyline",
      coordinates: [
        [48.85, 2.35],
        [48.85, 2.35],
        [48.86, 2.36],
      ],
    };

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: true,
      drawingIsValid: true,
      manualDrawing: drawing,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.manualDrawing).toEqual({
      kind: "polyline",
      coordinates: [
        [48.85, 2.35],
        [48.86, 2.36],
      ],
    });
    expect(payload.latitude).toBeCloseTo(48.855, 6);
    expect(payload.longitude).toBeCloseTo(2.355, 6);
  });

  it("keeps synchronized megots count and weight coherent in the payload", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "10000";
    form.wasteMegotsKg = "2.000";
    form.wasteMegotsCondition = "propre";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButts).toBe(10000);
    expect(payload.cigaretteButtsCount).toBe(10000);
    expect(payload.wasteBreakdown?.megotsKg).toBe(2);
    expect(payload.wasteBreakdown?.megotsCondition).toBe("propre");
  });

  it("prefers a ready route preview before submission", async () => {
    const form = buildBaseForm();
    form.departureLocationLabel ="Place des Vosges";
    form.arrivalLocationLabel ="Rue de Rivoli";

 const previewDrawing: ActionDrawing = {
 kind:"polyline",
 coordinates: [
 [48.855, 2.36],
 [48.856, 2.361],
 [48.857, 2.362],
 ],
 };

 const payload = await prepareCreateActionPayload({
 form,
 declarationMode:"complete",
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
