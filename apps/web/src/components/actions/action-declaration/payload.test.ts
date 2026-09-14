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
 form.organizerType = "association";
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

  it("keeps blank post-action measurements unknown and explicit zero measured", () => {
    const blankPayload = buildCreateActionPayload({
      form: createInitialFormState("Alice"),
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(blankPayload.wasteKg).toBeNull();
    expect(blankPayload.cigaretteButts).toBeNull();

    const zeroForm = createInitialFormState("Alice");
    zeroForm.wasteKg = "0";
    zeroForm.cigaretteButtsCount = "0";
    const zeroPayload = buildCreateActionPayload({
      form: zeroForm,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(zeroPayload.wasteKg).toBe(0);
    expect(zeroPayload.cigaretteButts).toBe(0);
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

  it("uses category sources for participants and keeps operational units separate", () => {
    const form = buildBaseForm();
    form.childrenCount = "2";
    form.adultCount = "4";
    form.retiredCount = "2";
    form.volunteersCount = "999";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.volunteersCount).toBe(8);
    expect(payload.volunteerParticipation).toMatchObject({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
    });
    expect(payload.volunteerParticipation).not.toHaveProperty("participantsCount");
    expect(payload.volunteerParticipation).not.toHaveProperty("effectiveVolunteerUnits");
    expect(payload.preparationData?.volunteerParticipation).toEqual({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
    });
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

  it("forwards the authenticated user metadata unchanged", () => {
    const form = buildBaseForm();
    const userMetadata = {
      userId: "user-test-123",
      username: "alice",
      displayName: "Alice Test",
      email: "alice@example.com",
    };

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
      userMetadata,
    });

    expect(payload.userMetadata).toEqual(userMetadata);
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
    expect(payload.geometrySource).toBe("manual");
 expect(payload.wasteBreakdown).toBeDefined();
 expect(payload.routeStyle).toBe("souple");
    expect(payload.routeAdjustmentMessage).toBe("Éviter l'avenue principale");
    expect(payload.notes).toContain("Collecte de test");
    expect(payload.notes).toContain("[EVENT_REF]EVENT-12345");
  });

  it("stores canonical waste expectations and supplements manual preparation notes", () => {
    const form = buildBaseForm();
    form.wasteCategories = ["broken_glass", "sharps"];
    form.safetyInstructions = "Consigne organisateur";
    form.recommendedMaterials = "Sacs renforcés";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.preparationData?.expectedWasteCategories).toEqual(["broken_glass", "sharps"]);
    expect(payload.preparationData?.safetyInstructions).toContain("Consigne organisateur");
    expect(payload.preparationData?.safetyInstructions).toContain("Balisser");
    expect(payload.preparationData?.recommendedMaterials).toContain("Gants anti-coupure");
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

  it("keeps the structure type separate from the organizer name", () => {
    const form = buildBaseForm();
    form.associationName = "Action spontanée";
    form.organizerType = "student_association";
    form.organizerAccounts = "club-etudiant";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.organizerType).toBe("student_association");
    expect(payload.associationName).toBe("Action spontanée");
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
    expect(payload.cigaretteButtsKg).toBe(2);
    expect(payload.wasteBreakdown).toMatchObject({
      recyclablesKg: null,
      glassKg: null,
      householdWasteKg: null,
      otherWasteKg: null,
    });
    expect(payload.wasteBreakdown).not.toHaveProperty("megotsKg");
  });

  it("sends raw measurements without client-derived provenance", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "";
    form.wasteMegotsKg = "1.2";
    form.wasteMegotsCondition = "propre";
    form.cigaretteButtsVolumeLiters = "2.5";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1.2,
      cigaretteButtsVolumeLiters: 2.5,
    });
    expect(payload.cigaretteButts).toBeNull();
    expect(payload.cigaretteButtsKg).toBe(1.2);
  });

  it("does not replace a counted value when a raw mass is also present", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "2500";
    form.wasteMegotsKg = "1.2";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButtsMeasurements?.cigaretteButtsCount).toBe(2500);
    expect(payload.cigaretteButtsMeasurements?.cigaretteButtsMassKg).toBe(1.2);
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
    expect(payload.geometrySource).toBe("routed");
  });

  it("uses the editable operational route as routed geometry without observations", () => {
    const form = buildBaseForm();
    form.operationalRoute = {
      version: "operational-route-v1",
      initializedAt: "2026-09-14T10:00:00.000Z",
      updatedAt: "2026-09-14T10:00:00.000Z",
      source: "planner",
      state: "planner_copy",
      plannerGroupCount: 2,
      routes: [
        {
          routeId: "planner-group-1",
          groupIndex: 1,
          geometry: { coordinates: [[48.85, 2.34], [48.851, 2.341]] },
          plannerTechnicalStops: [],
        },
        {
          routeId: "planner-group-2",
          groupIndex: 2,
          geometry: { coordinates: [[48.85, 2.34], [48.852, 2.342]] },
          plannerTechnicalStops: [],
        },
      ],
      zones: {
        departure: { label: null, coordinate: [48.85, 2.34] },
        midpoint: { label: null, coordinate: [48.851, 2.341] },
        arrival: { label: null, coordinate: [48.85, 2.34] },
      },
    } as unknown as NonNullable<typeof form.operationalRoute>;
    form.wasteKg = "";
    form.cigaretteButtsCount = "";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "quick",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
    });

    expect(payload.actionPhase).toBe("pre_action");
    expect(payload.geometrySource).toBe("routed");
    expect(payload.manualDrawing).toEqual({
      kind: "polyline",
      coordinates: [[48.85, 2.34], [48.851, 2.341]],
    });
    expect(payload.wasteKg).toBeNull();
    expect(payload.cigaretteButts).toBeNull();
    expect(payload.preparationData?.operationalRoute?.routes).toHaveLength(2);
  });

  it("preserves the resolved routed provenance of a snapped drawing", () => {
    const payload = buildCreateActionPayload({
      form: buildBaseForm(),
      declarationMode: "complete",
      effectiveManualDrawingEnabled: true,
      drawingIsValid: true,
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.85, 2.35],
          [48.851, 2.351],
        ],
      },
      manualDrawingSource: "routed",
      isEntrepriseMode: false,
    });

    expect(payload.geometrySource).toBe("routed");
  });

  it("keeps polygons manual even when an invalid routed source is supplied", () => {
    const payload = buildCreateActionPayload({
      form: buildBaseForm(),
      declarationMode: "complete",
      effectiveManualDrawingEnabled: true,
      drawingIsValid: true,
      manualDrawing: {
        kind: "polygon",
        coordinates: [
          [48.85, 2.35],
          [48.851, 2.351],
          [48.852, 2.35],
        ],
      },
      manualDrawingSource: "routed",
      isEntrepriseMode: false,
    });

    expect(payload.geometrySource).toBe("manual");
  });

 it("detects park-like labels", () => {
 expect(isLocationLikelyPark("Parc des Buttes-Chaumont")).toBe(true);
 expect(isLocationLikelyPark("Rue de Rivoli")).toBe(false);
 });
});
