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

const ACTION_GPX_SOURCE = "gpx_import" as const;
export const MAX_GPX_FILE_BYTES = 5_000_000;
export const MAX_GPX_POINTS = 400;
const GPX_LOOP_CLOSURE_THRESHOLD_METERS = 50;

type GpxImportMetadata = ActionGpxImportMetadata;

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
  let cursor = 0;
  while (cursor < source.length) {
    cursor = skipWhitespace(source, cursor);
    if (cursor >= source.length) break;
    const parsed = readAttribute(source, cursor);
    attributes[localName(parsed.name)] = parsed.value;
    cursor = parsed.nextCursor;
  }
  return attributes;
}

function skipWhitespace(source: string, cursor: number): number {
  while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  return cursor;
}

function readAttribute(source: string, cursor: number): { name: string; value: string; nextCursor: number } {
  const nameStart = cursor;
  while (/[A-Za-z0-9_:.\-]/.test(source[cursor] ?? "")) cursor += 1;
  if (cursor === nameStart || !/[A-Za-z_]/.test(source[nameStart] ?? "")) throw new GpxImportError("Le fichier GPX contient un attribut XML invalide.");
  const name = source.slice(nameStart, cursor);
  cursor = skipWhitespace(source, cursor);
  if (source[cursor] !== "=") throw new GpxImportError("Le fichier GPX contient un attribut XML invalide.");
  cursor = skipWhitespace(source, cursor + 1);
  const quote = source[cursor];
  if (quote !== '"' && quote !== "'") throw new GpxImportError("Le fichier GPX contient un attribut XML invalide.");
  const valueStart = cursor + 1;
  const valueEnd = source.indexOf(quote, valueStart);
  if (valueEnd < 0) throw new GpxImportError("Le fichier GPX contient un attribut XML invalide.");
  return { name, value: source.slice(valueStart, valueEnd), nextCursor: valueEnd + 1 };
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
  const nameEnd = normalized.search(/[\s]/);
  const name = nameEnd < 0 ? normalized : normalized.slice(0, nameEnd);
  if (!/^[A-Za-z_][\w:.-]*$/.test(name)) {
    throw new GpxImportError("Le fichier GPX contient une balise XML invalide.");
  }

  return {
    name: localName(name),
    attributes: parseAttributes(nameEnd < 0 ? "" : normalized.slice(nameEnd)),
    closing,
    selfClosing,
  };
}

function assertXmlSafe(xml: string): void {
  if (/<!DOCTYPE|<!ENTITY|SYSTEM\s+["']|PUBLIC\s+["']/i.test(xml)) {
    throw new GpxImportError("Les déclarations XML externes ne sont pas autorisées dans un GPX.");
  }
}

type GpxParserState = {
  stack: string[];
  segments: GeodesicCoordinate[][];
  activeSegment: GeodesicCoordinate[] | null;
  rootSeen: boolean;
  rootClosed: boolean;
};

function consumeClosingTag(tag: XmlTag, state: GpxParserState): void {
  const expected = state.stack.pop();
  if (!expected || expected !== tag.name) throw new GpxImportError("Le fichier GPX n'est pas un XML bien formé.");
  if (tag.name === "trkseg") {
    if (state.activeSegment && state.activeSegment.length > 0) state.segments.push(state.activeSegment);
    state.activeSegment = null;
  }
  if (tag.name === "gpx") state.rootClosed = true;
}

function appendTrackPoint(tag: XmlTag, state: GpxParserState): void {
  if (!state.activeSegment) throw new GpxImportError("Les points GPX doivent appartenir à un segment de trace.");
  const latitude = Number(tag.attributes.lat);
  const longitude = Number(tag.attributes.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new GpxImportError("Le GPX contient une latitude ou une longitude invalide.");
  }
  state.activeSegment.push([Number(latitude.toFixed(6)), Number(longitude.toFixed(6))]);
}

function consumeOpeningTag(tag: XmlTag, state: GpxParserState): void {
  if (!state.rootSeen) {
    if (tag.name !== "gpx") throw new GpxImportError("Le fichier ne contient pas une racine GPX valide.");
    state.rootSeen = true;
  }
  if (state.rootClosed) throw new GpxImportError("Le fichier GPX contient du contenu après sa racine XML.");
  if (tag.name === "trkseg") {
    if (state.activeSegment) throw new GpxImportError("Le fichier GPX contient des segments imbriqués.");
    state.activeSegment = [];
  }
  if (tag.name === "trkpt") appendTrackPoint(tag, state);
  if (!tag.selfClosing) state.stack.push(tag.name);
}

function parseTrackSegments(xml: string): GeodesicCoordinate[][] {
  assertXmlSafe(xml);
  const state: GpxParserState = { stack: [], segments: [], activeSegment: null, rootSeen: false, rootClosed: false };
  let cursor = 0;
  while (cursor < xml.length) {
    const tagStart = xml.indexOf("<", cursor);
    if (tagStart < 0) break;
    const tagEnd = xml.indexOf(">", tagStart + 1);
    if (tagEnd < 0) throw new GpxImportError("Le fichier GPX n'est pas un XML bien formé.");
    const tag = parseTag(xml.slice(tagStart, tagEnd + 1));
    cursor = tagEnd + 1;
    if (!tag) continue;
    if (tag.closing) consumeClosingTag(tag, state);
    else consumeOpeningTag(tag, state);
  }

  if (state.stack.length > 0 || !state.rootSeen || !state.rootClosed) {
    throw new GpxImportError("Le fichier GPX n'est pas un XML bien formé.");
  }
  if (state.segments.length === 0) {
    throw new GpxImportError("Le GPX ne contient aucun segment de trace exploitable.");
  }
  return state.segments;
}

function isGpxLoop(coordinates: readonly GeodesicCoordinate[]): boolean {
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
