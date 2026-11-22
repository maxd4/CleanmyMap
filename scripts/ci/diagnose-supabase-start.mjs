import { appendFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const SUPABASE_START_CATEGORIES = Object.freeze({
  DOCKER_UNAVAILABLE: "DOCKER_UNAVAILABLE",
  IMAGE_UNAVAILABLE: "IMAGE_UNAVAILABLE",
  NETWORK_FAILURE: "NETWORK_FAILURE",
  PORT_CONFLICT: "PORT_CONFLICT",
  HEALTHCHECK_FAILURE: "HEALTHCHECK_FAILURE",
  CLI_CONFIGURATION_INCOMPATIBILITY: "CLI_CONFIGURATION_INCOMPATIBILITY",
  INSUFFICIENT_RESOURCES: "INSUFFICIENT_RESOURCES",
  START_TIMEOUT: "START_TIMEOUT",
  UNCLASSIFIED: "UNCLASSIFIED",
  START_SUCCEEDED: "START_SUCCEEDED",
});

export const SUPABASE_START_REQUIRED_SERVICES = Object.freeze(["db", "kong", "rest", "storage"]);

const categoryPatterns = [
  [SUPABASE_START_CATEGORIES.NETWORK_FAILURE, /(failed to (create|connect|resolve).*network|network .*\b(not found|unavailable|fail|error|timeout|denied|refused|reset|exceeded)\b|dns|name resolution|no such host|connection reset|connection refused|i\/o timeout|context deadline exceeded|tls handshake|proxy|registry).*\b(fail|error|timeout|unavailable|denied|refused|reset|exceeded|not found)\b/i],
  [SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE, /(pull access denied|manifest unknown|failed to (resolve|pull|copy)|error response from daemon:.*(get|pull)|image .*not found)/i],
  [SUPABASE_START_CATEGORIES.PORT_CONFLICT, /(port is already allocated|address already in use|bind:.*address|listen tcp.*already)/i],
  [SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE, /(health.?check|unhealthy|timed out waiting|container .* failed to become healthy)/i],
  [SUPABASE_START_CATEGORIES.INSUFFICIENT_RESOURCES, /(no space left on device|out of memory|cannot allocate memory|disk quota|insufficient (memory|resources))/i],
  [SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY, /(unknown option|unknown flag|invalid configuration|could not find.*config|project_id|unsupported .*version|cannot find module|could not determine executable|command not found)/i],
];

const firstErrorSignalPatterns = [
  ["NETWORK", /(failed to (create|connect|resolve).*network|network .*(not found|unavailable|fail|error|timeout|denied|refused|reset|exceeded)|(?:dns|name resolution|no such host|connection reset|connection refused|i\/o timeout|context deadline exceeded|tls handshake|proxy|registry).*(?:error|fail|timeout|denied|refused|reset|exceeded|unavailable|not found)|(?:error|failed|unable|cannot|could not).*(?:dns|name resolution|proxy|registry))/i],
  ["IMAGE_PULL", /(pull access denied|manifest unknown|failed to (resolve|pull|copy)|error response from daemon:.*(get|pull)|image .*not found)/i],
  ["PORT_BIND", /(port is already allocated|address already in use|bind:.*address|listen tcp.*already)/i],
  ["HEALTHCHECK", /(health.?check|unhealthy|timed out waiting|container .* failed to become healthy)/i],
  ["RESOURCE", /(no space left on device|out of memory|cannot allocate memory|disk quota|insufficient (memory|resources))/i],
  ["CLI_CONFIGURATION", /(unknown option|unknown flag|invalid configuration|could not find.*config|project_id|unsupported .*version|cannot find module|could not determine executable|command not found)/i],
  ["PERMISSION", /(permission denied|access denied|forbidden)/i],
  ["CONTAINER_CREATE", /((failed|error|unable|cannot).*(create|start).*(container|service)|failed to create (container|service))/i],
  ["CONTAINER_EXIT", /(container .* (exited|stopped|terminated)|exit (status|code)|exited with code)/i],
  ["UNKNOWN_ERROR", /\b(error|failed|fatal|panic)\b/i],
];

const dockerUnavailablePattern = /(cannot connect to the docker daemon|is the docker daemon running|docker daemon.*(not running|unavailable)|docker command not found|error during connect)/i;
const containerStateNames = Object.freeze(["running", "exited", "created", "restarting", "other"]);
const serviceAliases = Object.freeze([
  ["storage-api", "storage"], ["postgres-meta", "meta"], ["postgrest", "rest"], ["rest", "rest"], ["gotrue", "auth"], ["auth", "auth"],
  ["mailpit", "mailpit"], ["edge-runtime", "edge-runtime"], ["supavisor", "supavisor"], ["imgproxy", "imgproxy"],
  ["logflare", "logflare"], ["realtime", "realtime"], ["storage", "storage"], ["studio", "studio"],
  ["kong", "kong"], ["postgres", "db"], ["db", "db"],
]);

const dockerContainersCommand = ["docker", "ps", "-a", "--filter", "name=supabase_", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"];
const dockerImagesCommand = ["docker", "images", "--format", "{{.Repository}}\t{{.Tag}}"];
const dockerNetworksCommand = ["docker", "network", "ls", "--format", "{{.Name}}\t{{.Driver}}"];
const progressObservationStates = new Set(["DOCKER_READY", "IMAGES_OBSERVED", "NETWORK_OBSERVED", "CONTAINERS_OBSERVED", "SERVICES_READY", "DOCKER_UNAVAILABLE"]);

export function classifySupabaseStartFailure({
  log,
  exitCode,
  dockerCommandAvailable = true,
  dockerDaemonAvailable = true,
  supabaseCliAvailable = true,
  evidence = null,
}) {
  if (exitCode === 0) return SUPABASE_START_CATEGORIES.START_SUCCEEDED;
  if (!dockerCommandAvailable || !dockerDaemonAvailable || dockerUnavailablePattern.test(log)) return SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE;
  if (!supabaseCliAvailable) return SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY;
  for (const [category, pattern] of categoryPatterns) if (pattern.test(log)) return category;
  if (evidence && typeof evidence === "object") {
    if (evidence.portState === "conflict") return SUPABASE_START_CATEGORIES.PORT_CONFLICT;
    if (evidence.durationSeconds >= 80
      && evidence.dockerContainers === 0
      && evidence.supabaseStatus === "unavailable"
      && (!evidence.networkState || ["missing", "unobserved"].includes(evidence.networkState))) {
      return SUPABASE_START_CATEGORIES.START_TIMEOUT;
    }
  }
  return SUPABASE_START_CATEGORIES.UNCLASSIFIED;
}

export function sanitizeVersion(value) {
  const match = String(value ?? "").match(/\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/);
  return match?.[0] ?? "unavailable";
}

function parseJsonObject(value) {
  const text = String(value ?? "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parsePortConfig(config) {
  const sections = { api: "api", db: "db", studio: "studio", inbucket: "inbucket" };
  const ports = {};
  let section = "";
  for (const line of config.split(/\r?\n/)) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    const portMatch = line.match(/^\s*port\s*=\s*(\d+)\s*$/);
    if (portMatch && sections[section]) ports[sections[section]] = Number(portMatch[1]);
  }
  return ports;
}

function readConfigContract(root) {
  try {
    const config = readFileSync(path.join(root, "apps/web/supabase/config.toml"), "utf8");
    const projectId = config.match(/^project_id\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
    const majorVersion = config.match(/^major_version\s*=\s*(\d+)\s*$/m)?.[1] ?? null;
    const healthTimeout = config.match(/^health_timeout\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
    const ports = parsePortConfig(config);
    const validPorts = Object.values(ports).every((port) => Number.isInteger(port) && port > 0);
    return { available: true, valid: projectId === "web" && majorVersion === "17" && healthTimeout === "2m" && validPorts, ports };
  } catch {
    return { available: false, valid: false, ports: {} };
  }
}

function classifyContainerStates(output) {
  const states = Object.fromEntries(containerStateNames.map((state) => [state, 0]));
  for (const line of String(output ?? "").split(/\r?\n/).filter(Boolean)) {
    const status = line.split("\t")[2]?.toLowerCase() ?? line.split("\t")[1]?.toLowerCase() ?? "";
    if (/^up\b/.test(status)) states.running += 1;
    else if (/^exited\b/.test(status)) states.exited += 1;
    else if (/^created\b/.test(status)) states.created += 1;
    else if (/^restarting\b/.test(status)) states.restarting += 1;
    else states.other += 1;
  }
  return states;
}

function unavailableContainerStates() {
  return Object.fromEntries(containerStateNames.map((state) => [state, "unavailable"]));
}

function normalizeServiceName(value) {
  const normalized = String(value ?? "").toLowerCase().replace(/_/g, "-");
  return serviceAliases.find(([alias]) => normalized.includes(alias))?.[1] ?? null;
}

function dockerEventService(attributes) {
  const value = String(attributes.name ?? attributes["com.docker.compose.service"] ?? attributes["com.docker.swarm.service.name"] ?? "");
  const service = inferFailureService(value);
  if (service) return service;
  const normalized = value.toLowerCase().replace(/_/g, "-");
  return serviceAliases.find(([alias]) => normalized === alias)?.[1] ?? null;
}

function parseContainerServices(output) {
  const services = {};
  for (const line of String(output ?? "").split(/\r?\n/).filter(Boolean)) {
    const [name, , status] = line.split("\t");
    const service = normalizeServiceName(name);
    if (!service) continue;
    const state = /^up\b/i.test(status ?? "") ? "running" : /^exited\b/i.test(status ?? "") ? "exited" : /^restarting\b/i.test(status ?? "") ? "restarting" : /^created\b/i.test(status ?? "") ? "created" : "other";
    services[service] = state;
  }
  return services;
}

function parseListeningPorts(output) {
  const ports = new Set();
  for (const match of String(output ?? "").matchAll(/(?:127\.0\.0\.1|0\.0\.0\.0|\[::\]|\*):([0-9]{1,5})\b/g)) ports.add(Number(match[1]));
  return [...ports].sort((left, right) => left - right);
}

function inferStartStep(log) {
  const text = String(log ?? "");
  if (/(pull access denied|manifest unknown|failed to (resolve|pull|copy)|image .*not found)/i.test(text)) return "IMAGE_PULL";
  if (/(?:network|dns|name resolution|connection reset|i\/o timeout|proxy|registry).*(?:error|fail|timeout|denied|refused|reset|exceeded|unavailable|not found)|(?:error|failed|unable|cannot|could not).*(?:network|dns|name resolution|proxy|registry)/i.test(text)) return "NETWORK";
  if (/(port is already allocated|address already in use|bind:.*address)/i.test(text)) return "PORT_BIND";
  if (/(health.?check|unhealthy|timed out waiting|failed to become healthy)/i.test(text)) return "HEALTH_CHECK";
  if (/(unknown option|unknown flag|invalid configuration|could not find.*config|project_id)/i.test(text)) return "CLI_CONFIGURATION";
  if (/(create|start).*container/i.test(text)) return "CONTAINER_START";
  return "UNKNOWN";
}

function inferFailureService(log) {
  const text = String(log ?? "");
  const servicePattern = "(?:db|postgres(?:ql)?|auth|gotrue|rest|postgrest|storage(?:-api)?|realtime|kong|studio|mailpit|inbucket|edge-runtime|logflare|vector|supavisor|imgproxy)";
  const containerNameMatch = text.match(new RegExp(`(?:^|\\b)supabase_(${servicePattern})(?:_|\\b)`, "i"));
  if (containerNameMatch) return normalizeServiceName(containerNameMatch[1]);
  const explicitMatch = text.match(new RegExp(`\\b(?:service|container|component|process)\\s+(${servicePattern})\\b`, "i"));
  if (explicitMatch) return normalizeServiceName(explicitMatch[1]);
  if (/\bpostgres(?:ql)?:\/\//i.test(text)) return "db";
  const stateMatch = text.match(new RegExp(`\\b(${servicePattern})\\s+(?:is|was|has|exited|stopped|failed|unhealthy|restarting)\\b`, "i"));
  return normalizeServiceName(stateMatch?.[1]);
}

const firstErrorDiagnosticLabels = Object.freeze({
  NETWORK: "network",
  IMAGE_PULL: "image_pull",
  PORT_BIND: "port_bind",
  HEALTHCHECK: "healthcheck",
  RESOURCE: "resource",
  CLI_CONFIGURATION: "cli_configuration",
  PERMISSION: "permission",
  CONTAINER_CREATE: "container_create",
  CONTAINER_EXIT: "container_exit",
  UNKNOWN_ERROR: "unknown_error",
});

function sanitizeErrorExcerpt(signal, service) {
  const label = firstErrorDiagnosticLabels[signal] ?? "unknown";
  const safeService = service ?? "unavailable";
  return `class=${label};service=${safeService}`;
}

function inferFirstErrorEvidence(log) {
  let genericError = null;
  for (const line of String(log ?? "").split(/\r?\n/)) {
    const normalized = line.replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "");
    if (!normalized.trim()) continue;
    const signal = firstErrorSignalPatterns.find(([, pattern]) => pattern.test(normalized))?.[0];
    if (!signal) continue;
    const result = { signal, excerpt: sanitizeErrorExcerpt(signal, inferFailureService(normalized)) };
    if (signal !== "UNKNOWN_ERROR") return result;
    genericError ??= result;
  }
  return genericError ?? { signal: "NONE", excerpt: "none" };
}

export function parseFirstDockerFailureEvent(rawEvents) {
  for (const line of String(rawEvents ?? "").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const action = String(event.Action ?? event.status ?? "").toLowerCase();
    const attributes = event.Actor?.Attributes ?? event.actor?.attributes ?? {};
    const service = dockerEventService(attributes);
    if (!service) continue;
    if (action === "destroy") continue;
    const rawExitCode = attributes.exitCode ?? attributes.exitcode;
    const exitCode = /^\d{1,3}$/.test(String(rawExitCode ?? "")) ? String(rawExitCode) : "unknown";
    if (action === "oom" || action === "health_status: unhealthy" || (action === "die" && exitCode !== "unknown" && exitCode !== "0")) {
      const signal = action === "health_status: unhealthy" ? "DOCKER_HEALTH_UNHEALTHY" : action === "oom" ? "DOCKER_OOM" : "DOCKER_CONTAINER_EXIT";
      return { signal, excerpt: `event=${action};service=${service};exit_code=${exitCode}` };
    }
  }
  return { signal: "NONE", excerpt: "none" };
}

export function parseDockerLifecycleEvents(rawEvents) {
  const summaries = [];
  for (const line of String(rawEvents ?? "").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const action = String(event.Action ?? event.status ?? "").toLowerCase();
    if (!["create", "start", "health_status: healthy", "health_status: unhealthy", "die", "destroy"].includes(action)) continue;
    const attributes = event.Actor?.Attributes ?? event.actor?.attributes ?? {};
    const service = dockerEventService(attributes);
    if (!service) continue;
    const rawExitCode = attributes.exitCode ?? attributes.exitcode;
    const exitCode = /^\d{1,3}$/.test(String(rawExitCode ?? "")) ? String(rawExitCode) : "unknown";
    const kind = action === "destroy" ? "cleanup" : action === "die" ? (exitCode === "0" ? "normal_exit" : "failure") : action.startsWith("health_status:") ? "health" : "transition";
    summaries.push(`event=${action};service=${service};exit_code=${exitCode};kind=${kind}`);
    if (summaries.length === 10) break;
  }
  return summaries;
}

function requiredServiceState(containerServices, containerCount) {
  if (containerCount === null) return "unobserved";
  if (containerCount === 0) return "missing";
  const missing = SUPABASE_START_REQUIRED_SERVICES.filter((service) => !containerServices[service]);
  if (missing.length > 0) return "incomplete";
  if (SUPABASE_START_REQUIRED_SERVICES.every((service) => containerServices[service] === "running")) return "ready";
  return "unhealthy";
}

function healthState(containerStates, requiredState) {
  if (requiredState === "unobserved" || requiredState === "missing") return "unavailable";
  if (requiredState === "ready") return "healthy";
  if (containerStates.exited > 0 || containerStates.restarting > 0) return "failed";
  return "pending";
}

function progressObservationState({ dockerDaemonAvailable, dockerImages, networkState, dockerContainers, requiredServicesState }) {
  if (!dockerDaemonAvailable) return "DOCKER_UNAVAILABLE";
  if (networkState === "observed" && dockerContainers === 0) return "NETWORK_OBSERVED";
  if (dockerContainers > 0 && requiredServicesState === "ready") return "SERVICES_READY";
  if (dockerContainers > 0) return "CONTAINERS_OBSERVED";
  if (dockerImages > 0) return "IMAGES_OBSERVED";
  return "DOCKER_READY";
}

function networkStateFromOutput(networkOutput, expectedNetwork) {
  const lines = String(networkOutput ?? "").split(/\r?\n/).filter(Boolean);
  const observed = expectedNetwork
    ? lines.some((line) => line.split("\t", 1)[0].trim() === expectedNetwork)
    : lines.some((line) => /supabase/i.test(line));
  return observed ? "observed" : "missing";
}

export function collectStartProgressSnapshot({ elapsedSeconds = 0, expectedNetwork, probeCommand = (command, args) => probe(command, args, 2_000) }) {
  const dockerDaemon = probeCommand("docker", ["info", "--format", "{{.ServerVersion}}"]);
  const dockerContainers = probeCommand(dockerContainersCommand[0], dockerContainersCommand.slice(1));
  const dockerImages = probeCommand(dockerImagesCommand[0], dockerImagesCommand.slice(1));
  const dockerNetworks = probeCommand(dockerNetworksCommand[0], dockerNetworksCommand.slice(1));
  const containerInspectionAvailable = dockerContainers.available;
  const containerServices = containerInspectionAvailable ? parseContainerServices(dockerContainers.output) : {};
  const containerStates = containerInspectionAvailable ? classifyContainerStates(dockerContainers.output) : unavailableContainerStates();
  const containerCount = containerInspectionAvailable ? Object.values(containerStates).reduce((total, count) => total + count, 0) : null;
  const requiredServicesState = requiredServiceState(containerServices, containerCount);
  const imageCount = dockerImages.available ? String(dockerImages.output).split(/\r?\n/).filter(Boolean).length : null;
  const networkState = dockerNetworks.available ? networkStateFromOutput(dockerNetworks.output, expectedNetwork) : "unobserved";
  return {
    schemaVersion: 1,
    elapsedSeconds: Number.isFinite(elapsedSeconds) ? elapsedSeconds : null,
    dockerDaemon: dockerDaemon.available ? "available" : "unavailable",
    dockerImages: imageCount,
    dockerContainers: containerCount,
    dockerContainerStates: containerStates,
    dockerContainerServices: containerServices,
    requiredServicesState,
    networkState,
    observationState: progressObservationState({
      dockerDaemonAvailable: dockerDaemon.available,
      dockerImages: imageCount,
      networkState,
      dockerContainers: containerCount,
      requiredServicesState,
    }),
  };
}

function normalizeProgressSnapshots(snapshots) {
  return (Array.isArray(snapshots) ? snapshots : [])
    .filter((snapshot) => snapshot && typeof snapshot === "object" && snapshot.schemaVersion === 1)
    .slice(0, 120)
    .map((snapshot) => ({
      elapsedSeconds: Number.isFinite(snapshot.elapsedSeconds) ? snapshot.elapsedSeconds : null,
      observationState: progressObservationStates.has(snapshot.observationState) ? snapshot.observationState : "UNKNOWN",
      dockerDaemon: snapshot.dockerDaemon === "available" ? "available" : "unavailable",
      dockerImages: Number.isInteger(snapshot.dockerImages) ? snapshot.dockerImages : null,
      dockerContainers: Number.isInteger(snapshot.dockerContainers) ? snapshot.dockerContainers : null,
      dockerContainerServices: Object.fromEntries(Object.entries(snapshot.dockerContainerServices ?? {}).filter(([service, state]) => serviceAliases.some(([, allowed]) => allowed === service) && containerStateNames.includes(state))),
      requiredServicesState: typeof snapshot.requiredServicesState === "string" ? snapshot.requiredServicesState : "unobserved",
      networkState: typeof snapshot.networkState === "string" ? snapshot.networkState : "unobserved",
    }));
}

function isIncompleteJsonLine(line) {
  const text = line.trim();
  if (!/^[{[]/.test(text)) return false;

  const stack = [];
  let inString = false;
  let escaped = false;
  for (const character of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === "{" || character === "[") {
      stack.push(character);
    } else if (character === "}" || character === "]") {
      const opening = stack.pop();
      if ((character === "}" && opening !== "{") || (character === "]" && opening !== "[")) return false;
    }
  }
  return inString || stack.length > 0;
}

export function readProgressSnapshots(progressFile) {
  if (!progressFile) return { snapshots: [], partial: false };
  try {
    const lines = readFileSync(progressFile, "utf8").split(/\r?\n/);
    const lastNonEmptyLine = lines.reduce((lastIndex, line, index) => line.trim() ? index : lastIndex, -1);
    const snapshots = [];
    let partial = false;
    for (const [index, line] of lines.entries()) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      try {
        snapshots.push(JSON.parse(trimmedLine));
      } catch {
        partial ||= index === lastNonEmptyLine && isIncompleteJsonLine(trimmedLine);
      }
    }
    return { snapshots, partial };
  } catch {
    return { snapshots: [], partial: false };
  }
}

export function collectBoundedStartEvidence({ log, dockerEvents = "", exitCode, durationSeconds = null, expectedNetwork, root = process.cwd(), probeCommand = probe, startProgressSnapshots = [], startProgressPartial = false }) {
  const dockerVersion = probeCommand("docker", ["--version"]);
  const dockerDaemon = probeCommand("docker", ["info", "--format", "{{.ServerVersion}}"]);
  const dockerInfo = probeCommand("docker", ["info", "--format", "{{json .}}"]);
  const dockerContainers = probeCommand("docker", ["ps", "-a", "--filter", "name=supabase_", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"]);
  const dockerImages = probeCommand("docker", ["images", "--format", "{{.Repository}}\t{{.Tag}}"]);
  const dockerNetworks = probeCommand("docker", ["network", "ls", "--format", "{{.Name}}\t{{.Driver}}"]);
  const listeningPorts = probeCommand("ss", ["-ltnH"]);
  const supabaseCli = probeCommand("npx", ["--no-install", "supabase", "--version"]);
  const supabaseStatus = probeCommand("npx", ["--no-install", "supabase", "status", "--workdir", "apps/web", "--output", "json"]);
  const configContract = readConfigContract(root);
  const parsedDockerInfo = parseJsonObject(dockerInfo.output);
  const containerInspectionAvailable = dockerContainers.available;
  const containerServices = containerInspectionAvailable ? parseContainerServices(dockerContainers.output) : {};
  const containerStates = containerInspectionAvailable ? classifyContainerStates(dockerContainers.output) : unavailableContainerStates();
  const containerCount = containerInspectionAvailable ? Object.values(containerStates).reduce((total, count) => total + count, 0) : null;
  const requiredState = requiredServiceState(containerServices, containerCount);
  const occupiedPorts = listeningPorts.available ? parseListeningPorts(listeningPorts.output) : null;
  const configuredPorts = Object.values(configContract.ports);
  const portConflicts = occupiedPorts === null ? [] : configuredPorts.filter((port) => occupiedPorts.includes(port));
  const imageCount = dockerImages.available ? String(dockerImages.output).split(/\r?\n/).filter(Boolean).length : null;
  const networkState = dockerNetworks.available ? networkStateFromOutput(dockerNetworks.output, expectedNetwork) : "unobserved";
  const progressSnapshots = normalizeProgressSnapshots(startProgressSnapshots);
  const firstLogError = inferFirstErrorEvidence(log);
  const firstDockerError = parseFirstDockerFailureEvent(dockerEvents);
  const dockerEventIsMoreSpecific = firstLogError.signal === "UNKNOWN_ERROR" && firstDockerError.signal !== "NONE";
  const firstError = dockerEventIsMoreSpecific
    ? { ...firstDockerError, source: "DOCKER_EVENT" }
    : firstLogError.signal !== "NONE"
      ? { ...firstLogError, source: "SUPABASE_CLI_LOG" }
      : { ...firstDockerError, source: firstDockerError.signal === "NONE" ? "UNAVAILABLE" : "DOCKER_EVENT" };
  const dockerEventService = firstDockerError.excerpt.match(/;service=([a-z-]+)/)?.[1] ?? null;
  const evidence = {
    schemaVersion: 4,
    evidenceCodes: [],
    dockerCommandAvailable: dockerVersion.available,
    dockerDaemonAvailable: dockerDaemon.available,
    supabaseCliAvailable: supabaseCli.available,
    dockerServerVersion: sanitizeVersion(dockerDaemon.output),
    supabaseCliVersion: sanitizeVersion(supabaseCli.output),
    dockerContainers: containerCount,
    dockerContainerStates: containerStates,
    dockerContainerServices: containerServices,
    dockerCpuCount: Number.isSafeInteger(parsedDockerInfo?.NCPU) ? parsedDockerInfo.NCPU : null,
    dockerMemoryBytes: Number.isSafeInteger(parsedDockerInfo?.MemTotal) ? parsedDockerInfo.MemTotal : null,
    dockerImages: imageCount,
    networkState,
    portState: occupiedPorts === null ? "unobserved" : portConflicts.length > 0 ? "conflict" : "clear",
    portConflicts,
    requiredServicesState: requiredState,
    requiredServicesMissing: SUPABASE_START_REQUIRED_SERVICES.filter((service) => !containerServices[service]),
    healthState: healthState(containerStates, requiredState),
    supabaseStatus: supabaseStatus.available ? "available" : "unavailable",
    configContract: configContract.valid ? "valid" : configContract.available ? "invalid" : "unavailable",
    configuredPorts: configContract.ports,
    startPhase: inferStartStep(log),
    failureService: dockerEventIsMoreSpecific ? dockerEventService : inferFailureService(log),
    firstErrorSignal: firstError.signal,
    firstErrorExcerpt: firstError.excerpt,
    firstErrorSource: firstError.source,
    dockerLifecycleEvents: parseDockerLifecycleEvents(dockerEvents),
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    startObservationCount: progressSnapshots.length,
    startObservationTimeline: progressSnapshots.map((snapshot) => `${snapshot.elapsedSeconds ?? "unknown"}:${Object.entries(snapshot.dockerContainerServices).map(([service, state]) => `${service}=${state}`).join("/") || snapshot.observationState}`).join(","),
  };
  const evidenceCodes = [
    dockerVersion.available ? "DOCKER_COMMAND_AVAILABLE" : "DOCKER_COMMAND_UNAVAILABLE",
    dockerDaemon.available ? "DOCKER_DAEMON_AVAILABLE" : "DOCKER_DAEMON_UNAVAILABLE",
    supabaseCli.available ? "SUPABASE_CLI_AVAILABLE" : "SUPABASE_CLI_UNAVAILABLE",
    configContract.valid ? "SUPABASE_CONFIG_CONTRACT_VALID" : configContract.available ? "SUPABASE_CONFIG_CONTRACT_INVALID" : "SUPABASE_CONFIG_UNAVAILABLE",
    supabaseStatus.available ? "SUPABASE_STATUS_AVAILABLE" : "SUPABASE_STATUS_UNAVAILABLE",
    containerCount === null ? "SUPABASE_CONTAINERS_UNOBSERVED" : containerCount === 0 ? "NO_SUPABASE_CONTAINERS" : "SUPABASE_CONTAINERS_PRESENT",
    parsedDockerInfo ? "DOCKER_RESOURCES_OBSERVED" : "DOCKER_RESOURCES_UNAVAILABLE",
    imageCount === null ? "SUPABASE_IMAGES_UNOBSERVED" : imageCount === 0 ? "NO_DOCKER_IMAGES" : "DOCKER_IMAGES_OBSERVED",
    networkState === "unobserved" ? "SUPABASE_NETWORK_UNOBSERVED" : networkState === "missing" ? "SUPABASE_NETWORK_MISSING" : "SUPABASE_NETWORK_OBSERVED",
    evidence.portState === "unobserved" ? "HOST_PORTS_UNOBSERVED" : evidence.portState === "conflict" ? "HOST_PORT_CONFLICT" : "HOST_PORTS_CLEAR",
    requiredState === "unobserved" ? "REQUIRED_SERVICES_UNOBSERVED" : requiredState === "missing" ? "REQUIRED_SERVICES_MISSING" : requiredState === "ready" ? "REQUIRED_SERVICES_READY" : "REQUIRED_SERVICES_INCOMPLETE",
    evidence.healthState === "healthy" ? "SERVICES_HEALTHY" : evidence.healthState === "failed" ? "SERVICE_HEALTH_FAILURE" : "SERVICE_HEALTH_UNOBSERVED",
  ];
  if (exitCode !== 0) evidenceCodes.push("NONZERO_START_EXIT");
  if (Number.isFinite(durationSeconds) && durationSeconds >= 80) evidenceCodes.push("START_DURATION_OVER_80_SECONDS");
  if (evidence.startPhase === "UNKNOWN") evidenceCodes.push("START_PHASE_UNOBSERVED");
  evidenceCodes.push(progressSnapshots.length > 0 ? "START_PROGRESS_OBSERVED" : "START_PROGRESS_UNOBSERVED");
  if (startProgressPartial) evidenceCodes.push("START_PROGRESS_PARTIAL");
  if (evidence.failureService) evidenceCodes.push("FAILED_SERVICE_IDENTIFIED");
  if (firstDockerError.signal !== "NONE") evidenceCodes.push("DOCKER_FAILURE_EVENT_OBSERVED");
  if (evidence.dockerLifecycleEvents.length > 0) evidenceCodes.push("DOCKER_LIFECYCLE_EVENTS_OBSERVED");
  const category = classifySupabaseStartFailure({ log, exitCode, evidence });
  evidenceCodes.push(category === SUPABASE_START_CATEGORIES.UNCLASSIFIED ? "NO_CLASSIFIABLE_START_LOG_SIGNAL" : category === SUPABASE_START_CATEGORIES.START_SUCCEEDED ? "START_SUCCEEDED" : `LOG_SIGNAL_${category}`);
  evidence.evidenceCodes = [...new Set(evidenceCodes)].sort((left, right) => left.localeCompare(right, "en"));
  return evidence;
}

export function renderSupabaseStartDiagnostic({ category, exitCode, dockerVersion, supabaseCliVersion, dockerDaemonAvailable, evidence }) {
  const result = exitCode === 0 ? "success" : "failure";
  const daemon = dockerDaemonAvailable ? "available" : "unavailable";
  const lines = [
    "Supabase start diagnostic (bounded; raw log withheld):",
    `result=${result} exit_code=${exitCode}`,
    `category=${category}`,
    `diagnostic_code=SUPABASE_START_${category}`,
    `docker_version=${sanitizeVersion(dockerVersion)}`,
    `supabase_cli_version=${sanitizeVersion(supabaseCliVersion)}`,
    `docker_daemon=${daemon}`,
  ];
  if (evidence) {
    lines.push(`evidence_schema_version=${evidence.schemaVersion}`);
    lines.push(`evidence_codes=${evidence.evidenceCodes.join(",")}`);
    lines.push(`start_phase=${evidence.startPhase}`);
    lines.push(`failure_service=${evidence.failureService ?? "unavailable"}`);
    lines.push(`first_error_signal=${evidence.firstErrorSignal ?? "unavailable"}`);
    lines.push(`first_error_excerpt=${evidence.firstErrorExcerpt ?? "unavailable"}`);
    lines.push(`first_error_source=${evidence.firstErrorSource ?? "unavailable"}`);
    lines.push(`docker_lifecycle_events=${evidence.dockerLifecycleEvents?.join(",") || "none"}`);
    lines.push(`startup_service_timeline=${evidence.startObservationTimeline || "none"}`);
    lines.push(`docker_containers=${evidence.dockerContainers ?? "unavailable"}`);
    lines.push(`docker_container_states=${Object.entries(evidence.dockerContainerStates).map(([state, count]) => `${state}:${count}`).join(",")}`);
    lines.push(`docker_images=${evidence.dockerImages ?? "unavailable"}`);
    lines.push(`network_state=${evidence.networkState}`);
    lines.push(`port_state=${evidence.portState}`);
    lines.push(`port_conflicts=${evidence.portConflicts.join(",") || "none"}`);
    lines.push(`required_services_state=${evidence.requiredServicesState}`);
    lines.push(`required_services_missing=${evidence.requiredServicesMissing.join(",") || "none"}`);
    lines.push(`health_state=${evidence.healthState}`);
    lines.push(`docker_cpu_count=${evidence.dockerCpuCount ?? "unavailable"}`);
    lines.push(`docker_memory_bytes=${evidence.dockerMemoryBytes ?? "unavailable"}`);
    lines.push(`supabase_status=${evidence.supabaseStatus}`);
    lines.push(`config_contract=${evidence.configContract}`);
    lines.push(`configured_ports=${Object.entries(evidence.configuredPorts).map(([name, port]) => `${name}:${port}`).join(",") || "unavailable"}`);
    lines.push(`duration_seconds=${evidence.durationSeconds ?? "unavailable"}`);
    lines.push(`start_observation_count=${evidence.startObservationCount ?? 0}`);
    lines.push(`start_observation_timeline=${evidence.startObservationTimeline || "unavailable"}`);
  }
  return lines.join("\n");
}

function probe(command, args, timeoutMs = 10_000) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, windowsHide: true });
  return { available: !result.error && result.status === 0, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

function sleepSync(milliseconds) {
  const signal = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(signal, 0, 0, milliseconds);
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readArgument(name) {
  const prefix = `${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

function main() {
  const logFile = readArgument("--log-file");
  const progressFile = readArgument("--progress-file");
  const dockerEventsFile = readArgument("--docker-events-file");
  const watchPidValue = readArgument("--watch-pid");
  const exitCodeValue = readArgument("--exit-code");
  const durationValue = readArgument("--duration-seconds");
  const expectedNetwork = readArgument("--expected-network");
  if (watchPidValue !== undefined) {
    const watchPid = Number.parseInt(watchPidValue, 10);
    if (!progressFile || !Number.isInteger(watchPid) || watchPid <= 0) throw new Error("Supabase start progress monitor requires --progress-file and a positive --watch-pid.");
    const startedAt = Date.now();
    do {
      appendFileSync(progressFile, `${JSON.stringify(collectStartProgressSnapshot({ elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000), expectedNetwork }))}\n`);
      if (!isProcessAlive(watchPid)) break;
      sleepSync(5_000);
    } while (isProcessAlive(watchPid));
    return;
  }
  const exitCode = Number.parseInt(exitCodeValue ?? "", 10);
  const durationSeconds = durationValue === undefined ? null : Number.parseInt(durationValue, 10);
  if (!logFile || !Number.isInteger(exitCode) || exitCode < 0 || (durationValue !== undefined && (!Number.isInteger(durationSeconds) || durationSeconds < 0))) throw new Error("Supabase start diagnostic requires --log-file and a non-negative --exit-code.");
  const log = readFileSync(logFile, "utf8");
  const dockerEvents = dockerEventsFile ? readFileSync(dockerEventsFile, "utf8") : "";
  const progress = readProgressSnapshots(progressFile);
  const evidence = collectBoundedStartEvidence({ log, dockerEvents, exitCode, durationSeconds, expectedNetwork, startProgressSnapshots: progress.snapshots, startProgressPartial: progress.partial });
  const category = classifySupabaseStartFailure({ log, exitCode, dockerCommandAvailable: evidence.dockerCommandAvailable, dockerDaemonAvailable: evidence.dockerDaemonAvailable, supabaseCliAvailable: evidence.supabaseCliAvailable, evidence });
  process.stdout.write(renderSupabaseStartDiagnostic({ category, exitCode, dockerVersion: evidence.dockerServerVersion, supabaseCliVersion: evidence.supabaseCliVersion, dockerDaemonAvailable: evidence.dockerDaemonAvailable, evidence }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Supabase start diagnostic unavailable: ${error instanceof Error ? error.message : "unknown error"}\n`);
    process.exitCode = 1;
  }
}
