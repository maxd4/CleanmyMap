import type { ActionDrawing } from "@/lib/actions/types";
import { stripEventRefFromNotes } from "./event-link";

export const DRAWING_NOTE_PREFIX = "[DRAWING_GEOJSON]";
const INGESTION_SYNC_MARKER = "[google-sheet-sync]";

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
  const coordinates = normalizeCoordinates(
    (raw as { coordinates?: unknown }).coordinates,
  );
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

export function parseDrawingFromNotes(
  notes: string | null | undefined,
): ParsedDrawingNotes {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return { cleanNotes: null, manualDrawing: null, drawingJson: null };
  }

  const lines = raw.split(/\r?\n/);
  while (
    lines.length > 0 &&
    lines[lines.length - 1].trim() === INGESTION_SYNC_MARKER
  ) {
    lines.pop();
  }
  const normalizedRaw = lines.join("\n").trim();
  const markerIndex = normalizedRaw.lastIndexOf(DRAWING_NOTE_PREFIX);
  if (markerIndex < 0) {
    return {
      cleanNotes: stripEventRefFromNotes(normalizedRaw),
      manualDrawing: null,
      drawingJson: null,
    };
  }

  const body = normalizedRaw.slice(0, markerIndex).trim();
  const drawingJson = normalizedRaw
    .slice(markerIndex + DRAWING_NOTE_PREFIX.length)
    .trim();
  if (!drawingJson) {
    return { cleanNotes: body || null, manualDrawing: null, drawingJson: null };
  }

  try {
    const parsed = JSON.parse(drawingJson);
    const manualDrawing = normalizeDrawing(parsed);
    return {
      cleanNotes: stripEventRefFromNotes(body),
      manualDrawing,
      drawingJson: manualDrawing ? drawingJson : null,
    };
  } catch {
    return {
      cleanNotes: stripEventRefFromNotes(body),
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
