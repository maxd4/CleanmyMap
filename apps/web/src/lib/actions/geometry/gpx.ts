import type {
  ActionDrawing,
  ActionGpxImportFile,
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
let gpxFileIdentityCounter = 0;

type GpxImportMetadata = ActionGpxImportMetadata;
export type GpxImportProvenance = "planned" | "unknown";

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `gpx-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** Identity of a UI candidate; it is persisted with the draft, not used as a global proof. */
export function createGpxFileIdentity(seed?: string): string {
  if (seed) return `gpx-file-${fingerprint(seed).slice(4)}`;
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") return `gpx-file-${randomUUID.call(globalThis.crypto)}`;
  gpxFileIdentityCounter += 1;
  return `gpx-file-${Date.now().toString(36)}-${gpxFileIdentityCounter.toString(36)}`;
}

export function createGpxSourceFingerprint(
  fileName: string,
  traceIndex: number,
  segmentIndex: number,
  coordinates: readonly GeodesicCoordinate[],
  fileId?: string,
): string {
  return fingerprint(`${fileId ?? fileName}:${traceIndex}:${segmentIndex}:${JSON.stringify(coordinates)}`);
}

export type ParsedGpxTrack = {
  drawing: ActionDrawing;
  metadata: GpxImportMetadata;
  segments: GeodesicCoordinate[][];
  tracks: GeodesicCoordinate[][][];
  provenance: GpxImportProvenance;
};

export type GpxFileParseResult =
  | { ok: true; fileName: string; parsed: ParsedGpxTrack }
  | { ok: false; fileName: string; error: string };

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
  tracks: GeodesicCoordinate[][][];
  activeTrackSegments: GeodesicCoordinate[][] | null;
  activeSegment: GeodesicCoordinate[] | null;
  rootSeen: boolean;
  rootClosed: boolean;
};

function consumeClosingTag(tag: XmlTag, state: GpxParserState): void {
  const expected = state.stack.pop();
  if (!expected || expected !== tag.name) throw new GpxImportError("Le fichier GPX n'est pas un XML bien formé.");
  if (tag.name === "trkseg") {
    if (state.activeSegment && state.activeSegment.length > 0) state.segments.push(state.activeSegment);
    if (state.activeSegment && state.activeTrackSegments) {
      state.activeTrackSegments.push(state.activeSegment);
    }
    state.activeSegment = null;
  }
  if (tag.name === "trk" && state.activeTrackSegments) {
    if (state.activeTrackSegments.length > 0) state.tracks.push(state.activeTrackSegments);
    state.activeTrackSegments = null;
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
  const coordinate: GeodesicCoordinate = [Number(latitude.toFixed(6)), Number(longitude.toFixed(6))];
  const previous = state.activeSegment.at(-1);
  if (previous && previous[0] === coordinate[0] && previous[1] === coordinate[1]) {
    throw new GpxImportError("Le GPX contient deux points consécutifs identiques.");
  }
  state.activeSegment.push(coordinate);
}

function consumeOpeningTag(tag: XmlTag, state: GpxParserState): void {
  if (!state.rootSeen) {
    if (tag.name !== "gpx") throw new GpxImportError("Le fichier ne contient pas une racine GPX valide.");
    state.rootSeen = true;
  }
  if (state.rootClosed) throw new GpxImportError("Le fichier GPX contient du contenu après sa racine XML.");
  if (tag.name === "trkseg") {
    if (state.activeSegment) throw new GpxImportError("Le fichier GPX contient des segments imbriqués.");
    if (!state.activeTrackSegments) throw new GpxImportError("Un segment GPX doit appartenir à une trace.");
    state.activeSegment = [];
  }
  if (tag.name === "trk") {
    if (state.activeTrackSegments) throw new GpxImportError("Le fichier GPX contient des traces imbriquées.");
    state.activeTrackSegments = [];
  }
  if (tag.name === "trkpt") appendTrackPoint(tag, state);
  if (!tag.selfClosing) state.stack.push(tag.name);
}

function parseTrackSegments(xml: string): { segments: GeodesicCoordinate[][]; tracks: GeodesicCoordinate[][][] } {
  assertXmlSafe(xml);
  const state: GpxParserState = {
    stack: [],
    segments: [],
    tracks: [],
    activeTrackSegments: null,
    activeSegment: null,
    rootSeen: false,
    rootClosed: false,
  };
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
  return { segments: state.segments, tracks: state.tracks };
}

function detectGpxProvenance(xml: string): GpxImportProvenance {
  const cleanMyMapCreator = /<gpx\b[^>]*\bcreator\s*=\s*["']CleanMyMap["'][^>]*>/i.test(xml);
  const plannedMarker = /<(?:[A-Za-z_][\w.-]*:)?provenance\b[^>]*\bintent\s*=\s*["']planned["'][^>]*\/?\s*>/i.test(xml);
  return cleanMyMapCreator && plannedMarker ? "planned" : "unknown";
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
  options: { fileName?: string; fileId?: string; preserveSourceFingerprint?: boolean } = {},
): ParsedGpxTrack {
  if (typeof xml !== "string" || xml.trim().length === 0) {
    throw new GpxImportError("Le fichier GPX est vide.");
  }

  const parsedSegments = parseTrackSegments(xml);
  const segments = parsedSegments.segments;
  if (segments.some((segment) => segment.length < 2)) {
    throw new GpxImportError("Chaque segment GPX doit contenir au moins 2 points.");
  }
  const pointCount = segments.reduce((total, segment) => total + segment.length, 0);
  if (pointCount > MAX_GPX_POINTS) {
    throw new GpxImportError(`Le GPX dépasse la limite de ${MAX_GPX_POINTS} points.`);
  }

  const coordinates = segments[0] ?? [];
  if (coordinates.length < 2) {
    throw new GpxImportError("Le GPX doit contenir au moins 2 points exploitables.");
  }
  const segmentDistancesKm = segments.map((segment) => Number(polylineDistanceKm(segment).toFixed(3)));
  const provenance = detectGpxProvenance(xml);
  const sanitizedFileName = sanitizeFileName(options.fileName);
  const files: ActionGpxImportFile[] = sanitizedFileName
    ? [{
        ...(options.fileId ? { fileId: options.fileId } : {}),
        fileName: sanitizedFileName,
        provenance,
        segments: parsedSegments.tracks.flatMap((track, traceIndex) => track.map((segment, segmentIndex) => ({
          ...(options.fileId ? { fileId: options.fileId } : {}),
          fileName: sanitizedFileName,
          traceIndex,
          segmentIndex,
          coordinates: segment,
          distanceKm: Number(polylineDistanceKm(segment).toFixed(3)),
          pointCount: segment.length,
          topology: inferGpxTopology(segment),
          sourceFingerprint: createGpxSourceFingerprint(
            sanitizedFileName,
            traceIndex,
            segmentIndex,
            segment,
            options.preserveSourceFingerprint ? undefined : options.fileId,
          ),
        }))),
      }]
    : [];

  return {
    drawing: { kind: "polyline", coordinates },
    segments,
    tracks: parsedSegments.tracks,
    provenance,
    metadata: {
      source: ACTION_GPX_SOURCE,
      observedDistanceKm: Number(segmentDistancesKm.reduce((total, distance) => total + distance, 0).toFixed(3)),
      pointCount,
      inferredTopology: inferGpxTopology(coordinates),
      segmentTopologies: segments.map(inferGpxTopology),
      segmentDistancesKm,
      segmentPointCounts: segments.map((segment) => segment.length),
      segmentCount: segments.length,
      traceCount: parsedSegments.tracks.length,
      provenance,
      fileName: sanitizedFileName,
      ...(files.length > 0 ? { files } : {}),
    },
  };
}

function assertUsableGpxFile(file: File): void {
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
}

export async function parseGpxFile(file: File, options: { fileId?: string; preserveSourceFingerprint?: boolean } = {}): Promise<ParsedGpxTrack> {
  assertUsableGpxFile(file);
  const fileName = file.name ?? "";
  const xml = await file.text();
  return parseGpxText(xml, { fileName, fileId: options.fileId, preserveSourceFingerprint: options.preserveSourceFingerprint });
}

/** Parse every selected file independently so one invalid file does not erase valid candidates. */
export async function parseGpxFiles(files: readonly File[]): Promise<GpxFileParseResult[]> {
  const fileNameCounts = new Map<string, number>();
  for (const file of files) {
    const fileName = sanitizeFileName(file.name) ?? file.name ?? "GPX sans nom";
    fileNameCounts.set(fileName, (fileNameCounts.get(fileName) ?? 0) + 1);
  }
  return Promise.all(files.map(async (file, fileIndex): Promise<GpxFileParseResult> => {
    const fileName = sanitizeFileName(file.name) ?? file.name ?? "GPX sans nom";
    try {
      assertUsableGpxFile(file);
      const occurrence = files.slice(0, fileIndex).filter((candidate) =>
        (sanitizeFileName(candidate.name) ?? candidate.name ?? "GPX sans nom") === fileName,
      ).length;
      const xml = await file.text();
      const fileId = createGpxFileIdentity(`${fileName}:${occurrence}:${xml}`);
      return {
        ok: true,
        fileName,
        parsed: parseGpxText(xml, {
          fileName,
          fileId,
          preserveSourceFingerprint: (fileNameCounts.get(fileName) ?? 0) === 1,
        }),
      };
    } catch (error: unknown) {
      return {
        ok: false,
        fileName,
        error: error instanceof GpxImportError ? error.message : "Impossible de lire ce fichier GPX.",
      };
    }
  }));
}
