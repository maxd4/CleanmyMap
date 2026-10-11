import { describe, expect, it } from "vitest";
import {
  buildCreateActionPayload,
  buildPreparationDataFromForm,
  createInitialFormState,
  isDrawingValid,
  isLocationLikelyPark,
  prepareCreateActionPayload,
} from "./payload";
import type { ActionDrawing } from "@/lib/actions/types";
import { createActionInterventionMode } from "@/lib/actions/intervention-mode";
import { buildBaseForm } from "./payload.test-fixtures";

describe("action declaration payload géométrie", () => {
  it("keeps a fixed-area collection free of route topology, distance and route geometry", () => {
    const form = buildBaseForm();
    form.interventionMode = createActionInterventionMode("fixed_area");
    form.routeTopology = "point_to_point";
    form.arrivalLocationLabel = "Arrivée fictive";
    form.routeTargetDistanceKm = "4";
    form.operationalRoute = { routes: [{ geometry: { coordinates: [[48.85, 2.35], [48.86, 2.36]] } }] } as never;

    const preparation = buildPreparationDataFromForm(form);
    const payload = buildCreateActionPayload({
      form,
      declarationMode: "quick",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(preparation.interventionMode).toEqual(createActionInterventionMode("fixed_area"));
    expect(preparation).not.toHaveProperty("routeTopology");
    expect(preparation).not.toHaveProperty("routeTargetDistanceKm");
    expect(preparation).not.toHaveProperty("operationalRoute");
    expect(payload.routeTopology).toBeUndefined();
    expect(payload.arrivalLocationLabel).toBeUndefined();
  });

  it("keeps selected route endpoint coordinates for server reconstruction", () => {
    const form = createInitialFormState("Alice");
    form.departureLocationLabel = "Départ, Paris";
    form.latitude = "48.850000";
    form.longitude = "2.350000";
    form.midRouteLocationLabel = "Mi-parcours, Paris";
    form.midRouteCoordinates = { latitude: 48.86, longitude: 2.36 };
    form.routeTopology = "point_to_point";
    form.arrivalLocationLabel = "Arrivée, Paris";
    form.arrivalCoordinates = { latitude: 48.87, longitude: 2.37 };

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.latitude).toBe(48.85);
    expect(payload.longitude).toBe(2.35);
    expect(payload.preparationData?.midRouteCoordinates).toEqual({
      latitude: 48.86,
      longitude: 2.36,
    });
    expect(payload.preparationData?.arrivalCoordinates).toEqual({
      latitude: 48.87,
      longitude: 2.37,
    });
  });

  it("keeps pre-action rendez-vous coordinates when an operational route is present", () => {
    const form = createInitialFormState("Alice");
    form.actionTitle = "Boucle test";
    form.departureLocationLabel = "Départ sélectionné, Paris";
    form.latitude = "48.850000";
    form.longitude = "2.350000";
    form.operationalRoute = {
      version: "operational-route-v1",
      initializedAt: "2026-10-09T09:00:00.000Z",
      updatedAt: "2026-10-09T09:00:00.000Z",
      source: "planner",
      state: "planner_copy",
      plannerGroupCount: 1,
      routes: [{
        routeId: "planner-group-1",
        groupIndex: 1,
        geometry: {
          isLoop: true,
          origin: [48.85, 2.35],
          returnLeg: null,
          coordinates: [[48.85, 2.35], [48.86, 2.36]],
          distanceKm: 1,
          durationMinutes: 10,
          legs: [],
          provider: "none",
          profile: null,
          mode: "fallback",
          estimated: true,
        },
        plannerTechnicalStops: [],
      }],
      zones: {
        departure: { label: "Départ planner", coordinate: [48.85, 2.35] },
        midpoint: { label: "Mi-parcours", coordinate: [48.855, 2.355] },
        arrival: { label: "Retour", coordinate: [48.85, 2.35] },
      },
    };

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "quick",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.latitude).toBe(48.85);
    expect(payload.longitude).toBe(2.35);
    expect(payload.preparationData?.operationalRoute).toBeDefined();
  });

  it("sends the explicit point-to-point topology and keeps loop payloads arrival-free", () => {
    const pointForm = createInitialFormState("Alice");
    pointForm.routeTopology = "point_to_point";
    pointForm.departureLocationLabel = "Départ, Paris";
    pointForm.arrivalLocationLabel = "Arrivée, Paris";
    const pointPayload = buildCreateActionPayload({
      form: pointForm,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });
    expect(pointPayload.routeTopology).toBe("point_to_point");
    expect(pointPayload.preparationData?.routeTopology).toBe("point_to_point");
    expect(pointPayload.arrivalLocationLabel).toBe("Arrivée, Paris");

    const loopForm = { ...pointForm, routeTopology: "loop" as const };
    const loopPayload = buildCreateActionPayload({
      form: loopForm,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });
    expect(loopPayload.routeTopology).toBe("loop");
    expect(loopPayload.arrivalLocationLabel).toBeUndefined();
    expect(loopPayload.preparationData?.zoneCiblePrevue).toBeUndefined();
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
    expect(payload.geometrySource).toBe("manual");
    expect(payload.wasteBreakdown).toBeDefined();
    expect(payload.routeStyle).toBe("souple");
    expect(payload.routeAdjustmentMessage).toBe("Éviter l'avenue principale");
    expect(payload.notes).toContain("Collecte de test");
    expect(payload.notes).toContain("[EVENT_REF]EVENT-12345");
  });

  it("clears a residual arrival from an ordinary loop payload", () => {
    const form = buildBaseForm();
    form.routeTopology = "loop";
    form.arrivalLocationLabel = "Ancienne arrivée";
    form.arrivalCoordinates = { latitude: 48.87, longitude: 2.37 };

    const preparation = buildPreparationDataFromForm(form);
    expect(preparation.routeTopology).toBe("loop");
    expect(preparation.zoneCiblePrevue).toBeUndefined();
    expect(preparation.arrivalCoordinates).toBeUndefined();
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
    expect(payload.geometrySource).toBe("routed");
  });

  it("keeps a validated GPX ahead of a previous manual or route-preview drawing", async () => {
    const form = buildBaseForm();
    form.routeTopology = "loop";
    form.gpxImport = {
      source: "gpx_import",
      observedDistanceKm: 2.35,
      pointCount: 3,
      inferredTopology: "loop",
      fileName: "terrain.gpx",
    };
    const gpxDrawing: ActionDrawing = {
      kind: "polyline",
      coordinates: [
        [48.85, 2.35],
        [48.86, 2.36],
        [48.85, 2.35],
      ],
    };

    const payload = await prepareCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: true,
      drawingIsValid: true,
      manualDrawing: gpxDrawing,
      manualDrawingSource: "gpx_import",
      routePreviewDrawing: {
        kind: "polyline",
        coordinates: [[48.8, 2.3], [48.81, 2.31]],
      },
      isEntrepriseMode: false,
    });

    expect(payload.geometrySource).toBe("gpx_import");
    expect(payload.manualDrawing).toEqual(gpxDrawing);
    expect(payload.preparationData?.gpxImport).toMatchObject({
      source: "gpx_import",
      observedDistanceKm: 2.35,
      fileName: "terrain.gpx",
    });
    expect(payload.preparationData?.routeTargetDistanceKm).toBe(1.25);
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
