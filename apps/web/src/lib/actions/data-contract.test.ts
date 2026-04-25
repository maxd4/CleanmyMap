import { describe, expect, it } from "vitest";
import {
  buildActionDataContract,
  getActionOperationalContext,
  mapItemDrawing,
  mapItemShouldRenderPoint,
  normalizeCreatePayload,
  toActionMapItem,
  toContractCreatePayload,
} from "./data-contract";

describe("action data contract", () => {
  it("maps polygon geometry to map payload without breaking point fields", () => {
    const contract = buildActionDataContract({
      id: "action-1",
      type: "action",
      status: "pending",
      source: "actions",
      observedAt: "2026-04-08",
      createdAt: "2026-04-08T10:00:00.000Z",
      locationLabel: "Paris 10e",
      latitude: 48.87,
      longitude: 2.36,
      wasteKg: 12.5,
      cigaretteButts: 120,
      volunteersCount: 4,
      durationMinutes: 55,
      actorName: "Max",
      associationName: "Action spontanee",
      notes: "zone dense",
      notesPlain: "zone dense",
      manualDrawing: {
        kind: "polygon",
        coordinates: [
          [48.87, 2.36],
          [48.871, 2.361],
          [48.872, 2.362],
        ],
      },
      manualDrawingGeoJson:
        '{"type":"Polygon","coordinates":[[[2.36,48.87],[2.361,48.871],[2.362,48.872]]]}',
    });

    const mapItem = toActionMapItem(contract);
    expect(mapItem.latitude).toBe(48.87);
    expect(mapItem.longitude).toBe(2.36);
    expect(mapItem.contract?.metadata.associationName).toBe("Action spontanee");
    expect(mapItem.manual_drawing?.kind).toBe("polygon");
    expect(mapItem.manual_drawing?.coordinates.length).toBe(3);
    expect(mapItem.manual_drawing_geojson).toContain('"Polygon"');
    expect(mapItem.contract?.geometry.kind).toBe("polygon");
    expect(mapItem.contract?.geometry.confidence).toBe(1);
    expect(mapItem.contract?.geometry.geometrySource).toBe("manual");
    expect(mapItem.contract?.geometry.origin).toBe("manual");
  });

  it("keeps geometry optional when normalizing create payload", () => {
    const normalized = normalizeCreatePayload({
      type: "action",
      source: "web_form",
      location: { label: "Paris 11e" },
      dates: { observedAt: "2026-04-08" },
      metadata: {
        associationName: "Entreprise",
        wasteKg: 2.2,
        volunteersCount: 1,
      },
    });

    expect(normalized.locationLabel).toBe("Paris 11e");
    expect(normalized.associationName).toBe("Entreprise");
    expect(normalized.manualDrawing).toBeUndefined();
  });

  it("prefers normalized contract geometry over missing legacy manual drawing", () => {
    const contract = buildActionDataContract({
      id: "action-geometry-only",
      type: "action",
      status: "approved",
      source: "google_sheet_sync",
      observedAt: "2026-04-08",
      locationLabel: "Paris 19e",
      latitude: 48.88,
      longitude: 2.38,
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.88, 2.38],
          [48.881, 2.381],
        ],
      },
    });

    const mapItem = {
      ...toActionMapItem(contract),
      manual_drawing: null,
    };

    expect(mapItemDrawing(mapItem)?.kind).toBe("polyline");
    expect(mapItemDrawing(mapItem)?.coordinates).toEqual([
      [48.88, 2.38],
      [48.881, 2.381],
    ]);
    expect(mapItemShouldRenderPoint(mapItem)).toBe(false);
    expect(mapItem.contract?.geometry.origin).toBe("manual");
  });

  it("marks reference geometry as real", () => {
    const contract = buildActionDataContract({
      id: "action-reference",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "Jardin du Luxembourg",
      latitude: null,
      longitude: null,
    });

    expect(contract.geometry.kind).toBe("polygon");
    expect(contract.geometry.origin).toBe("reference");
  });

  it("keeps point geometry only as a last resort when nothing exploitable exists", () => {
    const contract = buildActionDataContract({
      id: "action-point-only",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "Paris 20e",
      latitude: null,
      longitude: null,
    });

    const mapItem = toActionMapItem(contract);

    expect(mapItemDrawing(mapItem)).toBeNull();
    expect(mapItemShouldRenderPoint(mapItem)).toBe(false);
    expect(mapItem.contract?.geometry.kind).toBe("point");
    expect(mapItem.contract?.geometry.confidence).toBeGreaterThan(0);
    expect(mapItem.contract?.geometry.geometrySource).toBe("fallback_point");
    expect(mapItem.contract?.geometry.origin).toBe("fallback_point");
  });

  it("derives at least a polyline when departure and arrival labels exist", () => {
    const contract = buildActionDataContract({
      id: "action-derived-route",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "Rue A → Rue B",
      departureLocationLabel: "Rue A, 75020 Paris",
      arrivalLocationLabel: "Rue B, 75020 Paris",
      routeStyle: "souple",
      latitude: 48.871,
      longitude: 2.381,
    });

    const mapItem = toActionMapItem(contract);

    expect(mapItem.contract?.geometry.kind).toBe("polyline");
    expect(mapItem.contract?.geometry.coordinates.length).toBeGreaterThanOrEqual(3);
    expect(mapItemShouldRenderPoint(mapItem)).toBe(false);
    expect(mapItem.contract?.geometry.geometrySource).toBe("routed");
    expect(mapItem.contract?.geometry.origin).toBe("routed");
  });

  it("derives a compact polygon when one precise location label exists", () => {
    const contract = buildActionDataContract({
      id: "action-precise-place",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "8 Rue Pierre Foncin, 75020 Paris",
      latitude: 48.866769,
      longitude: 2.409144,
    });

    const mapItem = toActionMapItem(contract);

    expect(mapItem.contract?.geometry.kind).toBe("polygon");
    expect(mapItem.contract?.geometry.coordinates.length).toBeGreaterThanOrEqual(8);
    expect(mapItemShouldRenderPoint(mapItem)).toBe(false);
    expect(mapItem.contract?.geometry.geometrySource).toBe("estimated_area");
    expect(mapItem.contract?.geometry.origin).toBe("estimated_area");
  });

  it("exposes operational context fields for dashboards and exports", () => {
    const contract = buildActionDataContract({
      id: "action-context",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "Rue d'exemple",
      latitude: 48.86,
      longitude: 2.34,
      placeType: "N° Boulevard/Avenue/Place",
      routeStyle: "souple",
      routeAdjustmentMessage: "Contourner l'avenue principale",
      volunteersCount: 6,
      durationMinutes: 75,
    });

    const context = getActionOperationalContext(contract);

    expect(context.placeType).toBe("N° Boulevard/Avenue/Place");
    expect(context.routeStyle).toBe("souple");
    expect(context.routeAdjustmentMessage).toBe("Contourner l'avenue principale");
    expect(context.volunteersCount).toBe(6);
    expect(context.durationMinutes).toBe(75);
    expect(context.engagementMinutes).toBe(450);
    expect(context.engagementHours).toBe(7.5);
    expect(context.routeStyleLabel).toBe("Trajet souple");
  });

  it("derives an intervention ellipse when only coordinates exist", () => {
    const contract = buildActionDataContract({
      id: "action-coords-only",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "",
      latitude: 48.87,
      longitude: 2.4,
    });

    const mapItem = toActionMapItem(contract);

    expect(mapItem.contract?.geometry.kind).toBe("polygon");
    expect(mapItem.contract?.geometry.coordinates.length).toBeGreaterThanOrEqual(8);
    expect(mapItemShouldRenderPoint(mapItem)).toBe(false);
  });

  it("builds contract create payload from legacy create payload", () => {
    const contractPayload = toContractCreatePayload({
      actorName: "Max",
      associationName: "Entreprise",
      actionDate: "2026-04-08",
      locationLabel: "Canal Saint-Martin",
      wasteKg: 5,
      cigaretteButts: 45,
      volunteersCount: 2,
      durationMinutes: 40,
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.87, 2.36],
          [48.871, 2.362],
        ],
      },
    });

    expect(contractPayload.type).toBe("action");
    expect(contractPayload.metadata.associationName).toBe("Entreprise");
    expect(contractPayload.location.label).toBe("Canal Saint-Martin");
    expect(contractPayload.geometry?.kind).toBe("polyline");
    expect(contractPayload.geometry?.coordinates.length).toBe(2);
  });
});
