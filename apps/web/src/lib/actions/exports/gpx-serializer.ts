import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionRouteTopology,
} from "@/lib/actions/types";

/** GPX 1.1 exportable geometry sources. */
export type GpxGeometrySource = ActionGeometrySource;

export type GpxCoordinate = readonly [number, number];

export type GpxWaypointRole =
  | "departure"
  | "stop"
  | "midpoint"
  | "arrival"
  | "meetingPoint";

export type GpxWaypoint = {
  coordinates: GpxCoordinate;
  name: string;
  role?: GpxWaypointRole;
};

export type GpxTrackInput = {
  /** The final canonical geometry. It is never rerouted or rewritten. */
  geometry: Pick<ActionDrawing, "coordinates">;
  geometrySource: GpxGeometrySource;
  /** Retained as source metadata; it never changes the supplied coordinates. */
  routeTopology?: ActionRouteTopology;
  name?: string;
  description?: string;
  waypoints?: readonly GpxWaypoint[];
};

export type GpxSerializerInput = {
  /** One entry per final itinerary; entries are never merged. */
  tracks: readonly GpxTrackInput[];
  waypoints?: readonly GpxWaypoint[];
  name?: string;
  description?: string;
};

export const GPX_1_1_NAMESPACE = "http://www.topografix.com/GPX/1/1";

const PERSONAL_DATA_PATTERN =
  /(?:[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:clerk|user)(?:[_-]?(?:id))?\s*[:=]|(?:clerk|user)_[A-Za-z0-9_-]{4,}|(?:bearer|authorization|token)\s*[:=]|\bparticipants?\b)/i;

function assertSafeXmlText(value: string, field: string): void {
  if (PERSONAL_DATA_PATTERN.test(value)) {
    throw new Error(`Le champ GPX ${field} contient une donnée personnelle interdite.`);
  }

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      codePoint < 0x20 &&
      codePoint !== 0x09 &&
      codePoint !== 0x0a &&
      codePoint !== 0x0d
    ) {
      throw new Error(`Le champ GPX ${field} contient un caractère XML interdit.`);
    }
    if (
      (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
      codePoint === 0xfffe ||
      codePoint === 0xffff
    ) {
      throw new Error(`Le champ GPX ${field} contient un caractère XML interdit.`);
    }
  }
}

function escapeXml(value: string, field: string): string {
  assertSafeXmlText(value, field);
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatCoordinate(value: number, label: string): string {
  if (!Number.isFinite(value)) {
    throw new Error(`La coordonnée GPX ${label} doit être finie.`);
  }
  if (label === "latitude" && (value < -90 || value > 90)) {
    throw new Error("La latitude GPX doit être comprise entre -90 et 90.");
  }
  if (label === "longitude" && (value < -180 || value > 180)) {
    throw new Error("La longitude GPX doit être comprise entre -180 et 180.");
  }
  return Object.is(value, -0) ? "-0" : String(value);
}

function coordinateAttributes(coordinates: GpxCoordinate): string {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new Error("Une coordonnée GPX doit être un couple latitude/longitude.");
  }
  return `lat="${formatCoordinate(coordinates[0], "latitude")}" lon="${formatCoordinate(coordinates[1], "longitude")}"`;
}

function appendMarker(value: string | undefined, marker: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return marker;
  return normalized.includes(marker) ? normalized : `${normalized} — ${marker}`;
}

function sourceMarker(source: GpxGeometrySource): string | null {
  if (
    source === "estimated_route" ||
    source === "estimated_area" ||
    source === "fallback_point"
  ) {
    return "Tracé estimé CleanMyMap";
  }
  if (source === "gpx_import") {
    return "Tracé GPX importé";
  }
  return null;
}

function trackMetadata(track: GpxTrackInput): { name: string; description: string } {
  const marker = sourceMarker(track.geometrySource);
  const defaultName = marker ?? "Tracé CleanMyMap";
  const name = marker
    ? appendMarker(track.name, marker)
    : track.name?.trim() || defaultName;
  const description = marker
    ? appendMarker(track.description, marker)
    : track.description?.trim() || "";
  return { name, description };
}

function serializeWaypoint(waypoint: GpxWaypoint): string {
  const name = waypoint.name.trim();
  if (!name) {
    throw new Error("Un waypoint GPX doit avoir un nom.");
  }
  const type = waypoint.role
    ? `    <type>${escapeXml(waypoint.role, "rôle du waypoint")}</type>`
    : "";
  return [
    `  <wpt ${coordinateAttributes(waypoint.coordinates)}>`,
    `    <name>${escapeXml(name, "nom du waypoint")}</name>`,
    type,
    "  </wpt>",
  ]
    .filter(Boolean)
    .join("\n");
}

function sameCoordinate(a: GpxCoordinate, b: GpxCoordinate): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function normalizeWaypoints(
  waypoints: readonly GpxWaypoint[] | undefined,
): readonly GpxWaypoint[] {
  const normalized = waypoints ?? [];
  const departure = normalized.find((waypoint) => waypoint.role === "departure");
  if (!departure) return normalized;

  return normalized.filter(
    (waypoint) =>
      waypoint.role !== "arrival" ||
      !sameCoordinate(waypoint.coordinates, departure.coordinates),
  );
}

function serializeTrack(track: GpxTrackInput): string {
  const coordinates = track.geometry.coordinates;
  if (coordinates.length < 2) {
    throw new Error("Une géométrie GPX doit contenir au moins deux coordonnées.");
  }

  const metadata = trackMetadata(track);
  const description = metadata.description
    ? `    <desc>${escapeXml(metadata.description, "description de l'itinéraire")}</desc>`
    : "";
  const waypoints = normalizeWaypoints(track.waypoints)
    .map(serializeWaypoint)
    .join("\n");
  const points = coordinates
    .map(
      (coordinate) =>
        `        <trkpt ${coordinateAttributes(coordinate)}></trkpt>`,
    )
    .join("\n");

  return [
    waypoints,
    "  <trk>",
    `    <name>${escapeXml(metadata.name, "nom de l'itinéraire")}</name>`,
    description,
    "    <trkseg>",
    points,
    "    </trkseg>",
    "  </trk>",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

/**
 * Serializes already-final CleanMyMap geometry to deterministic GPX 1.1.
 *
 * This function intentionally has no distance, routing, topology or network
 * logic. The supplied coordinates are the only source for the track.
 */
export function serializeActionGeometryToGpx(
  input: GpxSerializerInput,
): string {
  if (input.tracks.length === 0) {
    throw new Error("Un export GPX doit contenir au moins un itinéraire.");
  }

  const documentName = input.name?.trim() || "Export CleanMyMap";
  const documentDescription = input.description?.trim() ?? "";
  const globalWaypoints = normalizeWaypoints(input.waypoints)
    .map(serializeWaypoint)
    .join("\n");
  const tracks = input.tracks.map(serializeTrack).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="CleanMyMap" xmlns="${GPX_1_1_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${GPX_1_1_NAMESPACE} http://www.topografix.com/GPX/1/1/gpx.xsd">`,
    "  <metadata>",
    `    <name>${escapeXml(documentName, "nom du document")}</name>`,
    documentDescription
      ? `    <desc>${escapeXml(documentDescription, "description du document")}</desc>`
      : "",
    "  </metadata>",
    globalWaypoints,
    tracks,
    "</gpx>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
