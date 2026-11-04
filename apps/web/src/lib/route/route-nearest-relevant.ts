import {
  haversineMeters,
  type Coordinate,
  type PedestrianNetworkGraph,
} from "./pedestrian-network";
import { travelMinutesForDistance, type RoutePlannerOrigin } from "./route-planner";
import {
  ROUTE_POLLUTION_RELEVANCE_POLICY,
  type RoutePollutionRelevanceAssessment,
} from "./route-pollution-relevance";

export const ROUTE_NEAREST_RELEVANT_POLICY_VERSION =
  "route-nearest-relevant-v1" as const;

export const ROUTE_NEAREST_RELEVANT_RADII_KM = [0.5, 1, 2, 3, 5] as const;
export const ROUTE_NEAREST_RELEVANT_MAX_CANDIDATES_PER_RADIUS = 8;
export const ROUTE_NEAREST_RELEVANT_MAX_PLAN_EVALUATIONS = 40;
export const ROUTE_NEAREST_RELEVANT_MAX_PROVIDER_CALLS = 4;
export const ROUTE_NEAREST_RELEVANT_PLAN_TIMEOUT_MS = 3_000;

const PARIS_INTRA_MUROS_BOUNDS = {
  south: 48.8156,
  west: 2.2241,
  north: 48.9022,
  east: 2.4699,
} as const;

export type RouteNearestRelevantReference = {
  kind: "precise" | "zone";
  center: Coordinate;
  source: RoutePlannerOrigin["source"] | "zone";
  label?: string;
  radiusKm?: number;
  bounds?: { south: number; west: number; north: number; east: number };
};

export type RouteNearestRelevantBestAttempt = {
  score: number | null;
  confidenceScore: number | null;
  sufficient: false;
  radiusKm: number;
  accessDistanceKm: number;
  rendezvous: RoutePlannerOrigin;
  routingStatus: "network" | "fallback";
};

export type RouteNearestRelevantSearch = {
  schemaVersion: typeof ROUTE_NEAREST_RELEVANT_POLICY_VERSION;
  status: "found" | "not_found" | "unavailable";
  reason:
    | "found"
    | "no_admissible_route"
    | "score_below_threshold"
    | "group_below_threshold"
    | "confidence_insufficient"
    | "score_unavailable"
    | "network_unavailable";
  requestedOrigin: {
    kind: "precise" | "zone";
    center: { latitude: number; longitude: number };
    source: RoutePlannerOrigin["source"] | "zone";
    label?: string;
    radiusKm?: number;
  };
  rendezvous: {
    latitude: number;
    longitude: number;
    source: "planner";
  } | null;
  accessDistanceKm: number | null;
  accessDurationMinutes: number | null;
  radiusKm: number | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  routingStatus: "network" | "fallback" | "unavailable";
  triedRadiiKm: number[];
  candidatesEvaluated: number;
  plansEvaluated: number;
  bestAttempt: RouteNearestRelevantBestAttempt | null;
  policy: {
    version: typeof ROUTE_NEAREST_RELEVANT_POLICY_VERSION;
    acceptanceScore: 65;
    minimumConfidenceScore: number;
    radiiKm: readonly number[];
  };
  limitations: string[];
};

type PlanEvaluation = {
  relevance: RoutePollutionRelevanceAssessment;
  withinBudget: boolean;
  loopVerified: boolean;
  routingStatus: "network" | "fallback";
  providerCalls?: number;
};

type CandidateEvaluation = {
  origin: RoutePlannerOrigin;
  radiusKm: number;
  accessDistanceKm: number;
  result: PlanEvaluation;
};

export type RouteNearestRelevantSearchResult = {
  search: RouteNearestRelevantSearch;
  selected: CandidateEvaluation | null;
};

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}
function inParis(point: Coordinate): boolean {
  return point[0] >= PARIS_INTRA_MUROS_BOUNDS.south &&
    point[0] <= PARIS_INTRA_MUROS_BOUNDS.north &&
    point[1] >= PARIS_INTRA_MUROS_BOUNDS.west &&
    point[1] <= PARIS_INTRA_MUROS_BOUNDS.east;
}
function referenceRadiusKm(reference: RouteNearestRelevantReference): number {
  return reference.kind === "zone" ? reference.radiusKm ?? 0 : 0;
}

function distanceFromReferenceKm(reference: RouteNearestRelevantReference, point: Coordinate): number {
  return Math.max(
    0,
    haversineMeters(reference.center, point) / 1000 - referenceRadiusKm(reference),
  );
}

function cumulativeDistanceKm(reference: RouteNearestRelevantReference, point: Coordinate): number {
  return haversineMeters(reference.center, point) / 1000;
}

function nodeCoordinates(graph: PedestrianNetworkGraph): Array<{ id: string; point: Coordinate }> {
  const nodes = new Map<string, Coordinate>();
  const outgoing = new Set<string>();
  for (const edge of graph.edges) {
    const first = edge.coordinates[0];
    const last = edge.coordinates.at(-1);
    if (first) nodes.set(edge.fromNodeId, first);
    if (last) nodes.set(edge.toNodeId, last);
    outgoing.add(edge.fromNodeId);
  }
  return [...nodes.entries()]
    .map(([id, point]) => ({ id, point }))
    .filter(({ id, point }) => inParis(point) && outgoing.has(id))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function candidateNodesForRadius(
  nodes: readonly { id: string; point: Coordinate }[],
  reference: RouteNearestRelevantReference,
  previousRadiusKm: number,
  radiusKm: number,
): Array<{ id: string; point: Coordinate; accessDistanceKm: number }> {
  const lowerBound = referenceRadiusKm(reference) + previousRadiusKm;
  const upperBound = referenceRadiusKm(reference) + radiusKm;
  const candidates = nodes
    .map((node) => ({
      ...node,
      cumulativeDistanceKm: cumulativeDistanceKm(reference, node.point),
      accessDistanceKm: distanceFromReferenceKm(reference, node.point),
    }))
    .filter(({ cumulativeDistanceKm: distance }) =>
      distance <= upperBound + Number.EPSILON &&
      (previousRadiusKm === 0 || distance > lowerBound + Number.EPSILON),
    )
    .sort((left, right) =>
      left.accessDistanceKm - right.accessDistanceKm || left.id.localeCompare(right.id),
    );

  return candidates.slice(0, ROUTE_NEAREST_RELEVANT_MAX_CANDIDATES_PER_RADIUS);
}

function assessmentIsSufficient(assessment: RoutePollutionRelevanceAssessment): boolean {
  const groupAssessments = assessment.groups.length > 0 ? assessment.groups : [
    {
      score: assessment.score,
      confidence: assessment.confidence,
      status: assessment.status === "evaluated" ? "available" : "unavailable",
      warning: assessment.warning,
    },
  ];
  return assessment.status === "evaluated" &&
    assessment.score !== null &&
    assessment.score >= 65 &&
    assessment.confidence.score !== null &&
    assessment.confidence.score >= ROUTE_POLLUTION_RELEVANCE_POLICY.minimumConfidenceScore &&
    groupAssessments.every((group) =>
      group.status !== "unavailable" &&
      group.score !== null &&
      group.score >= 65 &&
      group.confidence.score !== null &&
      group.confidence.score >= ROUTE_POLLUTION_RELEVANCE_POLICY.minimumConfidenceScore &&
      group.warning === "none",
    );
}

function compareAcceptable(left: CandidateEvaluation, right: CandidateEvaluation): number {
  return left.accessDistanceKm - right.accessDistanceKm ||
    (right.result.relevance.score ?? -1) - (left.result.relevance.score ?? -1) ||
    left.origin.latitude - right.origin.latitude ||
    left.origin.longitude - right.origin.longitude;
}

function compareBestAttempt(left: CandidateEvaluation, right: CandidateEvaluation): number {
  return (right.result.relevance.score ?? -1) - (left.result.relevance.score ?? -1) ||
    left.accessDistanceKm - right.accessDistanceKm ||
    left.origin.latitude - right.origin.latitude ||
    left.origin.longitude - right.origin.longitude;
}

async function evaluateWithTimeout(
  evaluate: (origin: RoutePlannerOrigin) => Promise<PlanEvaluation | null>,
  origin: RoutePlannerOrigin,
): Promise<PlanEvaluation | null> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      evaluate(origin),
      new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), ROUTE_NEAREST_RELEVANT_PLAN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function emptySearch(
  reference: RouteNearestRelevantReference,
  baseline: PlanEvaluation,
  reason: RouteNearestRelevantSearch["reason"],
  status: RouteNearestRelevantSearch["status"],
  overrides: Partial<RouteNearestRelevantSearch> = {},
): RouteNearestRelevantSearch {
  return {
    schemaVersion: ROUTE_NEAREST_RELEVANT_POLICY_VERSION,
    status,
    reason,
    requestedOrigin: {
      kind: reference.kind,
      center: { latitude: reference.center[0], longitude: reference.center[1] },
      source: reference.source,
      ...(reference.label ? { label: reference.label } : {}),
      ...(reference.radiusKm !== undefined ? { radiusKm: reference.radiusKm } : {}),
      ...(reference.bounds ? { bounds: { ...reference.bounds } } : {}),
    },
    rendezvous: null,
    accessDistanceKm: null,
    accessDurationMinutes: null,
    radiusKm: null,
    scoreBefore: baseline.relevance.score,
    scoreAfter: null,
    confidenceBefore: baseline.relevance.confidence.score,
    confidenceAfter: null,
    routingStatus: "unavailable",
    triedRadiiKm: [],
    candidatesEvaluated: 0,
    plansEvaluated: 0,
    bestAttempt: null,
    policy: {
      version: ROUTE_NEAREST_RELEVANT_POLICY_VERSION,
      acceptanceScore: 65,
      minimumConfidenceScore: ROUTE_POLLUTION_RELEVANCE_POLICY.minimumConfidenceScore,
      radiiKm: ROUTE_NEAREST_RELEVANT_RADII_KM,
    },
    limitations: [],
    ...overrides,
  };
}

export function buildRouteNearestRelevantProbePoints(reference: RouteNearestRelevantReference): Array<{ latitude: number; longitude: number }> {
  const maximumDistanceKm = referenceRadiusKm(reference) + ROUTE_NEAREST_RELEVANT_RADII_KM.at(-1)!;
  const latitudeDelta = maximumDistanceKm / 111.32;
  const longitudeDelta = maximumDistanceKm / Math.max(1, 111.32 * Math.cos((reference.center[0] * Math.PI) / 180));
  return [
    { latitude: reference.center[0], longitude: reference.center[1] },
    { latitude: reference.center[0] - latitudeDelta, longitude: reference.center[1] },
    { latitude: reference.center[0] + latitudeDelta, longitude: reference.center[1] },
    { latitude: reference.center[0], longitude: reference.center[1] - longitudeDelta },
    { latitude: reference.center[0], longitude: reference.center[1] + longitudeDelta },
  ].filter(({ latitude, longitude }) => inParis([latitude, longitude]));
}

export function createRouteNearestRelevantReference(input: {
  origin?: RoutePlannerOrigin & { label?: string };
  zone?: {
    label: string;
    center: { latitude: number; longitude: number };
    radiusKm: number;
    bounds?: { south: number; west: number; north: number; east: number };
  };
}): RouteNearestRelevantReference | null {
  if (input.origin) {
    return {
      kind: "precise",
      center: [input.origin.latitude, input.origin.longitude],
      source: input.origin.source,
      ...(input.origin.label ? { label: input.origin.label } : {}),
    };
  }
  if (input.zone) {
    return {
      kind: "zone",
      center: [input.zone.center.latitude, input.zone.center.longitude],
      source: "zone",
      label: input.zone.label,
      radiusKm: input.zone.radiusKm,
      ...(input.zone.bounds ? { bounds: { ...input.zone.bounds } } : {}),
    };
  }
  return null;
}

export async function findNearestRelevantRoute(input: {
  graph: PedestrianNetworkGraph | null;
  reference: RouteNearestRelevantReference;
  baseline: PlanEvaluation;
  evaluate: (origin: RoutePlannerOrigin) => Promise<PlanEvaluation | null>;
}): Promise<RouteNearestRelevantSearchResult> {
  if (!input.graph || input.graph.edges.length === 0) {
    return { search: emptySearch(input.reference, input.baseline, "network_unavailable", "unavailable", {
      limitations: ["Le graphe piéton actif est indisponible ou ne couvre pas la recherche bornée."],
    }), selected: null };
  }

  const nodes = nodeCoordinates(input.graph);
  if (nodes.length === 0) {
    return { search: emptySearch(input.reference, input.baseline, "network_unavailable", "unavailable", {
      limitations: ["Aucun départ piéton admissible n’est couvert par le graphe actif dans Paris intra-muros."],
    }), selected: null };
  }

  const evaluated: CandidateEvaluation[] = [];
  const triedRadiiKm: number[] = [];
  let providerCalls = 0;
  let previousRadiusKm = 0;
  for (const radiusKm of ROUTE_NEAREST_RELEVANT_RADII_KM) {
    triedRadiiKm.push(radiusKm);
    const candidates = candidateNodesForRadius(nodes, input.reference, previousRadiusKm, radiusKm);
    const successfulPlans: CandidateEvaluation[] = [];
    for (const candidate of candidates) {
      if (evaluated.length >= ROUTE_NEAREST_RELEVANT_MAX_PLAN_EVALUATIONS) break;
      const origin: RoutePlannerOrigin = {
        latitude: candidate.point[0],
        longitude: candidate.point[1],
        source: "planner",
      };
      const result = await evaluateWithTimeout(input.evaluate, origin);
      if (!result) continue;
      providerCalls += Math.max(0, result.providerCalls ?? 0);
      const evaluation: CandidateEvaluation = {
        origin,
        radiusKm,
        accessDistanceKm: round(candidate.accessDistanceKm),
        result,
      };
      evaluated.push(evaluation);
      if (assessmentIsSufficient(result.relevance) && result.withinBudget && result.loopVerified) {
        successfulPlans.push(evaluation);
      }
      if (providerCalls >= ROUTE_NEAREST_RELEVANT_MAX_PROVIDER_CALLS) break;
    }
    if (successfulPlans.length > 0) {
      const selected = [...successfulPlans].sort(compareAcceptable)[0]!;
      return {
        selected,
        search: {
          ...emptySearch(input.reference, input.baseline, "found", "found"),
          rendezvous: { latitude: selected.origin.latitude, longitude: selected.origin.longitude, source: "planner" },
          accessDistanceKm: selected.accessDistanceKm,
          accessDurationMinutes: Math.round(travelMinutesForDistance(selected.accessDistanceKm)),
          radiusKm,
          scoreAfter: selected.result.relevance.score,
          confidenceAfter: selected.result.relevance.confidence.score,
          routingStatus: selected.result.routingStatus,
          triedRadiiKm,
          candidatesEvaluated: evaluated.length,
          plansEvaluated: evaluated.length,
          limitations: ["La recherche a retenu le premier rayon contenant une boucle admissible ; l’accès est mesuré depuis la demande initiale."],
        },
      };
    }
    previousRadiusKm = radiusKm;
    if (evaluated.length >= ROUTE_NEAREST_RELEVANT_MAX_PLAN_EVALUATIONS || providerCalls >= ROUTE_NEAREST_RELEVANT_MAX_PROVIDER_CALLS) break;
  }

  const bestAttempt = [...evaluated]
    .filter(({ result }) => result.relevance.score !== null && result.relevance.confidence.score !== null)
    .sort(compareBestAttempt)[0] ?? null;
  const hasScore = evaluated.some(({ result }) => result.relevance.score !== null);
  const hasConfidence = evaluated.some(({ result }) => result.relevance.confidence.score !== null);
  const reason: RouteNearestRelevantSearch["reason"] = !hasScore
    ? "score_unavailable"
    : !hasConfidence
      ? "confidence_insufficient"
      : bestAttempt?.result.relevance.groups.some((group) =>
          group.score === null || group.score < 65 || group.warning !== "none",
        )
        ? "group_below_threshold"
      : bestAttempt && (bestAttempt.result.relevance.score ?? 0) < 65
        ? "score_below_threshold"
        : "no_admissible_route";
  return {
    selected: null,
    search: {
      ...emptySearch(input.reference, input.baseline, reason, "not_found"),
      triedRadiiKm,
      candidatesEvaluated: evaluated.length,
      plansEvaluated: evaluated.length,
      routingStatus: bestAttempt?.result.routingStatus ?? "unavailable",
      bestAttempt: bestAttempt
        ? {
            score: bestAttempt.result.relevance.score,
            confidenceScore: bestAttempt.result.relevance.confidence.score,
            sufficient: false,
            radiusKm: bestAttempt.radiusKm,
            accessDistanceKm: bestAttempt.accessDistanceKm,
            rendezvous: bestAttempt.origin,
            routingStatus: bestAttempt.result.routingStatus,
          }
        : null,
      limitations: ["Aucune boucle ne respecte simultanément le seuil de pertinence, la confiance, la sécurité et les budgets dans les rayons explorés."],
    },
  };
}
