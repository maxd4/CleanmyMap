import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionRouteTopology,
} from "@/lib/actions/types";

/**
 * GPX 1.1 exportable geometry sources.
 *
 * `gpx_import` is kept in this compatibility union until the canonical
 * geometry-source type is present on every checkout that consumes this
 * serializer.
 */
export type GpxGeometrySource = ActionGeometrySource | "gpx_import";

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

const GPX_NAMESPACE = "http://www.topografix.com/GPX/1/1";

function escapeXml(value: string): string {
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
  return `lat="${formatCoordinate(coordinates[0], "latitude")}" lon="${formatCoordinate(coordinates[1], "longitude")}"`;
}

function appendMarker(value: string | undefined, marker: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return marker;
  return normalized.includes(marker) ? normalized : `${normalized} — ${marker}`;
}

function sourceMarker(source: GpxGeometrySource): string | null {
  if (source === "estimated_route" || source === "estimated_area") {
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
    ? `\n      <type>${escapeXml(waypoint.role)}</type>`
    : "";
  return [
    `  <wpt ${coordinateAttributes(waypoint.coordinates)}>`,
    `    <name>${escapeXml(name)}</name>`,
    type,
    "  </wpt>",
  ]
    .filter(Boolean)
    .join("\n");
}

function serializeTrack(track: GpxTrackInput): string {
  const coordinates = track.geometry.coordinates;
  if (coordinates.length < 2) {
    throw new Error("Une géométrie GPX doit contenir au moins deux coordonnées.");
  }

  const metadata = trackMetadata(track);
  const description = metadata.description
    ? `\n    <desc>${escapeXml(metadata.description)}</desc>`
    : "";
  const waypoints = (track.waypoints ?? []).map(serializeWaypoint).join("\n");
  const waypointBlock = waypoints ? `${waypoints}\n` : "";
  const points = coordinates
    .map(
      (coordinate) =>
        `        <trkpt ${coordinateAttributes(coordinate)}></trkpt>`,
    )
    .join("\n");

  return [
    waypointBlock.trimEnd(),
    "  <trk>",
    `    <name>${escapeXml(metadata.name)}</name>`,
    description.trimStart(),
    "    <trkseg>",
    points,
    "    </trkseg>",
    "  </trk>",
  ]
    .filter(Boolean)
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
  const globalWaypoints = (input.waypoints ?? []).map(serializeWaypoint).join("\n");
  const tracks = input.tracks.map(serializeTrack).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="CleanMyMap" xmlns="${GPX_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${GPX_NAMESPACE} http://www.topografix.com/GPX/1/1/gpx.xsd">`,
    "  <metadata>",
    `    <name>${escapeXml(documentName)}</name>`,
    documentDescription ? `    <desc>${escapeXml(documentDescription)}</desc>` : "",
    "  </metadata>",
    globalWaypoints,
    tracks,
    "</gpx>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
