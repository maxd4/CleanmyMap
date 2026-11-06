import {
  haversineMeters,
  shortestPedestrianAccessFromSources,
  type Coordinate,
  type PedestrianNetworkGraph,
} from "./pedestrian-network";
import { travelMinutesForDistance, type RoutePlannerOrigin } from "./route-planner";
import {
  ROUTE_POLLUTION_RELEVANCE_POLICY,
  type RoutePollutionRelevanceAssessment,
} from "./route-pollution-relevance";
import parisPressureSnapshot from "../../../data/geospatial/paris-pressure-snapshot.json";
import { pointInParisPressureGeometry } from "@/lib/geo/paris-pressure-geometry-core.mjs";
import type { ParisPressureGeometry } from "@/lib/geo/paris-pressure-spatial-types";
import { createRouteRoutingOperationBudget, type RouteRoutingOperationBudget } from "./route-routing-operation-budget";

export const ROUTE_NEAREST_RELEVANT_POLICY_VERSION =
  "route-nearest-relevant-v1" as const;

export const ROUTE_NEAREST_RELEVANT_RADII_KM = [0.5, 1, 2, 3, 5] as const;
export const ROUTE_NEAREST_RELEVANT_MAX_CANDIDATES_PER_RADIUS = 8;
export const ROUTE_NEAREST_RELEVANT_MAX_PLAN_EVALUATIONS = 40;
export const ROUTE_NEAREST_RELEVANT_MAX_PROVIDER_CALLS = 4;
export const ROUTE_NEAREST_RELEVANT_PLAN_TIMEOUT_MS = 3_000;
export const ROUTE_NEAREST_RELEVANT_SEARCH_TIMEOUT_MS = 12_000;

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
    | "network_unavailable"
    | "no_candidate"
    | "quota_exhausted"
    | "evaluation_failed";
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

type TimedEvaluation = {
  result: PlanEvaluation | null;
  timedOut: boolean;
  failed: boolean;
  aborted: boolean;
};

type CandidateEvaluation = {
  origin: RoutePlannerOrigin;
  radiusKm: number;
  accessDistanceKm: number;
  result: PlanEvaluation;
};

type CandidateNodesResult = {
  candidates: Array<{ id: string; point: Coordinate; accessDistanceKm: number }>;
  considered: number;
  networkAccessFailures: number;
  aborted: boolean;
  timedOut: boolean;
};

export type RouteNearestRelevantSearchResult = {
  search: RouteNearestRelevantSearch;
  selected: CandidateEvaluation | null;
};

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}
function inParis(point: Coordinate): boolean {
  const insideEnvelope = point[0] >= PARIS_INTRA_MUROS_BOUNDS.south &&
    point[0] <= PARIS_INTRA_MUROS_BOUNDS.north &&
    point[1] >= PARIS_INTRA_MUROS_BOUNDS.west &&
    point[1] <= PARIS_INTRA_MUROS_BOUNDS.east;
  if (!insideEnvelope) return false;
  return parisPressureSnapshot.zones.some((zone: { geometry: unknown }) =>
    pointInParisPressureGeometry(
      { latitude: point[0], longitude: point[1] },
      zone.geometry as ParisPressureGeometry,
    ),
  );
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

function relativeDistanceKm(reference: RouteNearestRelevantReference, point: Coordinate): number {
  return reference.kind === "zone"
    ? distanceFromReferenceKm(reference, point)
    : cumulativeDistanceKm(reference, point);
}

function pointInReferenceZone(reference: RouteNearestRelevantReference, point: Coordinate): boolean {
  if (reference.kind !== "zone") return false;
  const bounds = reference.bounds;
  const insideBounds = !bounds || (
    point[0] >= bounds.south && point[0] <= bounds.north &&
    point[1] >= bounds.west && point[1] <= bounds.east
  );
  return insideBounds && cumulativeDistanceKm(reference, point) <= referenceRadiusKm(reference) + Number.EPSILON;
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
  graph: PedestrianNetworkGraph,
  options: { signal?: AbortSignal; deadlineMs: number },
): CandidateNodesResult {
  const candidates = nodes
    .map((node) => ({
      ...node,
      relativeDistanceKm: relativeDistanceKm(reference, node.point),
    }))
    .filter(({ relativeDistanceKm: distance }) =>
      distance <= radiusKm + Number.EPSILON &&
      (reference.kind === "zone" || distance > Number.EPSILON) &&
      (previousRadiusKm === 0 || distance > previousRadiusKm + Number.EPSILON),
    )
    .sort((left, right) =>
      left.relativeDistanceKm - right.relativeDistanceKm || left.id.localeCompare(right.id),
    );

  const boundedCandidates = candidates.slice(0, ROUTE_NEAREST_RELEVANT_MAX_CANDIDATES_PER_RADIUS);
  const accessPoints = reference.kind === "zone"
    ? nodes.filter(({ point }) => pointInReferenceZone(reference, point))
    : [{ id: "precise-origin", point: reference.center }];
  const access = shortestPedestrianAccessFromSources(
    graph,
    accessPoints.map(({ point }) => point),
    boundedCandidates.map(({ point }) => point),
    {
      sourceNodeIds: reference.kind === "zone" ? accessPoints.map(({ id }) => id) : undefined,
      maxSnapDistanceM: reference.kind === "precise" ? 0 : undefined,
      signal: options.signal,
      deadlineMs: options.deadlineMs,
      maxSettledNodes: 20_000,
    },
  );
  const routedCandidates = boundedCandidates.flatMap((candidate) => {
    if (!access.finalizedTargetNodeIds.has(candidate.id)) return [];
    const distanceM = access.distancesM.get(candidate.id);
    return distanceM === undefined ? [] : [{ id: candidate.id, point: candidate.point, accessDistanceKm: distanceM / 1000 }];
  });
  return {
    candidates: routedCandidates,
    considered: boundedCandidates.length,
    networkAccessFailures: boundedCandidates.length - routedCandidates.length,
    aborted: access.aborted,
    timedOut: access.timedOut,
  };
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

function isAborted(signal: AbortSignal | undefined): boolean {
  return Boolean(signal?.aborted);
}

async function evaluateWithTimeout(
  evaluate: (origin: RoutePlannerOrigin, signal: AbortSignal, budget: RouteRoutingOperationBudget) => Promise<PlanEvaluation | null>,
  origin: RoutePlannerOrigin,
  timeoutMs: number,
  parentSignal?: AbortSignal,
  routingBudget?: RouteRoutingOperationBudget,
): Promise<TimedEvaluation> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  if (parentSignal?.aborted) return { result: null, timedOut: false, failed: false, aborted: true };
  const abortExternal = () => controller.abort();
  parentSignal?.addEventListener("abort", abortExternal, { once: true });
  try {
    const evaluation = Promise.resolve()
      .then(() => evaluate(origin, controller.signal, routingBudget!))
      .then((result) => ({ result, timedOut: false, failed: false, aborted: false }))
      .catch(() => ({ result: null, timedOut: false, failed: !controller.signal.aborted, aborted: controller.signal.aborted }));
    const timeout = new Promise<TimedEvaluation>((resolve) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          resolve({ result: null, timedOut: true, failed: false, aborted: false });
        }, timeoutMs);
      });
    const aborted = parentSignal
      ? new Promise<TimedEvaluation>((resolve) => {
          parentSignal.addEventListener("abort", () => resolve({ result: null, timedOut: false, failed: false, aborted: true }), { once: true });
        })
      : null;
    return await Promise.race(aborted ? [evaluation, timeout, aborted] : [evaluation, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    parentSignal?.removeEventListener("abort", abortExternal);
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

function deriveSearchFailureReason(input: {
  candidateCount: number;
  evaluatedCount: number;
  networkAccessFailures: number;
  failedAttempts: number;
  quotaExhausted: boolean;
  hasScore: boolean;
  hasConfidence: boolean;
  bestAttempt: CandidateEvaluation | null;
}): RouteNearestRelevantSearch["reason"] {
  if (input.candidateCount === 0) return "no_candidate";
  if (input.quotaExhausted && input.evaluatedCount === 0) return "quota_exhausted";
  if (input.failedAttempts > 0 && input.evaluatedCount === 0) return "evaluation_failed";
  if (input.evaluatedCount === 0 && input.networkAccessFailures > 0) return "network_unavailable";
  if (input.evaluatedCount > 0 && !input.hasScore) return "score_unavailable";
  if (!input.hasConfidence) return "confidence_insufficient";
  if (input.bestAttempt?.result.relevance.groups.some((group) =>
    group.score === null || group.score < 65 || group.warning !== "none",
  )) return "group_below_threshold";
  if (input.bestAttempt && (input.bestAttempt.result.relevance.score ?? 0) < 65) return "score_below_threshold";
  return "no_admissible_route";
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
  evaluate: (origin: RoutePlannerOrigin, signal: AbortSignal, budget: RouteRoutingOperationBudget) => Promise<PlanEvaluation | null>;
  signal?: AbortSignal;
}): Promise<RouteNearestRelevantSearchResult> {
  if (isAborted(input.signal)) {
    return {
      selected: null,
      search: emptySearch(input.reference, input.baseline, "no_admissible_route", "unavailable", {
        limitations: ["La recherche a été annulée avant toute opération de routage."],
      }),
    };
  }
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
  let attemptsEvaluated = 0;
  const routingBudget = createRouteRoutingOperationBudget({
    limit: ROUTE_NEAREST_RELEVANT_MAX_PROVIDER_CALLS,
    consumed: input.baseline.providerCalls ?? 0,
  });
  let providerCalls = routingBudget.consumed;
  let previousRadiusKm = 0;
  const startedAt = Date.now();
  let timedOutAttempts = 0;
  let failedAttempts = 0;
  let networkAccessFailures = 0;
  let candidateCount = 0;
  let quotaExhausted = false;
  let searchTimedOut = false;
  let searchAborted = isAborted(input.signal);
  for (const radiusKm of ROUTE_NEAREST_RELEVANT_RADII_KM) {
    triedRadiiKm.push(radiusKm);
    const candidateResult = candidateNodesForRadius(nodes, input.reference, previousRadiusKm, radiusKm, input.graph, {
      signal: input.signal,
      deadlineMs: startedAt + ROUTE_NEAREST_RELEVANT_SEARCH_TIMEOUT_MS,
    });
    const candidates = candidateResult.candidates;
    candidateCount += candidateResult.considered;
    networkAccessFailures += candidateResult.networkAccessFailures;
    if (candidateResult.timedOut) searchTimedOut = true;
    if (candidateResult.aborted) searchAborted = true;
    const successfulPlans: CandidateEvaluation[] = [];
    for (const candidate of candidates) {
      if (isAborted(input.signal)) {
        searchAborted = true;
        break;
      }
      if (attemptsEvaluated >= ROUTE_NEAREST_RELEVANT_MAX_PLAN_EVALUATIONS) break;
      const origin: RoutePlannerOrigin = {
        latitude: candidate.point[0],
        longitude: candidate.point[1],
        source: "planner",
      };
      if (routingBudget.remaining() < 1) {
        quotaExhausted = true;
        break;
      }
      const remainingMs = ROUTE_NEAREST_RELEVANT_SEARCH_TIMEOUT_MS - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        searchTimedOut = true;
        break;
      }
      const evaluation = await evaluateWithTimeout(
        input.evaluate,
        origin,
        Math.min(ROUTE_NEAREST_RELEVANT_PLAN_TIMEOUT_MS, remainingMs),
        input.signal,
        routingBudget,
      );
      attemptsEvaluated += 1;
      const observedCalls = routingBudget.consumed - providerCalls;
      const reportedCalls = Math.max(0, evaluation.result?.providerCalls ?? 0);
      const missingCalls = Math.max(0, reportedCalls - observedCalls) || (observedCalls === 0 ? 1 : 0);
      if (missingCalls > 0 && !routingBudget.tryConsume(missingCalls)) {
        quotaExhausted = true;
        continue;
      }
      providerCalls = routingBudget.consumed;
      if (routingBudget.remaining() === 0) quotaExhausted = true;
      if (evaluation.timedOut) timedOutAttempts += 1;
      if (evaluation.failed) failedAttempts += 1;
      if (evaluation.aborted) {
        searchAborted = true;
        break;
      }
      if (!evaluation.result) continue;
      const candidateEvaluation: CandidateEvaluation = {
        origin,
        radiusKm,
        accessDistanceKm: round(candidate.accessDistanceKm),
        result: evaluation.result,
      };
      evaluated.push(candidateEvaluation);
      if (candidateEvaluation.result.routingStatus === "network" &&
        assessmentIsSufficient(candidateEvaluation.result.relevance) &&
        candidateEvaluation.result.withinBudget && candidateEvaluation.result.loopVerified) {
        successfulPlans.push(candidateEvaluation);
      }
      if (routingBudget.remaining() === 0) break;
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
          candidatesEvaluated: attemptsEvaluated,
          plansEvaluated: attemptsEvaluated,
          limitations: [
            "La recherche est bornée à huit candidats par rayon ; l’accès est mesuré sur le graphe piéton dirigé depuis " +
              (input.reference.kind === "zone" ? "un point d’accès vérifié dans la zone." : "le départ précis demandé."),
          ],
        },
      };
    }
    previousRadiusKm = radiusKm;
    if (searchAborted || searchTimedOut || attemptsEvaluated >= ROUTE_NEAREST_RELEVANT_MAX_PLAN_EVALUATIONS || providerCalls >= ROUTE_NEAREST_RELEVANT_MAX_PROVIDER_CALLS) break;
  }

  const bestAttempt = [...evaluated]
    .filter(({ result }) => result.relevance.score !== null && result.relevance.confidence.score !== null)
    .sort(compareBestAttempt)[0] ?? null;
  const hasScore = evaluated.some(({ result }) => result.relevance.score !== null);
  const hasConfidence = evaluated.some(({ result }) => result.relevance.confidence.score !== null);
  const reason = deriveSearchFailureReason({
    candidateCount,
    evaluatedCount: evaluated.length,
    networkAccessFailures,
    failedAttempts,
    quotaExhausted,
    hasScore,
    hasConfidence,
    bestAttempt,
  });
  return {
    selected: null,
    search: {
      ...emptySearch(
        input.reference,
        input.baseline,
        reason,
        (reason === "network_unavailable" || reason === "no_candidate") && evaluated.length === 0 ? "unavailable" : "not_found",
      ),
      triedRadiiKm,
      candidatesEvaluated: attemptsEvaluated,
      plansEvaluated: attemptsEvaluated,
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
      limitations: [
        "Aucune boucle ne respecte simultanément le seuil de pertinence, la confiance, la sécurité et les budgets dans les rayons explorés.",
        ...(reason === "network_unavailable" ? ["Aucun chemin piéton dirigé vérifiable ne relie les candidats à un point d’accès admissible de la zone ou au départ précis."] : []),
        ...(reason === "no_candidate" ? ["Aucun rendez-vous admissible n’a été trouvé dans les rayons explorés."] : []),
        ...(reason === "quota_exhausted" ? ["Le quota fournisseur était épuisé avant une première évaluation."] : []),
        ...(reason === "evaluation_failed" ? ["Les évaluations disponibles ont échoué avant de produire un score."] : []),
        ...(timedOutAttempts > 0 ? [`${timedOutAttempts} évaluation(s) ont expiré après ${ROUTE_NEAREST_RELEVANT_PLAN_TIMEOUT_MS} ms.`] : []),
        ...(failedAttempts > 0 ? [`${failedAttempts} évaluation(s) fournisseur ont échoué et ont été comptées dans le quota.`] : []),
        ...(searchTimedOut ? [`Le budget global de ${ROUTE_NEAREST_RELEVANT_SEARCH_TIMEOUT_MS} ms a été atteint.`] : []),
        ...(searchAborted ? ["La recherche a été annulée avant toute opération de routage ultérieure."] : []),
      ],
    },
  };
}
