import type { ActionDrawing } from "@/lib/actions/types";

export const DRAWING_NOTE_PREFIX = "[DRAWING_GEOJSON]";

export type ParsedDrawingNotes = {
  cleanNotes: string | null;
  manualDrawing: ActionDrawing | null;
  drawingJson: string | null;
};

function normalizeCoordinates(input: unknown): [number, number][] | null {
  if (!Array.isArray(input)) {
    return null;
  }
  const points: [number, number][] = [];
  for (const rawPoint of input) {
    if (!Array.isArray(rawPoint) || rawPoint.length < 2) {
      return null;
    }
    const lat = Number(rawPoint[0]);
    const lng = Number(rawPoint[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  return points;
}

function normalizeDrawing(raw: unknown): ActionDrawing | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const kind = (raw as { kind?: unknown }).kind;
  const coordinates = normalizeCoordinates((raw as { coordinates?: unknown }).coordinates);
  if (!coordinates || (kind !== "polyline" && kind !== "polygon")) {
    return null;
  }
  const minPoints = kind === "polygon" ? 3 : 2;
  if (coordinates.length < minPoints) {
    return null;
  }
  return {
    kind,
    coordinates,
  };
}

export function parseDrawingFromNotes(notes: string | null | undefined): ParsedDrawingNotes {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return { cleanNotes: null, manualDrawing: null, drawingJson: null };
  }

  const markerIndex = raw.lastIndexOf(DRAWING_NOTE_PREFIX);
  if (markerIndex < 0) {
    return { cleanNotes: raw, manualDrawing: null, drawingJson: null };
  }

  const body = raw.slice(0, markerIndex).trim();
  const drawingJson = raw.slice(markerIndex + DRAWING_NOTE_PREFIX.length).trim();
  if (!drawingJson) {
    return { cleanNotes: body || null, manualDrawing: null, drawingJson: null };
  }

  try {
    const parsed = JSON.parse(drawingJson);
    const manualDrawing = normalizeDrawing(parsed);
    return {
      cleanNotes: body || null,
      manualDrawing,
      drawingJson: manualDrawing ? drawingJson : null,
    };
  } catch {
    return {
      cleanNotes: body || null,
      manualDrawing: null,
      drawingJson: null,
    };
  }
}

export function toGeoJsonString(drawing: ActionDrawing | null): string | null {
  if (!drawing) {
    return null;
  }
  if (drawing.kind === "polyline") {
    return JSON.stringify({
      type: "LineString",
      coordinates: drawing.coordinates.map(([lat, lng]) => [lng, lat]),
    });
  }
  return JSON.stringify({
    type: "Polygon",
    coordinates: [drawing.coordinates.map(([lat, lng]) => [lng, lat])],
  });
}
