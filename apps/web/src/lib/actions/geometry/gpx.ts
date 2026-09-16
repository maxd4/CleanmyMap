import type {
  ActionDrawing,
  ActionGpxImportMetadata,
  ActionRouteTopology,
} from "@/lib/actions/types";
import {
  haversineDistanceKm,
  polylineDistanceKm,
  type GeodesicCoordinate,
} from "@/lib/geo/geodesic-distance";

export const ACTION_GPX_SOURCE = "gpx_import" as const;
export const MAX_GPX_FILE_BYTES = 5_000_000;
export const MAX_GPX_POINTS = 400;
export const GPX_LOOP_CLOSURE_THRESHOLD_METERS = 50;

export type GpxImportMetadata = ActionGpxImportMetadata;

export type ParsedGpxTrack = {
  drawing: ActionDrawing;
  metadata: GpxImportMetadata;
  segments: GeodesicCoordinate[][];
};

export class GpxImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GpxImportError";
  }
}

type XmlTag = {
  name: string;
  attributes: Record<string, string>;
  closing: boolean;
  selfClosing: boolean;
};

function localName(name: string): string {
  const separator = name.lastIndexOf(":");
  return (separator >= 0 ? name.slice(separator + 1) : name).toLowerCase();
}

function sanitizeFileName(fileName: string | undefined): string | undefined {
  if (!fileName) return undefined;
  const sanitized = fileName
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 120);
  return sanitized || undefined;
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/g;
  let match: RegExpExecArray | null;
  let consumed = 0;

  while ((match = attributePattern.exec(source)) !== null) {
    const between = source.slice(consumed, match.index).trim();
    if (between) {
      throw new GpxImportError("Le fichier GPX contient un attribut XML invalide.");
    }
    attributes[localName(match[1])] = match[3];
    consumed = attributePattern.lastIndex;
  }

  if (source.slice(consumed).trim()) {
    throw new GpxImportError("Le fichier GPX contient un attribut XML invalide.");
  }
  return attributes;
}

function parseTag(rawTag: string): XmlTag | null {
  const content = rawTag.slice(1, -1).trim();
  if (!content || content.startsWith("?") || content.startsWith("!")) {
    return null;
  }

  const closing = content.startsWith("/");
  const withoutClosing = closing ? content.slice(1).trim() : content;
  const selfClosing = !closing && /\/\s*$/.test(withoutClosing);
  const normalized = selfClosing
    ? withoutClosing.replace(/\/\s*$/, "").trim()
    : withoutClosing;
  const nameMatch = normalized.match(/^([A-Za-z_][\w:.-]*)(?:\s+([\s\S]*))?$/);
  if (!nameMatch) {
    throw new GpxImportError("Le fichier GPX contient une balise XML invalide.");
  }

  return {
    name: localName(nameMatch[1]),
    attributes: parseAttributes(nameMatch[2] ?? ""),
    closing,
    selfClosing,
  };
}

function assertXmlSafe(xml: string): void {
  if (/<!DOCTYPE|<!ENTITY|SYSTEM\s+["']|PUBLIC\s+["']/i.test(xml)) {
    throw new GpxImportError("Les déclarations XML externes ne sont pas autorisées dans un GPX.");
  }
}

function parseTrackSegments(xml: string): GeodesicCoordinate[][] {
  assertXmlSafe(xml);
  const tagPattern = /<[^>]*>/g;
  const stack: string[] = [];
  const segments: GeodesicCoordinate[][] = [];
  let activeSegment: GeodesicCoordinate[] | null = null;
  let rootSeen = false;
  let rootClosed = false;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(xml)) !== null) {
    const tag = parseTag(match[0]);
    if (!tag) continue;

    if (tag.closing) {
      const expected = stack.pop();
      if (!expected || expected !== tag.name) {
        throw new GpxImportError("Le fichier GPX n'est pas un XML bien formé.");
      }
      if (tag.name === "trkseg") {
        if (activeSegment && activeSegment.length > 0) {
          segments.push(activeSegment);
        }
        activeSegment = null;
      }
      if (tag.name === "gpx") rootClosed = true;
      continue;
    }

    if (!rootSeen) {
      if (tag.name !== "gpx") {
        throw new GpxImportError("Le fichier ne contient pas une racine GPX valide.");
      }
      rootSeen = true;
    }

    if (rootClosed) {
      throw new GpxImportError("Le fichier GPX contient du contenu après sa racine XML.");
    }

    if (tag.name === "trkseg") {
      if (activeSegment) {
        throw new GpxImportError("Le fichier GPX contient des segments imbriqués.");
      }
      activeSegment = [];
    }

    if (tag.name === "trkpt") {
      if (!activeSegment) {
        throw new GpxImportError("Les points GPX doivent appartenir à un segment de trace.");
      }
      const latitude = Number(tag.attributes.lat);
      const longitude = Number(tag.attributes.lon);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new GpxImportError("Le GPX contient une latitude ou une longitude invalide.");
      }
      activeSegment.push([
        Number(latitude.toFixed(6)),
        Number(longitude.toFixed(6)),
      ]);
    }

    if (!tag.selfClosing) {
      stack.push(tag.name);
    }
  }

  if (stack.length > 0 || !rootSeen || !rootClosed) {
    throw new GpxImportError("Le fichier GPX n'est pas un XML bien formé.");
  }
  if (segments.length === 0) {
    throw new GpxImportError("Le GPX ne contient aucun segment de trace exploitable.");
  }
  return segments;
}

export function isGpxLoop(coordinates: readonly GeodesicCoordinate[]): boolean {
  const first = coordinates[0];
  const last = coordinates.at(-1);
  return Boolean(
    first &&
      last &&
      haversineDistanceKm(first, last) * 1000 <= GPX_LOOP_CLOSURE_THRESHOLD_METERS,
  );
}

export function inferGpxTopology(
  coordinates: readonly GeodesicCoordinate[],
): ActionRouteTopology {
  return isGpxLoop(coordinates) ? "loop" : "point_to_point";
}

export function parseGpxText(
  xml: string,
  options: { fileName?: string } = {},
): ParsedGpxTrack {
  if (typeof xml !== "string" || xml.trim().length === 0) {
    throw new GpxImportError("Le fichier GPX est vide.");
  }

  const segments = parseTrackSegments(xml);
  if (segments.some((segment) => segment.length < 2)) {
    throw new GpxImportError("Chaque segment GPX doit contenir au moins 2 points.");
  }
  if (segments.length > 1) {
    throw new GpxImportError(
      "Ce GPX contient plusieurs segments. Importez un fichier à segment unique pour éviter d'inventer une liaison.",
    );
  }

  const coordinates = segments[0] ?? [];
  if (coordinates.length < 2) {
    throw new GpxImportError("Le GPX doit contenir au moins 2 points exploitables.");
  }
  if (coordinates.length > MAX_GPX_POINTS) {
    throw new GpxImportError(`Le GPX dépasse la limite de ${MAX_GPX_POINTS} points.`);
  }

  return {
    drawing: { kind: "polyline", coordinates },
    segments,
    metadata: {
      source: ACTION_GPX_SOURCE,
      observedDistanceKm: Number(polylineDistanceKm(coordinates).toFixed(3)),
      pointCount: coordinates.length,
      inferredTopology: inferGpxTopology(coordinates),
      fileName: sanitizeFileName(options.fileName),
    },
  };
}

export async function parseGpxFile(file: File): Promise<ParsedGpxTrack> {
  const fileName = file.name ?? "";
  if (!/\.gpx$/i.test(fileName)) {
    throw new GpxImportError("Sélectionnez un fichier portant l'extension .gpx.");
  }
  const mimeType = (file.type ?? "").toLowerCase();
  if (
    mimeType &&
    !["application/gpx+xml", "application/xml", "text/xml", "application/octet-stream"].includes(mimeType)
  ) {
    throw new GpxImportError("Le type MIME du fichier n'est pas compatible avec un GPX.");
  }
  if (file.size > MAX_GPX_FILE_BYTES) {
    throw new GpxImportError("Le fichier GPX dépasse la taille maximale autorisée de 5 Mo.");
  }
  const xml = await file.text();
  return parseGpxText(xml, { fileName });
}
