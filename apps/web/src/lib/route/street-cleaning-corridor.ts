/**
 * Contract for the part of a street that is actually cleanable.
 *
 * Network routing geometry remains a movement trace. It must not be offset or
 * reinterpreted as a sidewalk corridor without side-specific evidence.
 */

export const STREET_CLEANING_CORRIDOR_SCHEMA_VERSION =
  "street-cleaning-corridor-v1" as const;

export type StreetCleaningCorridorSide =
  | "left"
  | "right"
  | "single"
  | "unknown";

export type StreetCleaningCoordinate = readonly [number, number];

export type StreetCleaningConfidenceLevel =
  | "unknown"
  | "low"
  | "medium"
  | "high";

export type StreetCleaningCorridorConfidence = {
  score: number;
  level: StreetCleaningConfidenceLevel;
};

export type StreetCleaningReferenceSegment = {
  id: string;
  label: string | null;
  /** The source geometry of the reference segment, never an artificial offset. */
  geometry: StreetCleaningCoordinate[];
};

export type StreetCleaningReferenceOrientation = {
  /** left/right are defined relative to the direction from `from` to `to`. */
  from: StreetCleaningCoordinate;
  to: StreetCleaningCoordinate;
  bearingDegrees: number;
};

export type StreetCleaningCorridorSource = {
  id: string;
  publisher: string;
  dataset: string;
  datasetVersion: string;
  url: string | null;
  evidenceType: "sidewalk_geometry" | "single_corridor_geometry";
};

export type StreetCleaningCrossing = {
  location: StreetCleaningCoordinate;
  /** A crossing is only accepted when it keeps the operation on the same side. */
  purpose: "same_side_continuation";
  safeCrossing: "proven";
  sourceId: string;
};

type StreetCleaningCrossingInput =
  | StreetCleaningCrossing
  | {
      location: StreetCleaningCoordinate;
      purpose: "side_change";
      safeCrossing: "proven" | "unknown";
      sourceId: string;
    };

export type StreetCleaningCorridor = {
  schemaVersion: typeof STREET_CLEANING_CORRIDOR_SCHEMA_VERSION;
  referenceSegment: StreetCleaningReferenceSegment | null;
  side: StreetCleaningCorridorSide;
  referenceOrientation: StreetCleaningReferenceOrientation | null;
  lengthMeters: number | null;
  /** Present only when the source supplies side-specific corridor geometry. */
  geometry: StreetCleaningCoordinate[] | null;
  source: StreetCleaningCorridorSource | null;
  confidence: StreetCleaningCorridorConfidence;
  provenance: {
    status: "proven" | "unknown";
    evidenceIds: string[];
    note: string;
  };
  safeCrossings: StreetCleaningCrossing[];
  safeCrossingsStatus: "proven" | "unknown";
};

export type StreetCleaningCorridorProof =
  | {
      type: "sidewalk_geometry";
      side: "left" | "right";
      evidenceIds: readonly string[];
      note: string;
    }
  | {
      type: "single_corridor_geometry";
      evidenceIds: readonly string[];
      note: string;
    };

export type ProvenStreetCleaningCorridorInput = {
  referenceSegment: Omit<StreetCleaningReferenceSegment, "geometry"> & {
    geometry: readonly StreetCleaningCoordinate[];
  };
  referenceOrientation: StreetCleaningReferenceOrientation;
  lengthMeters: number;
  geometry: readonly StreetCleaningCoordinate[];
  source: StreetCleaningCorridorSource;
  confidence: StreetCleaningCorridorConfidence;
  proof: StreetCleaningCorridorProof;
  safeCrossings?: StreetCleaningCrossingInput[];
};

export type StreetCleaningCorridorHandoff = {
  schemaVersion: typeof STREET_CLEANING_CORRIDOR_SCHEMA_VERSION;
  status: "proven" | "unknown";
  corridors: StreetCleaningCorridor[];
  sourceStatus: "available" | "unavailable";
  fallback: "unknown";
  note: string;
  operationalPlan?: StreetCleaningOperationalPlan;
};

export type StreetCleaningOperationalCorridorId = "A" | "B";

export type StreetCleaningOperationalStreet = {
  streetKey: string;
  label: string | null;
  corridorCount: 1 | 2;
  basis: "default_two_corridors" | "documented_exception";
  sourceId: string;
  sourceVersion: string;
  note: string;
};

export type StreetCleaningPollutionSignal = {
  wasteRisk: number | null;
  cigaretteButtRisk: number | null;
  workload: number | null;
  durationMinutes: number | null;
};

export type StreetCleaningStreetPass = {
  routeId: string;
  routeOrder: number;
  passOrder: number;
  streetKey: string;
  label: string | null;
  lengthMeters: number | null;
  direction: "outbound" | "return" | "other";
  requiresCrossing?: boolean;
  crossingStatus?: "not_required" | "proven_same_side" | "unknown" | "dangerous";
  pollution?: StreetCleaningPollutionSignal;
};

export type StreetCleaningOperationalAssignment = {
  routeId: string;
  streetKey: string;
  label: string | null;
  corridorId: StreetCleaningOperationalCorridorId;
  /** A/B is operational only; it is not a proven geographic side. */
  geographicSide: "unknown";
  lengthMeters: number | null;
  direction: StreetCleaningStreetPass["direction"];
  basis: StreetCleaningOperationalStreet["basis"];
  crossingStatus: NonNullable<StreetCleaningStreetPass["crossingStatus"]>;
  crossingBlocked: boolean;
  pollution: StreetCleaningPollutionSignal | null;
};

export type StreetCleaningOperationalPlan = {
  streets: StreetCleaningOperationalStreet[];
  assignments: StreetCleaningOperationalAssignment[];
  /** Shared/proximate street movement, independent from cleaning duplication. */
  networkOverlap: number;
  /** Repeated cleaning of the same operational corridor. */
  cleaningCoverageOverlap: number;
  warnings: string[];
};

export type StreetCleaningOperationalException = {
  corridorCount: 1;
  sourceId: string;
  sourceVersion: string;
  note: string;
};

function cloneCoordinate(
  coordinate: StreetCleaningCoordinate,
): StreetCleaningCoordinate {
  return [coordinate[0], coordinate[1]];
}

function cloneCoordinates(
  coordinates: readonly StreetCleaningCoordinate[],
): StreetCleaningCoordinate[] {
  return coordinates.map(cloneCoordinate);
}

function normalizeBearing(bearingDegrees: number): number {
  const normalized = ((bearingDegrees % 360) + 360) % 360;
  return Number(normalized.toFixed(6));
}

function assertFiniteCoordinate(coordinate: StreetCleaningCoordinate): void {
  if (
    coordinate.length !== 2 ||
    !Number.isFinite(coordinate[0]) ||
    !Number.isFinite(coordinate[1])
  ) {
    throw new Error("Une coordonnée de corridor doit être finie.");
  }
}

function assertOrientation(
  orientation: StreetCleaningReferenceOrientation,
): StreetCleaningReferenceOrientation {
  assertFiniteCoordinate(orientation.from);
  assertFiniteCoordinate(orientation.to);
  if (
    orientation.from[0] === orientation.to[0] &&
    orientation.from[1] === orientation.to[1]
  ) {
    throw new Error("L'orientation de référence doit avoir deux points distincts.");
  }
  if (!Number.isFinite(orientation.bearingDegrees)) {
    throw new Error("Le cap d'orientation du corridor doit être fini.");
  }
  return {
    from: cloneCoordinate(orientation.from),
    to: cloneCoordinate(orientation.to),
    bearingDegrees: normalizeBearing(orientation.bearingDegrees),
  };
}

function assertConfidence(
  confidence: StreetCleaningCorridorConfidence,
): StreetCleaningCorridorConfidence {
  if (!Number.isFinite(confidence.score) || confidence.score < 0 || confidence.score > 1) {
    throw new Error("La confiance du corridor doit être comprise entre 0 et 1.");
  }
  return { score: confidence.score, level: confidence.level };
}

function cloneCrossings(crossings: StreetCleaningCrossing[]): StreetCleaningCrossing[] {
  return crossings.map((crossing) => ({
    ...crossing,
    location: cloneCoordinate(crossing.location),
  }));
}

function assertCrossings(crossings: StreetCleaningCrossingInput[]): void {
  for (const crossing of crossings) {
    assertFiniteCoordinate(crossing.location);
    if (
      crossing.purpose !== "same_side_continuation" ||
      crossing.safeCrossing !== "proven"
    ) {
      throw new Error(
        "Une traversée de corridor doit être prouvée et conserver le même côté.",
      );
    }
  }
}

/** Builds a corridor only from explicit side-specific or single-corridor proof. */
export function buildProvenStreetCleaningCorridor(
  input: ProvenStreetCleaningCorridorInput,
): StreetCleaningCorridor {
  if (!Number.isFinite(input.lengthMeters) || input.lengthMeters < 0) {
    throw new Error("La longueur du corridor doit être positive ou nulle.");
  }
  if (input.referenceSegment.geometry.length < 2) {
    throw new Error("Le segment de référence doit conserver sa géométrie source.");
  }
  input.referenceSegment.geometry.forEach(assertFiniteCoordinate);
  input.geometry.forEach(assertFiniteCoordinate);
  if (input.geometry.length < 2) {
    throw new Error("La géométrie prouvée du corridor doit comporter deux points.");
  }
  if (input.source.evidenceType !== input.proof.type) {
    throw new Error("La source et la preuve du corridor doivent être cohérentes.");
  }
  if (
    input.proof.type === "sidewalk_geometry" &&
    input.proof.side !== "left" &&
    input.proof.side !== "right"
  ) {
    throw new Error("Une preuve de trottoir doit définir left ou right.");
  }

  const safeCrossings = [...(input.safeCrossings ?? [])];
  assertCrossings(safeCrossings);
  const side = input.proof.type === "sidewalk_geometry" ? input.proof.side : "single";
  return {
    schemaVersion: STREET_CLEANING_CORRIDOR_SCHEMA_VERSION,
    referenceSegment: {
      id: input.referenceSegment.id,
      label: input.referenceSegment.label,
      geometry: cloneCoordinates(input.referenceSegment.geometry),
    },
    side,
    referenceOrientation: assertOrientation(input.referenceOrientation),
    lengthMeters: input.lengthMeters,
    geometry: cloneCoordinates(input.geometry),
    source: { ...input.source },
    confidence: assertConfidence(input.confidence),
    provenance: {
      status: "proven",
      evidenceIds: [...input.proof.evidenceIds].sort(),
      note: input.proof.note,
    },
    safeCrossings: cloneCrossings(safeCrossings as StreetCleaningCrossing[]),
    safeCrossingsStatus: safeCrossings.length > 0 ? "proven" : "unknown",
  };
}

/** Unknown is the only fallback when no side-specific source is available. */
export function buildUnknownStreetCleaningCorridor(
  note = "Aucune preuve géographique suffisante du côté nettoyable.",
): StreetCleaningCorridor {
  return {
    schemaVersion: STREET_CLEANING_CORRIDOR_SCHEMA_VERSION,
    referenceSegment: null,
    side: "unknown",
    referenceOrientation: null,
    lengthMeters: null,
    geometry: null,
    source: null,
    confidence: { score: 0, level: "unknown" },
    provenance: { status: "unknown", evidenceIds: [], note },
    safeCrossings: [],
    safeCrossingsStatus: "unknown",
  };
}

export function buildUnknownStreetCleaningCorridorHandoff(
  note =
    "Le routage et le snapshot de serviceabilité ne prouvent pas un corridor latéral.",
  operationalPlan?: StreetCleaningOperationalPlan,
): StreetCleaningCorridorHandoff {
  return {
    schemaVersion: STREET_CLEANING_CORRIDOR_SCHEMA_VERSION,
    status: "unknown",
    corridors: [],
    sourceStatus: "unavailable",
    fallback: "unknown",
    note,
    ...(operationalPlan ? { operationalPlan } : {}),
  };
}

export {
  buildStreetCleaningStreetPassesFromGeometry,
  planOperationalStreetCorridors,
} from "./street-cleaning-operational";

/** Reverses the reference direction and keeps left/right semantically correct. */
export function reverseStreetCleaningCorridorOrientation(
  corridor: StreetCleaningCorridor,
): StreetCleaningCorridor {
  const side = corridor.side === "left"
    ? "right"
    : corridor.side === "right"
      ? "left"
      : corridor.side;
  return {
    ...corridor,
    side,
    referenceSegment: corridor.referenceSegment
      ? {
          ...corridor.referenceSegment,
          geometry: [...corridor.referenceSegment.geometry].reverse(),
        }
      : null,
    referenceOrientation: corridor.referenceOrientation
      ? {
          from: cloneCoordinate(corridor.referenceOrientation.to),
          to: cloneCoordinate(corridor.referenceOrientation.from),
          bearingDegrees: normalizeBearing(
            corridor.referenceOrientation.bearingDegrees + 180,
          ),
        }
      : null,
    geometry: corridor.geometry ? [...corridor.geometry].reverse() : null,
    safeCrossings: [...corridor.safeCrossings].reverse(),
  };
}
