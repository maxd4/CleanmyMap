import type { RouteGeometry, RouteGeometryLeg, RouteTopology } from "./route-contract";

export const PEDESTRIAN_NETWORK_IMPORTER_VERSION = "pedestrian-network-v2" as const;
export const PEDESTRIAN_NETWORK_KEY = "paris-pantheon-jardin-des-plantes" as const;

export type Coordinate = [latitude: number, longitude: number];

export type PedestrianNetworkBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type OsmNodeInput = {
  id: string;
  latitude: number;
  longitude: number;
};

export type OsmWayInput = {
  id: string;
  tags: Record<string, string>;
  nodes: OsmNodeInput[];
};

export type PedestrianAccessStatus = "allowed" | "forbidden" | "unknown";
export type PedestrianDirection = "forward" | "reverse" | "bidirectional";

export type PedestrianNetworkNode = OsmNodeInput & {
  componentId: string | null;
};

export type PedestrianNetworkEdge = {
  edgeKey: string;
  osmWayId: string;
  segmentIndex: number;
  direction: Exclude<PedestrianDirection, "bidirectional">;
  fromNodeId: string;
  toNodeId: string;
  highway: string;
  name: string | null;
  accessStatus: "allowed";
  lengthM: number;
  coordinates: Coordinate[];
  tags: Record<string, string>;
};

export type PedestrianNetworkPointResolution = {
  nodeId: string;
  coordinate: Coordinate;
  distanceM: number;
  resolution: "exact_node" | "exact_edge" | "nearest_verified_node";
};

export const MAX_PEDESTRIAN_NETWORK_SNAP_DISTANCE_M = 50;

export type PedestrianNetworkMultiSourceAccess = {
  distancesM: Map<string, number>;
  resolvedTargetNodeIds: Set<string>;
  finalizedTargetNodeIds: Set<string>;
  inaccessibleTargetNodeIds: Set<string>;
  aborted: boolean;
  timedOut: boolean;
};

export type PedestrianNetworkConnection = {
  fromNodeId: string;
  toNodeId: string;
  edgeKey: string;
};

export type PedestrianNetworkDiagnostic = {
  entityType: "way" | "segment" | "component" | "source";
  osmWayId: string | null;
  segmentIndex: number | null;
  reasonCode:
    | "unsupported_highway"
    | "access_forbidden"
    | "access_unknown"
    | "missing_geometry"
    | "missing_node"
    | "zero_length_segment"
    | "disconnected_component"
    | "connected_component";
  message: string;
  metadata: Record<string, unknown>;
};

export type PedestrianNetworkImportResult = {
  networkKey: typeof PEDESTRIAN_NETWORK_KEY;
  importerVersion: typeof PEDESTRIAN_NETWORK_IMPORTER_VERSION;
  bounds: PedestrianNetworkBounds;
  sourceSha256: string;
  sourceRetrievedAt: string;
  nodes: PedestrianNetworkNode[];
  edges: PedestrianNetworkEdge[];
  connections: PedestrianNetworkConnection[];
  diagnostics: PedestrianNetworkDiagnostic[];
  counts: {
    sourceWays: number;
    acceptedWays: number;
    sourceNodes: number;
    nodes: number;
    edges: number;
    connections: number;
    rejectedWays: number;
    rejectedSegments: number;
    components: number;
    disconnectedComponents: number;
    intersectionNodes: number;
  };
};

export type PedestrianNetworkGraph = {
  versionId: string;
  networkKey: string;
  sourceRetrievedAt: string;
  bounds: PedestrianNetworkBounds;
  edges: PedestrianNetworkEdge[];
};

const KNOWN_PEDESTRIAN_HIGHWAYS = new Set([
  "corridor",
  "footway",
  "path",
  "pedestrian",
  "steps",
]);

const SUPPORTED_HIGHWAYS = new Set([
  ...KNOWN_PEDESTRIAN_HIGHWAYS,
  "bridleway",
  "cycleway",
  "track",
  "living_street",
  "primary",
  "residential",
  "secondary",
  "service",
  "tertiary",
  "unclassified",
]);

const FORBIDDEN_VALUES = new Set(["no", "private", "prohibited", "restricted"]);
const ALLOWED_VALUES = new Set(["designated", "permissive", "yes"]);
const FORWARD_VALUES = new Set(["1", "true", "yes"]);
const REVERSE_VALUES = new Set(["-1", "reverse"]);
const EPSILON_METERS = 0.01;

function normalizedTag(tags: Record<string, string>, key: string): string | null {
  const value = tags[key];
  return typeof value === "string" && value.trim() !== ""
    ? value.trim().toLowerCase()
    : null;
}

function finiteCoordinate(point: Coordinate): boolean {
  return Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    point[0] >= -90 && point[0] <= 90 && point[1] >= -180 && point[1] <= 180;
}

function insideBounds(point: Coordinate, bounds: PedestrianNetworkBounds): boolean {
  return point[0] >= bounds.south && point[0] <= bounds.north &&
    point[1] >= bounds.west && point[1] <= bounds.east;
}

export function haversineMeters(left: Coordinate, right: Coordinate): number {
  const latitudeFactor = Math.PI / 180;
  const dLat = (right[0] - left[0]) * latitudeFactor;
  const dLon = (right[1] - left[1]) * latitudeFactor;
  const leftLatitude = left[0] * latitudeFactor;
  const rightLatitude = right[0] * latitudeFactor;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function classifyPedestrianAccess(
  tags: Record<string, string>,
): { status: PedestrianAccessStatus; reason: string } {
  const access = normalizedTag(tags, "access");
  const foot = normalizedTag(tags, "foot");
  if (FORBIDDEN_VALUES.has(access ?? "") || FORBIDDEN_VALUES.has(foot ?? "")) {
    return { status: "forbidden", reason: "explicit_access_restriction" };
  }
  if (ALLOWED_VALUES.has(access ?? "") || ALLOWED_VALUES.has(foot ?? "")) {
    return { status: "allowed", reason: "explicit_pedestrian_access" };
  }
  if (KNOWN_PEDESTRIAN_HIGHWAYS.has(normalizedTag(tags, "highway") ?? "")) {
    return { status: "allowed", reason: "pedestrian_highway" };
  }
  return { status: "unknown", reason: "pedestrian_access_not_proven" };
}

export function resolvePedestrianDirection(
  tags: Record<string, string>,
): PedestrianDirection {
  const footOneway = normalizedTag(tags, "oneway:foot") ?? normalizedTag(tags, "foot:oneway");
  if (footOneway === "no") return "bidirectional";
  if (REVERSE_VALUES.has(footOneway ?? "")) return "reverse";
  if (FORWARD_VALUES.has(footOneway ?? "")) return "forward";

  const oneway = normalizedTag(tags, "oneway");
  if (oneway === "no") return "bidirectional";
  if (REVERSE_VALUES.has(oneway ?? "")) return "reverse";
  if (FORWARD_VALUES.has(oneway ?? "")) return "forward";
  return "bidirectional";
}

function diagnostic(
  partial: Omit<PedestrianNetworkDiagnostic, "metadata"> & { metadata?: Record<string, unknown> },
): PedestrianNetworkDiagnostic {
  return { ...partial, metadata: partial.metadata ?? {} };
}

function addComponentDiagnostics(
  nodes: Map<string, PedestrianNetworkNode>,
  edges: PedestrianNetworkEdge[],
  diagnostics: PedestrianNetworkDiagnostic[],
): { components: number; disconnectedComponents: number; intersectionNodes: number } {
  const adjacency = new Map<string, Set<string>>();
  const degree = new Map<string, number>();
  for (const edge of edges) {
    const from = adjacency.get(edge.fromNodeId) ?? new Set<string>();
    const to = adjacency.get(edge.toNodeId) ?? new Set<string>();
    from.add(edge.toNodeId);
    to.add(edge.fromNodeId);
    adjacency.set(edge.fromNodeId, from);
    adjacency.set(edge.toNodeId, to);
    degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
    degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
  }

  const visited = new Set<string>();
  const components: string[][] = [];
  for (const nodeId of [...adjacency.keys()].sort()) {
    if (visited.has(nodeId)) continue;
    const queue = [nodeId];
    const component: string[] = [];
    visited.add(nodeId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component.sort());
  }

  components.sort((left, right) => left[0]!.localeCompare(right[0]!));
  const largestSize = Math.max(0, ...components.map((component) => component.length));
  for (const component of components) {
    const componentId = `component-${component[0]}`;
    for (const nodeId of component) {
      const node = nodes.get(nodeId);
      if (node) node.componentId = componentId;
    }
    const isDisconnected = component.length < largestSize;
    diagnostics.push(diagnostic({
      entityType: "component",
      osmWayId: null,
      segmentIndex: null,
      reasonCode: isDisconnected ? "disconnected_component" : "connected_component",
      message: isDisconnected
        ? "Composant piéton distinct du plus grand composant du pilote."
        : "Composant piéton principal du pilote.",
      metadata: { componentId, size: component.length, largestSize },
    }));
  }

  return {
    components: components.length,
    disconnectedComponents: components.filter((component) => component.length < largestSize).length,
    intersectionNodes: [...degree.values()].filter((value) => value >= 3).length,
  };
}

export function buildPedestrianNetwork(input: {
  ways: OsmWayInput[];
  bounds: PedestrianNetworkBounds;
  sourceSha256: string;
  sourceRetrievedAt: string;
}): PedestrianNetworkImportResult {
  const nodes = new Map<string, PedestrianNetworkNode>();
  const edges: PedestrianNetworkEdge[] = [];
  const connections: PedestrianNetworkConnection[] = [];
  const diagnostics: PedestrianNetworkDiagnostic[] = [];
  let rejectedWays = 0;
  let rejectedSegments = 0;

  const ways = [...input.ways].sort((left, right) => left.id.localeCompare(right.id));
  for (const way of ways) {
    const highway = normalizedTag(way.tags, "highway");
    if (!highway || !SUPPORTED_HIGHWAYS.has(highway)) {
      rejectedWays += 1;
      diagnostics.push(diagnostic({
        entityType: "way",
        osmWayId: way.id,
        segmentIndex: null,
        reasonCode: "unsupported_highway",
        message: "Type de voie non retenu par le profil piéton du pilote.",
        metadata: { highway },
      }));
      continue;
    }

    const access = classifyPedestrianAccess(way.tags);
    if (access.status !== "allowed") {
      rejectedWays += 1;
      diagnostics.push(diagnostic({
        entityType: "way",
        osmWayId: way.id,
        segmentIndex: null,
        reasonCode: access.status === "forbidden" ? "access_forbidden" : "access_unknown",
        message: access.status === "forbidden"
          ? "Accès piéton explicitement interdit ou privé."
          : "Accès piéton non démontré ; la voie n'est pas déclarée sûre.",
        metadata: { highway, accessReason: access.reason, tags: way.tags },
      }));
      continue;
    }

    const direction = resolvePedestrianDirection(way.tags);
    if (way.nodes.length < 2) {
      rejectedWays += 1;
      diagnostics.push(diagnostic({
        entityType: "way",
        osmWayId: way.id,
        segmentIndex: null,
        reasonCode: "missing_geometry",
        message: "La voie ne contient pas deux nœuds géométriques.",
      }));
      continue;
    }

    let wayAccepted = false;
    for (let segmentIndex = 0; segmentIndex < way.nodes.length - 1; segmentIndex += 1) {
      const first = way.nodes[segmentIndex];
      const second = way.nodes[segmentIndex + 1];
      if (!first || !second || !finiteCoordinate([first.latitude, first.longitude]) || !finiteCoordinate([second.latitude, second.longitude])) {
        rejectedSegments += 1;
        diagnostics.push(diagnostic({
          entityType: "segment",
          osmWayId: way.id,
          segmentIndex,
          reasonCode: "missing_node",
          message: "Nœud OSM absent ou coordonnées invalides.",
        }));
        continue;
      }
      const firstPoint: Coordinate = [first.latitude, first.longitude];
      const secondPoint: Coordinate = [second.latitude, second.longitude];
      if (!insideBounds(firstPoint, input.bounds) || !insideBounds(secondPoint, input.bounds)) {
        rejectedSegments += 1;
        diagnostics.push(diagnostic({
          entityType: "segment",
          osmWayId: way.id,
          segmentIndex,
          reasonCode: "missing_geometry",
          message: "Segment hors de l'emprise bornée du pilote.",
        }));
        continue;
      }
      const lengthM = haversineMeters(firstPoint, secondPoint);
      if (lengthM <= EPSILON_METERS) {
        rejectedSegments += 1;
        diagnostics.push(diagnostic({
          entityType: "segment",
          osmWayId: way.id,
          segmentIndex,
          reasonCode: "zero_length_segment",
          message: "Segment géométrique de longueur nulle ignoré.",
        }));
        continue;
      }

      const directions: Array<Exclude<PedestrianDirection, "bidirectional">> = direction === "bidirectional"
        ? ["forward", "reverse"]
        : [direction];
      for (const edgeDirection of directions) {
        const isReverse = edgeDirection === "reverse";
        const from = isReverse ? second : first;
        const to = isReverse ? first : second;
        const edgeKey = `${way.id}:${segmentIndex}:${edgeDirection}`;
        edges.push({
          edgeKey,
          osmWayId: way.id,
          segmentIndex,
          direction: edgeDirection,
          fromNodeId: from.id,
          toNodeId: to.id,
          highway,
          name: way.tags.name?.trim() || null,
          accessStatus: "allowed",
          lengthM,
          coordinates: isReverse
            ? [[second.latitude, second.longitude], [first.latitude, first.longitude]]
            : [[first.latitude, first.longitude], [second.latitude, second.longitude]],
          tags: { ...way.tags },
        });
        connections.push({ fromNodeId: from.id, toNodeId: to.id, edgeKey });
        for (const node of [from, to]) {
          if (!nodes.has(node.id)) nodes.set(node.id, { ...node, componentId: null });
        }
      }
      wayAccepted = true;
    }
    if (!wayAccepted) rejectedWays += 1;
  }

  edges.sort((left, right) => left.edgeKey.localeCompare(right.edgeKey));
  connections.sort((left, right) => left.edgeKey.localeCompare(right.edgeKey));
  const componentStats = addComponentDiagnostics(nodes, edges, diagnostics);
  const acceptedWayIds = new Set(edges.map((edge) => edge.osmWayId));

  return {
    networkKey: PEDESTRIAN_NETWORK_KEY,
    importerVersion: PEDESTRIAN_NETWORK_IMPORTER_VERSION,
    bounds: input.bounds,
    sourceSha256: input.sourceSha256,
    sourceRetrievedAt: input.sourceRetrievedAt,
    nodes: [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges,
    connections,
    diagnostics,
    counts: {
      sourceWays: input.ways.length,
      acceptedWays: acceptedWayIds.size,
      sourceNodes: new Set(input.ways.flatMap((way) => way.nodes.map((node) => node.id))).size,
      nodes: nodes.size,
      edges: edges.length,
      connections: connections.length,
      rejectedWays,
      rejectedSegments,
      components: componentStats.components,
      disconnectedComponents: componentStats.disconnectedComponents,
      intersectionNodes: componentStats.intersectionNodes,
    },
  };
}

export function resolvePedestrianNetworkPoint(
  point: Coordinate,
  nodes: Map<string, Coordinate>,
  maxSnapDistanceM = MAX_PEDESTRIAN_NETWORK_SNAP_DISTANCE_M,
): PedestrianNetworkPointResolution | null {
  let nearest: PedestrianNetworkPointResolution | null = null;
  for (const [id, node] of nodes) {
    const distanceM = haversineMeters(point, node);
    if (!nearest || distanceM < nearest.distanceM ||
      (distanceM === nearest.distanceM && id.localeCompare(nearest.nodeId) < 0)) {
      nearest = {
        nodeId: id,
        coordinate: node,
        distanceM,
        resolution: distanceM === 0 ? "exact_node" : "nearest_verified_node",
      };
    }
  }
  return nearest && nearest.distanceM <= maxSnapDistanceM ? nearest : null;
}

const EXACT_EDGE_MATCH_TOLERANCE_M = 0.05;

function resolveExactDirectedEdgePoints(
  point: Coordinate,
  edges: readonly PedestrianNetworkEdge[],
): Array<{ nodeId: string; distanceM: number; errorM: number; edgeKey: string }> {
  const matches = new Map<string, { nodeId: string; distanceM: number; errorM: number; edgeKey: string }>();
  for (const edge of edges) {
    let travelledM = 0;
    let edgeMatch: { nodeId: string; distanceM: number; errorM: number; edgeKey: string } | null = null;
    for (let index = 0; index < edge.coordinates.length - 1; index += 1) {
      const start = edge.coordinates[index]!;
      const end = edge.coordinates[index + 1]!;
      const latitudeScale = 111_320;
      const longitudeScale = latitudeScale * Math.cos((point[0] * Math.PI) / 180);
      const dx = (end[1] - start[1]) * longitudeScale;
      const dy = (end[0] - start[0]) * latitudeScale;
      const px = (point[1] - start[1]) * longitudeScale;
      const py = (point[0] - start[0]) * latitudeScale;
      const lengthSquared = dx * dx + dy * dy;
      const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared));
      const projected: Coordinate = [start[0] + ((end[0] - start[0]) * fraction), start[1] + ((end[1] - start[1]) * fraction)];
      const errorM = haversineMeters(point, projected);
      const segmentLengthM = haversineMeters(start, end);
      if (errorM <= EXACT_EDGE_MATCH_TOLERANCE_M) {
        const distanceM = Math.max(
          0,
          edge.lengthM - travelledM - (fraction * segmentLengthM),
        );
        const candidate = { nodeId: edge.toNodeId, distanceM, errorM, edgeKey: edge.edgeKey };
        if (!edgeMatch || errorM < edgeMatch.errorM ||
          (errorM === edgeMatch.errorM && distanceM < edgeMatch.distanceM)) {
          edgeMatch = candidate;
        }
      }
      travelledM += segmentLengthM;
    }
    if (edgeMatch) matches.set(edge.edgeKey, edgeMatch);
  }
  return [...matches.values()].sort((left, right) =>
    left.distanceM - right.distanceM || left.edgeKey.localeCompare(right.edgeKey),
  );
}

function routeBetweenNodes(
  fromNodeId: string,
  toNodeId: string,
  adjacency: Map<string, PedestrianNetworkEdge[]>,
): { edges: PedestrianNetworkEdge[]; distanceM: number } | null {
  const distances = new Map<string, number>([[fromNodeId, 0]]);
  const previous = new Map<string, { nodeId: string; edge: PedestrianNetworkEdge }>();
  const pending = new Set([fromNodeId]);
  while (pending.size > 0) {
    const current = [...pending].sort((left, right) =>
      (distances.get(left) ?? Number.POSITIVE_INFINITY) - (distances.get(right) ?? Number.POSITIVE_INFINITY) || left.localeCompare(right),
    )[0]!;
    pending.delete(current);
    if (current === toNodeId) break;
    for (const edge of adjacency.get(current) ?? []) {
      const candidateDistance = (distances.get(current) ?? Number.POSITIVE_INFINITY) + edge.lengthM;
      if (candidateDistance < (distances.get(edge.toNodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.toNodeId, candidateDistance);
        previous.set(edge.toNodeId, { nodeId: current, edge });
        pending.add(edge.toNodeId);
      }
    }
  }
  if (!distances.has(toNodeId)) return null;
  const routeEdges: PedestrianNetworkEdge[] = [];
  let current = toNodeId;
  while (current !== fromNodeId) {
    const step = previous.get(current);
    if (!step) return null;
    routeEdges.unshift(step.edge);
    current = step.nodeId;
  }
  return { edges: routeEdges, distanceM: distances.get(toNodeId) ?? 0 };
}

export function shortestPedestrianAccessFromSources(
  graph: PedestrianNetworkGraph,
  sourceCoordinates: readonly Coordinate[],
  targetCoordinates: readonly Coordinate[],
  options: {
    maxSnapDistanceM?: number;
    sourceNodeIds?: readonly string[];
    signal?: AbortSignal;
    deadlineMs?: number;
    maxSettledNodes?: number;
  } = {},
): PedestrianNetworkMultiSourceAccess {
  const distancesM = new Map<string, number>();
  const resolvedTargetNodeIds = new Set<string>();
  const finalizedTargetNodeIds = new Set<string>();
  const inaccessibleTargetNodeIds = new Set<string>();
  const deadlineMs = options.deadlineMs ?? Number.POSITIVE_INFINITY;
  const maxSettledNodes = options.maxSettledNodes ?? Number.POSITIVE_INFINITY;
  const interrupted = () => options.signal?.aborted === true || Date.now() >= deadlineMs;
  if (interrupted()) {
    return { distancesM, resolvedTargetNodeIds, finalizedTargetNodeIds, inaccessibleTargetNodeIds, aborted: options.signal?.aborted === true, timedOut: Date.now() >= deadlineMs };
  }

  const nodes = new Map<string, Coordinate>();
  const adjacency = new Map<string, PedestrianNetworkEdge[]>();
  for (const [index, edge] of graph.edges.entries()) {
    if (index % 128 === 0 && interrupted()) {
      return { distancesM, resolvedTargetNodeIds, finalizedTargetNodeIds, inaccessibleTargetNodeIds, aborted: options.signal?.aborted === true, timedOut: Date.now() >= deadlineMs };
    }
    const first = edge.coordinates[0];
    const last = edge.coordinates.at(-1);
    if (!first || !last) continue;
    nodes.set(edge.fromNodeId, first);
    nodes.set(edge.toNodeId, last);
    const outgoing = adjacency.get(edge.fromNodeId) ?? [];
    outgoing.push(edge);
    adjacency.set(edge.fromNodeId, outgoing);
  }

  const maxSnapDistanceM = options.maxSnapDistanceM ?? MAX_PEDESTRIAN_NETWORK_SNAP_DISTANCE_M;
  const sourceGroups = options.sourceNodeIds
    ? options.sourceNodeIds.map((nodeId) => nodes.has(nodeId)
      ? [{ nodeId, coordinate: nodes.get(nodeId)!, distanceM: 0, resolution: "exact_node" as const }]
      : [])
    : sourceCoordinates.map((point) => {
      const exactNode = resolvePedestrianNetworkPoint(point, nodes, maxSnapDistanceM);
      if (exactNode) return [{ ...exactNode, distanceM: 0 }];
      if (maxSnapDistanceM === 0) {
        return resolveExactDirectedEdgePoints(point, graph.edges).map((exactEdge) => ({
          nodeId: exactEdge.nodeId,
          coordinate: point,
          distanceM: exactEdge.distanceM,
          resolution: "exact_edge" as const,
        }));
      }
      return [];
    });
  const sources = sourceGroups.flat();
  const targets = targetCoordinates.map((point) => resolvePedestrianNetworkPoint(point, nodes, maxSnapDistanceM));
  targets.forEach((target) => {
    if (target) resolvedTargetNodeIds.add(target.nodeId);
  });
  if (sourceGroups.some((sourceGroup) => sourceGroup.length === 0) || interrupted()) {
    return { distancesM, resolvedTargetNodeIds, finalizedTargetNodeIds, inaccessibleTargetNodeIds, aborted: options.signal?.aborted === true, timedOut: Date.now() >= deadlineMs };
  }

  const pending = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    if (source.distanceM < (distancesM.get(source.nodeId) ?? Number.POSITIVE_INFINITY)) {
      distancesM.set(source.nodeId, source.distanceM);
      pending.add(source.nodeId);
    }
  }
  let settledNodes = 0;
  let interruptedByBudget = false;
  while (pending.size > 0 && settledNodes < maxSettledNodes) {
    if (interrupted()) { interruptedByBudget = true; break; }
    const current = [...pending].sort((left, right) =>
      (distancesM.get(left) ?? Number.POSITIVE_INFINITY) - (distancesM.get(right) ?? Number.POSITIVE_INFINITY) || left.localeCompare(right),
    )[0]!;
    pending.delete(current);
    settledNodes += 1;
    if (resolvedTargetNodeIds.has(current)) finalizedTargetNodeIds.add(current);
    for (const edge of adjacency.get(current) ?? []) {
      const candidateDistance = (distancesM.get(current) ?? Number.POSITIVE_INFINITY) + edge.lengthM;
      if (candidateDistance < (distancesM.get(edge.toNodeId) ?? Number.POSITIVE_INFINITY)) {
        distancesM.set(edge.toNodeId, candidateDistance);
        pending.add(edge.toNodeId);
      }
    }
  }
  for (const target of targets) {
    if (target && !finalizedTargetNodeIds.has(target.nodeId)) inaccessibleTargetNodeIds.add(target.nodeId);
  }
  const timedOut = interruptedByBudget || Date.now() >= deadlineMs ||
    (maxSettledNodes !== Number.POSITIVE_INFINITY && settledNodes >= maxSettledNodes);
  return {
    distancesM,
    resolvedTargetNodeIds,
    finalizedTargetNodeIds,
    inaccessibleTargetNodeIds,
    aborted: options.signal?.aborted === true,
    timedOut,
  };
}

export function routeThroughPedestrianNetwork(
  graph: PedestrianNetworkGraph,
  requestedCoordinates: Coordinate[],
  options: { topology?: RouteTopology; maxSnapDistanceM?: number } = {},
): RouteGeometry | null {
  if (requestedCoordinates.length < 2 || requestedCoordinates.some((point) => !finiteCoordinate(point))) return null;
  const nodes = new Map<string, Coordinate>();
  const adjacency = new Map<string, PedestrianNetworkEdge[]>();
  for (const edge of graph.edges) {
    nodes.set(edge.fromNodeId, edge.coordinates[0]!);
    nodes.set(edge.toNodeId, edge.coordinates.at(-1)!);
    const outgoing = adjacency.get(edge.fromNodeId) ?? [];
    outgoing.push(edge);
    adjacency.set(edge.fromNodeId, outgoing);
  }
  const resolvedPoints = requestedCoordinates.map((point) =>
    resolvePedestrianNetworkPoint(point, nodes, options.maxSnapDistanceM),
  );
  if (resolvedPoints.some((resolved) => resolved === null)) return null;
  const snappedNodeIds = resolvedPoints.map((resolved) => resolved!.nodeId);

  const coordinates: Coordinate[] = [];
  const legs: RouteGeometryLeg[] = [];
  let totalDistanceM = 0;
  for (let index = 0; index < snappedNodeIds.length - 1; index += 1) {
    const fromNodeId = snappedNodeIds[index]!;
    const toNodeId = snappedNodeIds[index + 1]!;
    const route = routeBetweenNodes(fromNodeId, toNodeId, adjacency);
    if (!route) return null;
    const legCoordinates = route.edges.flatMap((edge, edgeIndex) =>
      edgeIndex === 0 ? edge.coordinates : edge.coordinates.slice(1),
    );
    if (legCoordinates.length > 0) {
      if (coordinates.length === 0) coordinates.push(...legCoordinates);
      else coordinates.push(...legCoordinates.slice(1));
    } else if (coordinates.length === 0) {
      coordinates.push(nodes.get(fromNodeId)!);
    }
    totalDistanceM += route.distanceM;
    legs.push({
      fromStopIndex: index,
      toStopIndex: index + 1,
      distanceKm: Number((route.distanceM / 1000).toFixed(2)),
      estimatedMinutes: Math.max(0, Math.round((route.distanceM / 1000 / 4.5) * 60)),
      steps: route.edges.map((edge) => ({
        name: edge.name,
        distanceKm: Number((edge.lengthM / 1000).toFixed(2)),
        durationMinutes: Math.max(0, Math.round((edge.lengthM / 1000 / 4.5) * 60)),
        maneuver: null,
        segmentReference: edge.edgeKey,
        geometry: edge.coordinates,
      })),
    });
  }
  const isLoop = (options.topology ?? "loop") === "loop";
  if (coordinates.length === 0) {
    coordinates.push(nodes.get(snappedNodeIds[0]!)!);
  }
  return {
    isLoop,
    origin: resolvedPoints[0]!.coordinate,
    returnLeg: isLoop ? legs.at(-1) ?? null : null,
    coordinates,
    distanceKm: Number((totalDistanceM / 1000).toFixed(2)),
    durationMinutes: Math.max(0, Math.round((totalDistanceM / 1000 / 4.5) * 60)),
    legs,
    provider: "stored-network",
    profile: "foot",
    mode: "network",
    estimated: true,
  };
}
