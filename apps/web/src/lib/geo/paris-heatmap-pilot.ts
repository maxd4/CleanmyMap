import pilotData from "@/../data/geospatial/paris-heatmap-pilot.json";
import {
  estimateParisPressureRisk,
} from "./paris-pressure-risk";
import {
  PARIS_PRESSURE_RISK_MODEL_CONFIG,
  type ParisPressureRiskEstimate,
} from "./paris-pressure-risk-contract";
import type {
  ParisPressureProvenance,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "./paris-pressure-contract";

export type ParisHeatmapPilotMode = "mixed" | "cigaretteButts" | "waste";
export type ParisHeatmapPilotStatus = "predicted" | "unavailable";

type PilotRawWay = {
  id: string;
  sourceWayId?: string;
  highway: string;
  name: string | null;
  footAccess: "type" | "tag";
  sourceUrl: string;
  geometry: Array<[number, number]>;
  referenceZoneIds: Array<string | null>;
};

type PilotRawMicroPlace = {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  kind: string;
};

type PilotSnapshot = {
  schemaVersion: number;
  snapshotId: string;
  retrievedAt: string;
  license: string;
  geometryVersion?: string;
  identifierVersion?: string;
  referenceGeometrySnapshotId?: string;
  pressureSnapshotId?: string;
  pressureGeneratedAt?: string;
  pressureRefreshedAt?: string;
  pressureSources?: ParisPressureProvenance[];
  pilotBoundary?: {
    type: string;
    arrondissementCodes: string[];
    sourceSnapshotId: string;
    coverage: string;
  };
  source: {
    provider: string;
    endpoint: string;
    selection: string;
    geometry?: string;
    sourceTiles?: number[][];
  };
  tiles: number[][];
  ways: PilotRawWay[];
  pois: PilotRawMicroPlace[];
  zoneReferences: Array<ParisPressureZone & { urbanMorphology: ParisPressureZone["urbanMorphology"] | null }>;
};

export type ParisHeatmapPilotSnapshot = PilotSnapshot;

export type ParisHeatmapPilotMicroPlace = {
  id: string;
  coordinate: [number, number];
  name: string;
  kind: string;
  family: string;
  label: string;
  cigaretteButtCoefficient: number;
  wasteCoefficient: number;
  provenance: "osm-snapshot";
  status: "hypothesis";
};

export type ParisHeatmapPilotAppliedMicroPlaceInfluence = {
  microPlace: ParisHeatmapPilotMicroPlace;
  attenuatedCoefficient: number;
  status: "hypothesis";
};

export type ParisHeatmapPilotSegment = {
  id: string;
  osmWayId: string;
  name: string;
  geometry: [[number, number], [number, number]];
  midpoint: [number, number];
  lengthKm: number;
  irisReferenceId: string | null;
  scores: {
    mixed: number | null;
    cigaretteButts: number | null;
    waste: number | null;
  };
  dominantFactors: string[];
  dominantMicroPlace: ParisHeatmapPilotMicroPlace | null;
  appliedMicroPlaceInfluences: {
    cigaretteButts: ParisHeatmapPilotAppliedMicroPlaceInfluence | null;
    waste: ParisHeatmapPilotAppliedMicroPlaceInfluence | null;
  };
  provenance: "osm-snapshot+iris-reference+polarized-policy";
  status: ParisHeatmapPilotStatus;
};

export type ParisHeatmapPilotLayer = {
  mode: ParisHeatmapPilotMode;
  status: ParisHeatmapPilotStatus;
  segments: ParisHeatmapPilotSegment[];
  microPlaces: ParisHeatmapPilotMicroPlace[];
  source: {
    snapshotId: string;
    retrievedAt: string;
    provider: string;
    license: string;
    modelVersion: string;
    network: {
      snapshotId: string;
      retrievedAt: string;
      provider: string;
      license: string;
    };
    scores: {
      snapshotId: string;
      generatedAt: string;
      refreshedAt: string;
      modelVersion: string;
      provenance: ParisPressureProvenance[];
    };
  };
  warnings: string[];
};

export type ParisHeatmapPilotMicroPlaceGroup = {
  id: string;
  coordinate: [number, number];
  count: number;
  families: string[];
  names: string[];
  members: ParisHeatmapPilotMicroPlace[];
};

const rawPilotData = pilotData as unknown as PilotSnapshot;
const SEGMENT_MAX_LENGTH_KM = 0.042;
const MICRO_PLACE_RADIUS_KM = 0.08;
const NO_EFFECT = 1;

const roadCoefficients: Record<string, { cigaretteButts: number; waste: number }> = {
  footway: { cigaretteButts: 0.95, waste: 1.1 },
  pedestrian: { cigaretteButts: 1.35, waste: 1.45 },
  path: { cigaretteButts: 0.85, waste: 1.05 },
  steps: { cigaretteButts: 0.9, waste: 1.05 },
  residential: { cigaretteButts: 1.05, waste: 1.1 },
  living_street: { cigaretteButts: 1.15, waste: 1.2 },
  unclassified: { cigaretteButts: 1, waste: 1.05 },
  service: { cigaretteButts: 0.85, waste: 0.95 },
  tertiary: { cigaretteButts: 1.35, waste: 1.3 },
  secondary: { cigaretteButts: 1.45, waste: 1.35 },
  primary: { cigaretteButts: 1.5, waste: 1.4 },
};

const microPlaceDefinitions: Record<
  string,
  { family: string; label: string; cigaretteButts: number; waste: number }
> = {
  bar: { family: "hospitality_and_smoking", label: "Bar ou café OSM", cigaretteButts: 3.35, waste: 1.55 },
  cafe: { family: "hospitality_and_smoking", label: "Café OSM", cigaretteButts: 2.8, waste: 1.45 },
  pub: { family: "hospitality_and_smoking", label: "Pub OSM", cigaretteButts: 3.35, waste: 1.55 },
  restaurant: { family: "hospitality_and_smoking", label: "Restaurant OSM", cigaretteButts: 2.25, waste: 1.85 },
  fast_food: { family: "food_takeaway_and_market", label: "Restauration rapide OSM", cigaretteButts: 1.55, waste: 3.65 },
  bakery: { family: "food_takeaway_and_market", label: "Boulangerie OSM", cigaretteButts: 1.55, waste: 3.3 },
  convenience: { family: "food_takeaway_and_market", label: "Supérette OSM", cigaretteButts: 2, waste: 2.35 },
  marketplace: { family: "food_takeaway_and_market", label: "Marché OSM", cigaretteButts: 1.55, waste: 3.55 },
  subway_entrance: { family: "transport_waiting", label: "Sortie de métro OSM", cigaretteButts: 3, waste: 1.85 },
  bus_stop: { family: "transport_waiting", label: "Arrêt de bus OSM", cigaretteButts: 1.55, waste: 1.2 },
  university: { family: "education_and_work", label: "Université OSM", cigaretteButts: 2.45, waste: 1.65 },
  school: { family: "education_and_work", label: "Établissement scolaire OSM", cigaretteButts: 1.85, waste: 1.3 },
  museum: { family: "tourism_and_culture", label: "Musée OSM", cigaretteButts: 1.95, waste: 2.05 },
  attraction: { family: "tourism_and_culture", label: "Attraction OSM", cigaretteButts: 1.95, waste: 2.05 },
  gallery: { family: "tourism_and_culture", label: "Galerie OSM", cigaretteButts: 1.95, waste: 2.05 },
  theatre: { family: "tourism_and_culture", label: "Théâtre OSM", cigaretteButts: 1.95, waste: 2.05 },
  cinema: { family: "tourism_and_culture", label: "Cinéma OSM", cigaretteButts: 1.95, waste: 2.05 },
};

function buildLayerSource(data: PilotSnapshot): ParisHeatmapPilotLayer["source"] {
  const scoreSnapshotId = data.pressureSnapshotId ?? data.referenceGeometrySnapshotId ?? "unknown";
  const scoreGeneratedAt = data.pressureGeneratedAt ?? data.retrievedAt;
  const scoreRefreshedAt = data.pressureRefreshedAt ?? data.retrievedAt;
  return {
    snapshotId: data.snapshotId,
    retrievedAt: data.retrievedAt,
    provider: data.source.provider,
    license: data.license,
    modelVersion: `paris-street-pollution-polarized-pilot-v1+${data.geometryVersion ?? "legacy-bbox"}`,
    network: {
      snapshotId: data.snapshotId,
      retrievedAt: data.retrievedAt,
      provider: data.source.provider,
      license: data.license,
    },
    scores: {
      snapshotId: scoreSnapshotId,
      generatedAt: scoreGeneratedAt,
      refreshedAt: scoreRefreshedAt,
      modelVersion: PARIS_PRESSURE_RISK_MODEL_CONFIG.predictionModelVersion,
      provenance: data.pressureSources ?? [],
    },
  };
}

function distanceKm(left: [number, number], right: [number, number]): number {
  const latitudeFactor = Math.PI / 180;
  const dLat = (right[0] - left[0]) * latitudeFactor;
  const dLon = (right[1] - left[1]) * latitudeFactor;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(left[0] * latitudeFactor) *
      Math.cos(right[0] * latitudeFactor) *
      Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lerp(left: [number, number], right: [number, number], ratio: number): [number, number] {
  return [left[0] + (right[0] - left[0]) * ratio, left[1] + (right[1] - left[1]) * ratio];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function influence(distance: number): number {
  if (distance <= 0.015) return 1;
  if (distance <= 0.04) return 0.65;
  if (distance <= MICRO_PLACE_RADIUS_KM) return 0.3;
  return 0;
}

function blendCoefficient(coefficient: number, distance: number): number {
  return 1 + influence(distance) * (coefficient - 1);
}

function asRiskSnapshot(data: PilotSnapshot, zones: ParisPressureZone[]): ParisPressureSnapshot {
  return {
    schemaVersion: "paris-pressure-v1",
    snapshotId: data.pressureSnapshotId ?? data.referenceGeometrySnapshotId ?? "unknown",
    generatedAt: data.pressureGeneratedAt ?? data.retrievedAt,
    refreshedAt: data.pressureRefreshedAt ?? data.retrievedAt,
    geographicLevel: "iris",
    coverage: {
      country: "FR",
      department: "75",
      commune: "75056",
      zoneCount: zones.length,
      complete: false,
      geometryComplete: false,
      notes: ["Sous-ensemble compact des références IRIS ; les métadonnées de sources proviennent du snapshot canonique sans charger son référentiel complet."],
    },
    sources: data.pressureSources ?? [],
    zones,
  };
}

function buildReferenceZones(data: PilotSnapshot): ParisPressureZone[] {
  return data.zoneReferences.map((zone) => ({
    ...zone,
    geographicLevel: "iris",
    geometry: null,
    spatialJoin: { pointInPolygonMatches: 1, nearestCentroidFallbackMatches: 0 },
    ...(zone.urbanMorphology ? { urbanMorphology: zone.urbanMorphology } : {}),
  }));
}

function buildMicroPlaces(data: PilotSnapshot): ParisHeatmapPilotMicroPlace[] {
  const candidates = data.pois.flatMap((place) => {
    const definition = microPlaceDefinitions[place.kind];
    if (!definition) return [];
    return [{
      id: place.id,
      coordinate: [place.lat, place.lon] as [number, number],
      name: place.name ?? definition.label,
      kind: place.kind,
      family: definition.family,
      label: definition.label,
      cigaretteButtCoefficient: definition.cigaretteButts,
      wasteCoefficient: definition.waste,
      provenance: "osm-snapshot" as const,
      status: "hypothesis" as const,
    }];
  });
  const kept: ParisHeatmapPilotMicroPlace[] = [];
  for (const candidate of candidates) {
    const duplicate = kept.some((existing) =>
      existing.family === candidate.family &&
      existing.name.toLocaleLowerCase() === candidate.name.toLocaleLowerCase() &&
      distanceKm(existing.coordinate, candidate.coordinate) <= 0.012,
    );
    if (!duplicate) kept.push(candidate);
  }
  return kept;
}

export function splitParisHeatmapPilotWays(
  ways: readonly PilotRawWay[] = rawPilotData.ways,
  identifierVersion = ways === rawPilotData.ways ? rawPilotData.identifierVersion : undefined,
): Array<{
  id: string;
  osmWayId: string;
  name: string;
  geometry: [[number, number], [number, number]];
  midpoint: [number, number];
  lengthKm: number;
  irisReferenceId: string | null;
}> {
  const output: Array<{
    id: string;
    osmWayId: string;
    name: string;
    geometry: [[number, number], [number, number]];
    midpoint: [number, number];
    lengthKm: number;
    irisReferenceId: string | null;
  }> = [];
  for (const way of ways) {
    let referenceIndex = 0;
    for (let edgeIndex = 0; edgeIndex < way.geometry.length - 1; edgeIndex += 1) {
      const start = way.geometry[edgeIndex]!;
      const end = way.geometry[edgeIndex + 1]!;
      const parts = Math.max(1, Math.ceil(distanceKm(start, end) / SEGMENT_MAX_LENGTH_KM));
      for (let partIndex = 0; partIndex < parts; partIndex += 1) {
        const first = lerp(start, end, partIndex / parts);
        const last = lerp(start, end, (partIndex + 1) / parts);
        output.push({
          id: `${identifierVersion ?? "legacy"}:${way.id}:${edgeIndex}:${partIndex}`,
          osmWayId: way.sourceWayId ?? way.id,
          name: way.name ?? "Voie sans nom",
          geometry: [first, last],
          midpoint: lerp(first, last, 0.5),
          lengthKm: distanceKm(first, last),
          irisReferenceId: way.referenceZoneIds[referenceIndex] ?? null,
        });
        referenceIndex += 1;
      }
    }
  }
  return output;
}

type MicroPlaceInfluenceKind = "cigaretteButts" | "waste";

function dominantMicroPlace(
  midpoint: [number, number],
  places: readonly ParisHeatmapPilotMicroPlace[],
  kind: MicroPlaceInfluenceKind,
): { place: ParisHeatmapPilotMicroPlace; attenuatedCoefficient: number } | null {
  const coefficient = kind === "cigaretteButts" ? "cigaretteButtCoefficient" : "wasteCoefficient";
  const bestByFamily = new Map<string, { place: ParisHeatmapPilotMicroPlace; effect: number }>();
  for (const place of places) {
    const distance = distanceKm(midpoint, place.coordinate);
    if (distance > MICRO_PLACE_RADIUS_KM) continue;
    const effect = blendCoefficient(place[coefficient], distance);
    const previous = bestByFamily.get(place.family);
    if (!previous || effect > previous.effect) bestByFamily.set(place.family, { place, effect });
  }
  const best = [...bestByFamily.values()]
    .sort((left, right) => right.effect - left.effect || left.place.id.localeCompare(right.place.id))[0];
  return best ? { place: best.place, attenuatedCoefficient: best.effect } : null;
}

function appliedMicroPlaceInfluence(
  influenceValue: { place: ParisHeatmapPilotMicroPlace; attenuatedCoefficient: number } | null,
): ParisHeatmapPilotAppliedMicroPlaceInfluence | null {
  return influenceValue
    ? { microPlace: influenceValue.place, attenuatedCoefficient: influenceValue.attenuatedCoefficient, status: "hypothesis" }
    : null;
}

function roadCoefficient(highway: string): { cigaretteButts: number; waste: number } {
  return roadCoefficients[highway] ?? { cigaretteButts: 1, waste: 1 };
}

function weightedMean(values: Array<{ score: number; lengthKm: number }>): number {
  const totalLength = values.reduce((sum, value) => sum + value.lengthKm, 0);
  return totalLength === 0
    ? 0
    : values.reduce((sum, value) => sum + value.score * value.lengthKm, 0) / totalLength;
}

function balanceScores(
  segments: Array<{ lengthKm: number; zoneId: string; rawCigarette: number; rawWaste: number; cigaretteButts: number | null; waste: number | null }>,
  estimates: ReadonlyMap<string, ParisPressureRiskEstimate>,
): void {
  const byZone = new Map<string, typeof segments>();
  for (const segment of segments) {
    const current = byZone.get(segment.zoneId) ?? [];
    current.push(segment);
    byZone.set(segment.zoneId, current);
  }
  for (const [zoneId, zoneSegments] of byZone) {
    const estimate = estimates.get(zoneId);
    const targets = [
      ["cigaretteButts", estimate?.cigaretteButtRisk ?? null] as const,
      ["waste", estimate?.wasteRisk ?? null] as const,
    ];
    for (const [key, target] of targets) {
      if (target === null) {
        for (const segment of zoneSegments) segment[key] = null;
        continue;
      }
      const rawKey = key === "cigaretteButts" ? "rawCigarette" : "rawWaste";
      let low = 0;
      let high = 400;
      for (let iteration = 0; iteration < 42; iteration += 1) {
        const alpha = (low + high) / 2;
        const mean = weightedMean(zoneSegments.map((segment) => ({
          lengthKm: segment.lengthKm,
          score: clamp(alpha * segment[rawKey], 0, 100),
        })));
        if (mean < target) low = alpha;
        else high = alpha;
      }
      const alpha = (low + high) / 2;
      for (const segment of zoneSegments) segment[key] = clamp(alpha * segment[rawKey], 0, 100);
    }
  }
}

function riskFactors(estimate: ParisPressureRiskEstimate | undefined): string[] {
  if (!estimate) return [];
  return [...estimate.cigaretteButts.contributions, ...estimate.waste.contributions]
    .filter((factor) => factor.available)
    .sort((left, right) => right.points - left.points)
    .filter((factor, index, factors) => factors.findIndex((item) => item.key === factor.key) === index)
    .slice(0, 3)
    .map((factor) => factor.label);
}

export function buildParisHeatmapPilot(options: {
  mode?: ParisHeatmapPilotMode;
  snapshot?: PilotSnapshot;
} = {}): ParisHeatmapPilotLayer {
  const data = options.snapshot ?? rawPilotData;
  const referenceZones = buildReferenceZones(data);
  const riskSnapshot = asRiskSnapshot(data, referenceZones);
  const estimates = new Map(referenceZones.map((zone) => [
    zone.id,
    estimateParisPressureRisk(zone, riskSnapshot),
  ]));
  const microPlaces = buildMicroPlaces(data);
  const baseSegments = splitParisHeatmapPilotWays(data.ways, data.identifierVersion);
  const balancedSegments = baseSegments
    .filter((segment): segment is typeof segment & { irisReferenceId: string } => Boolean(segment.irisReferenceId))
    .map((segment) => {
      const cigaretteInfluence = dominantMicroPlace(segment.midpoint, microPlaces, "cigaretteButts");
      const wasteInfluence = dominantMicroPlace(segment.midpoint, microPlaces, "waste");
      const road = roadCoefficient(data.ways.find((way) => (way.sourceWayId ?? way.id) === segment.osmWayId)?.highway ?? "");
      return {
        ...segment,
        zoneId: segment.irisReferenceId,
        dominantMicroPlace: cigaretteInfluence?.place ?? wasteInfluence?.place ?? null,
        appliedMicroPlaceInfluences: {
          cigaretteButts: appliedMicroPlaceInfluence(cigaretteInfluence),
          waste: appliedMicroPlaceInfluence(wasteInfluence),
        },
        rawCigarette: clamp(road.cigaretteButts * (cigaretteInfluence?.attenuatedCoefficient ?? NO_EFFECT), 0.15, 5),
        rawWaste: clamp(road.waste * (wasteInfluence?.attenuatedCoefficient ?? NO_EFFECT), 0.15, 5),
        cigaretteButts: null as number | null,
        waste: null as number | null,
      };
    });
  balanceScores(balancedSegments, estimates);
  const segments: ParisHeatmapPilotSegment[] = baseSegments.map((segment) => {
    const balanced = balancedSegments.find((candidate) => candidate.id === segment.id);
    const estimate = segment.irisReferenceId ? estimates.get(segment.irisReferenceId) : undefined;
    const status: ParisHeatmapPilotStatus = balanced !== undefined && balanced.cigaretteButts !== null && balanced.waste !== null
      ? "predicted"
      : "unavailable";
    const dominantFactors = riskFactors(estimate);
    const cigaretteInfluence = balanced?.appliedMicroPlaceInfluences.cigaretteButts;
    const wasteInfluence = balanced?.appliedMicroPlaceInfluences.waste;
    if (wasteInfluence) dominantFactors.unshift(`Déchets : ${wasteInfluence.microPlace.label}`);
    if (cigaretteInfluence) dominantFactors.unshift(`Mégots : ${cigaretteInfluence.microPlace.label}`);
    return {
      ...segment,
      scores: {
        cigaretteButts: balanced?.cigaretteButts ?? null,
        waste: balanced?.waste ?? null,
        mixed: balanced !== undefined && balanced.cigaretteButts !== null && balanced.waste !== null
          ? (balanced.cigaretteButts + balanced.waste) / 2
          : null,
      },
      dominantFactors,
      dominantMicroPlace: balanced?.dominantMicroPlace ?? null,
      appliedMicroPlaceInfluences: balanced?.appliedMicroPlaceInfluences ?? { cigaretteButts: null, waste: null },
      provenance: "osm-snapshot+iris-reference+polarized-policy",
      status,
    };
  });
  const available = segments.some((segment) => segment.status === "predicted");
  return {
    mode: options.mode ?? "mixed",
    status: available ? "predicted" : "unavailable",
    segments,
    microPlaces: available ? microPlaces : [],
    source: buildLayerSource(data),
    warnings: available
      ? ["Pilote prédictif : les scores sont des hypothèses polarisées, pas des mesures de terrain.", "Les coefficients socio-démographiques ne sont pas activés dans ce pilote."]
      : ["Les tronçons OSM ou leurs références IRIS ne sont pas disponibles dans le snapshot du pilote ; les micro-points restent masqués."],
  };
}

export function getParisHeatmapPilotReferenceScores(): ReadonlyMap<
  string,
  { cigaretteButts: number; waste: number }
> {
  const zones = buildReferenceZones(rawPilotData);
  const snapshot = asRiskSnapshot(rawPilotData, zones);
  return new Map(zones.map((zone) => {
    const estimate = estimateParisPressureRisk(zone, snapshot);
    return [zone.id, { cigaretteButts: estimate.cigaretteButtRisk, waste: estimate.wasteRisk }];
  }));
}

export function groupParisHeatmapPilotMicroPlaces(
  places: readonly ParisHeatmapPilotMicroPlace[],
  zoom: number,
): ParisHeatmapPilotMicroPlaceGroup[] {
  if (zoom >= 16.4) {
    return places.map((place) => ({
      id: place.id,
      coordinate: place.coordinate,
      count: 1,
      families: [place.family],
      names: [place.name],
      members: [place],
    }));
  }
  const cellSize = zoom >= 14 ? 0.0012 : 0.003;
  const grouped = new Map<string, ParisHeatmapPilotMicroPlace[]>();
  for (const place of places) {
    const key = `${Math.floor(place.coordinate[0] / cellSize)}:${Math.floor(place.coordinate[1] / cellSize)}`;
    const current = grouped.get(key) ?? [];
    current.push(place);
    grouped.set(key, current);
  }
  return [...grouped.entries()].map(([id, members]) => ({
    id: `micro-cluster:${id}`,
    coordinate: [
      members.reduce((sum, member) => sum + member.coordinate[0], 0) / members.length,
      members.reduce((sum, member) => sum + member.coordinate[1], 0) / members.length,
    ],
    count: members.length,
    families: [...new Set(members.map((member) => member.family))],
    names: members.slice(0, 3).map((member) => member.name),
    members,
  }));
}
