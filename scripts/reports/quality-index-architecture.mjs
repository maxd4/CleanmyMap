import { evaluateBoundary, loadBoundaryBaseline } from "../checks/check-architecture-import-boundary.mjs";
import { createRepositoryView } from "../checks/repository-view.mjs";
import { buildArchitectureImportGraph } from "./generate-architecture-import-graph.mjs";
import {
  QUALITY_ARCHITECTURE_DOMAIN_PREFIX,
  REPOSITORY_ROOT,
  SHA_PATTERN,
  stableId,
  state,
} from "./quality-index-primitives.mjs";

function architectureEdgeId(edge) {
  return stableId("architecture-edge", {
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    sourceKind: edge.sourceKind,
    form: edge.form,
    specifier: edge.specifier,
    line: edge.line,
  });
}

function serializeArchitectureEdge(edge) {
  return {
    id: architectureEdgeId(edge),
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    sourceKind: edge.sourceKind,
    form: edge.form,
    specifier: edge.specifier,
    line: edge.line,
    fromDomain: edge.fromDomain,
    toDomain: edge.toDomain,
    fromLayer: edge.fromLayer,
    toLayer: edge.toLayer,
    fromEffectiveLayer: edge.fromEffectiveLayer ?? edge.fromLayer,
    toEffectiveLayer: edge.toEffectiveLayer ?? edge.toLayer,
    crossDomain: Boolean(edge.crossDomain),
    targetsPublicFacade: Boolean(edge.targetsPublicFacade),
    importsOwnFacade: Boolean(edge.importsOwnFacade),
    uiToInfrastructure: Boolean(edge.uiToInfrastructure),
    domainToUi: Boolean(edge.domainToUi),
    invertedLayer: Boolean(edge.invertedLayer),
  };
}

function architectureBucket(edge) {
  if (edge.sourceKind === "test") return "tests";
  return edge.kind === "type-only" ? "typeOnly" : "runtime";
}

function relationsByFile(graph, boundary) {
  const outgoing = new Map((graph.nodes ?? []).map((node) => [node.path, []]));
  const incoming = new Map((graph.nodes ?? []).map((node) => [node.path, []]));
  for (const edge of graph.edges ?? []) {
    const serialized = serializeArchitectureEdge(edge);
    outgoing.get(edge.from)?.push(serialized);
    incoming.get(edge.to)?.push(serialized);
  }
  for (const relations of [...outgoing.values(), ...incoming.values()]) relations.sort((left, right) => left.id.localeCompare(right.id));

  const unresolvedByFile = new Map();
  for (const unresolved of graph.findings?.unresolvedInternal ?? []) {
    const item = { from: unresolved.from, specifier: unresolved.specifier, line: unresolved.line };
    const values = unresolvedByFile.get(unresolved.from) ?? [];
    values.push(item);
    unresolvedByFile.set(unresolved.from, values);
  }
  for (const values of unresolvedByFile.values()) values.sort((left, right) => `${left.specifier}:${left.line}`.localeCompare(`${right.specifier}:${right.line}`));

  const blockingBoundaryIds = new Set([
    ...(boundary?.newViolations ?? []),
    ...(boundary?.reintroduced ?? []),
  ].map((violation) => violation.id));
  const boundaryByFile = new Map();
  for (const violation of boundary?.currentViolations ?? []) {
    const item = { ...violation, blocking: blockingBoundaryIds.has(violation.id) };
    const values = boundaryByFile.get(violation.from) ?? [];
    values.push(item);
    boundaryByFile.set(violation.from, values);
  }
  for (const values of boundaryByFile.values()) values.sort((left, right) => left.signature.localeCompare(right.signature));
  return { outgoing, incoming, unresolvedByFile, boundaryByFile };
}

function architectureFile(node, relations) {
  const dependencies = relations.outgoing.get(node.path) ?? [];
  const dependents = relations.incoming.get(node.path) ?? [];
  const countByBucket = (items) => Object.fromEntries(["runtime", "typeOnly", "tests"].map((bucket) => [bucket, items.filter((edge) => architectureBucket(edge) === bucket).length]));
  const crossDomainImports = dependencies.filter((edge) => edge.crossDomain);
  const layerCrossings = dependencies.filter((edge) => edge.fromLayer !== edge.toLayer || edge.fromEffectiveLayer !== edge.toEffectiveLayer);
  const boundaryFindings = relations.boundaryByFile.get(node.path) ?? [];
  const unresolved = relations.unresolvedByFile.get(node.path) ?? [];
  return {
    path: node.path,
    domain: node.domain,
    layer: node.layer,
    effectiveLayer: node.effectiveLayer,
    sourceKind: node.sourceKind,
    clientEntry: node.clientEntry,
    clientReachable: node.clientReachable,
    serverBoundary: node.serverBoundary,
    publicFacade: node.publicFacade,
    facadeOwner: node.facadeOwner,
    metrics: { fanIn: countByBucket(dependents), fanOut: countByBucket(dependencies), totalFanIn: dependents.length, totalFanOut: dependencies.length },
    relations: { dependencies, dependents, crossDomainImports, layerCrossings },
    findings: {
      crossDomainImports: state(crossDomainImports.length > 0 ? "PRESENT" : "NONE", "imports sortants vers un autre domaine", crossDomainImports),
      layerCrossings: state(layerCrossings.length > 0 ? "PRESENT" : "NONE", "imports sortants traversant une couche", layerCrossings),
      boundaryViolations: state(boundaryFindings.length > 0 ? "PRESENT" : "NONE", "règles de frontière architecturale explicites", boundaryFindings),
      unresolvedInternal: state(unresolved.length > 0 ? "PRESENT" : "NONE", "imports internes non résolus", unresolved),
    },
  };
}

function architectureDomains(graph, files) {
  const domainFiles = new Map();
  for (const file of files) {
    const values = domainFiles.get(file.domain) ?? [];
    values.push(file.path);
    domainFiles.set(file.domain, values);
  }
  return (graph.domains ?? []).map((domain) => ({
    id: `${QUALITY_ARCHITECTURE_DOMAIN_PREFIX}${domain.domain}`,
    domain: domain.domain,
    responsibility: "couplage issu du graphe d'import TypeScript",
    files: [...(domainFiles.get(domain.domain) ?? [])].sort((left, right) => left.localeCompare(right)),
    metrics: {
      layers: domain.layers,
      files: domain.files,
      runtimeFanIn: domain.runtimeFanIn,
      runtimeFanOut: domain.runtimeFanOut,
      typeOnlyFanIn: domain.typeOnlyFanIn,
      typeOnlyFanOut: domain.typeOnlyFanOut,
      testFanIn: domain.testFanIn,
      testFanOut: domain.testFanOut,
    },
  })).sort((left, right) => left.id.localeCompare(right.id));
}

export function buildArchitectureCouplingProjection({ graph, boundary = null, error = null } = {}) {
  if (error || !graph) {
    return { state: "NOT_MEASURED", detail: error?.message ?? "graphe d'import architectural absent", error: error ? { name: error.name, message: error.message, code: error.code ?? null } : null, files: [], domains: [], boundary: { state: "NOT_MEASURED", blocking: [], current: [] } };
  }
  const relations = relationsByFile(graph, boundary);
  const files = (graph.nodes ?? []).map((node) => architectureFile(node, relations)).sort((left, right) => left.path.localeCompare(right.path));
  const blocking = [...(boundary?.newViolations ?? []), ...(boundary?.reintroduced ?? [])].sort((left, right) => left.signature.localeCompare(right.signature));
  return {
    state: "PRESENT",
    gitSha: graph.gitSha,
    provenance: graph.provenance,
    graphSummary: graph.summary,
    files,
    domains: architectureDomains(graph, files),
    boundary: { state: boundary ? "PRESENT" : "NOT_MEASURED", status: boundary?.status ?? "NOT_MEASURED", blocking, current: boundary?.currentViolations ?? [], new: boundary?.newViolations ?? [], reintroduced: boundary?.reintroduced ?? [], stale: boundary?.staleExceptions ?? [], invalid: boundary?.invalidExceptions ?? [], blockingStatus: blocking.length > 0 ? "FAIL" : "PASS" },
  };
}

export function buildArchitectureCouplingFromRepository({ root = REPOSITORY_ROOT, auditedSha } = {}) {
  if (!SHA_PATTERN.test(auditedSha ?? "")) throw new Error(`SHA architecture invalide: ${auditedSha}`);
  const view = createRepositoryView({ root, ref: auditedSha });
  const graph = buildArchitectureImportGraph({ root, source: "git-ref", ref: auditedSha, view });
  return buildArchitectureCouplingProjection({ graph, boundary: evaluateBoundary(graph, loadBoundaryBaseline({ view })) });
}
