import { describe, expect, it } from "vitest";
import {
  buildActionDataContract,
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
