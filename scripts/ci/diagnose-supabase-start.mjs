import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parseSupabaseBootstrapJobs } from "./supabase-start-bootstrap.mjs";

export const SUPABASE_START_CATEGORIES = Object.freeze({
  DOCKER_UNAVAILABLE: "DOCKER_UNAVAILABLE",
  IMAGE_UNAVAILABLE: "IMAGE_UNAVAILABLE",
  NETWORK_FAILURE: "NETWORK_FAILURE",
  PORT_CONFLICT: "PORT_CONFLICT",
  AUTHENTICATION_FAILURE: "AUTHENTICATION_FAILURE",
  HEALTHCHECK_FAILURE: "HEALTHCHECK_FAILURE",
  BOOTSTRAP_JOB_FAILURE: "BOOTSTRAP_JOB_FAILURE",
  MIGRATION_SQL_SYNTAX: "MIGRATION_SQL_SYNTAX",
  MIGRATION_SQL_DEPENDENCY: "MIGRATION_SQL_DEPENDENCY",
  MIGRATION_SQL_DATA: "MIGRATION_SQL_DATA",
  MIGRATION_RLS_PERMISSION: "MIGRATION_RLS_PERMISSION",
  MIGRATION_SQL_CONCURRENCY: "MIGRATION_SQL_CONCURRENCY",
  DATABASE_CONNECTION_FAILURE: "DATABASE_CONNECTION_FAILURE",
  CLI_CONFIGURATION_INCOMPATIBILITY: "CLI_CONFIGURATION_INCOMPATIBILITY",
  INSUFFICIENT_RESOURCES: "INSUFFICIENT_RESOURCES",
  START_TIMEOUT: "START_TIMEOUT",
  START_CANCELLED: "START_CANCELLED",
  START_INCOMPLETE: "START_INCOMPLETE",
  UNCLASSIFIED: "UNCLASSIFIED",
  START_SUCCEEDED: "START_SUCCEEDED",
});

export const SUPABASE_START_REQUIRED_SERVICES = Object.freeze(["db", "kong", "rest", "storage"]);

const firstErrorSignalPatterns = [
  ["DOCKER_UNAVAILABLE", /(cannot connect to the docker daemon|is the docker daemon running|docker daemon.*(?:not running|unavailable)|docker command not found|error during connect)/i],
  ["AUTHENTICATION", /(password authentication failed|authentication failed|invalid password|no password supplied|role .+ does not exist|sqlstate\s*28[0-9a-z]{3})/i],
  ["SQLSTATE_SYNTAX", /\bsql\s*state\s*[:=]?\s*42601\b/i],
  ["SQLSTATE_DEPENDENCY", /\bsql\s*state\s*[:=]?\s*(?:42p01|42703|42883|2bp01)\b/i],
  ["SQLSTATE_RLS", /\bsql\s*state\s*[:=]?\s*42501\b/i],
  ["SQLSTATE_CONCURRENCY", /\bsql\s*state\s*[:=]?\s*(?:40001|40p01|55p03)\b/i],
  ["SQLSTATE_DATA", /\bsql\s*state\s*[:=]?\s*(?:22[0-9a-z]{3}|23[0-9a-z]{3})\b/i],
  ["SQLSTATE_CONNECTION", /\bsql\s*state\s*[:=]?\s*08[0-9a-z]{3}\b/i],
  ["IMAGE_PULL", /(pull access denied|manifest unknown|failed to (pull|copy)|error response from daemon:.*(get|pull)|image .*not found)/i],
  ["TCP_REFUSED", /\b(econnrefused|connection refused|actively refused)\b/i],
  ["TCP_TIMEOUT", /\b(etimedout|connection timed out|connect timeout)\b/i],
  ["NETWORK", /(failed to (create|connect|resolve).*network|network .*(not found|unavailable|fail|error|timeout|denied|refused|reset|exceeded)|(?:dns|name resolution|no such host|connection reset|connection refused|i\/o timeout|context deadline exceeded|tls handshake|proxy|package registry|container registry|docker registry|npm registry).*(?:error|fail|timeout|denied|refused|reset|exceeded|unavailable|not found)|(?:error|failed|unable|cannot|could not).*(?:dns|name resolution|proxy|package registry|container registry|docker registry|npm registry))/i],
  ["PORT_BIND", /(port is already allocated|address already in use|bind:.*address|listen tcp.*already)/i],
  ["HEALTHCHECK", /(?:\b(?:container|service)\s+[\w.-]+\s+(?:is\s+)?unhealthy\b|\bhealth checks?\s+(?:failed|timed out)\b|\bhealthcheck\s+(?:failed|timed out)\b|\btimed out waiting for (?:the )?health\b)/i],
  ["RESOURCE", /(no space left on device|out of memory|cannot allocate memory|disk quota|insufficient (memory|resources))/i],
  ["CLI_CONFIGURATION", /(unknown option|unknown flag|invalid configuration|could not find.*config|project_id|unsupported .*version|cannot find module|could not determine executable|command not found)/i],
  ["PERMISSION", /(permission denied|access denied|forbidden)/i],
  ["CONTAINER_CREATE", /((failed|error|unable|cannot).*(create|start).*(container|service)|failed to create (container|service))/i],
  ["CONTAINER_EXIT", /(container .* (exited|stopped|terminated)|exit (status|code)|exited with code)/i],
  ["UNKNOWN_ERROR", /\b(error|failed|fatal|panic)\b/i],
];

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
const postgresErrorTypes = new Set([
  "bigint", "boolean", "bytea", "character", "character varying", "date", "double precision", "integer",
  "interval", "json", "jsonb", "numeric", "real", "smallint", "text", "time", "time with time zone",
  "time without time zone", "timestamp", "timestamp with time zone", "timestamp without time zone", "uuid",
]);

export function classifySupabaseStartFailure({
  log,
  exitCode,
  dockerCommandAvailable = true,
  dockerDaemonAvailable = true,
  supabaseCliAvailable = true,
  evidence = null,
}) {
  if (exitCode === 124) return SUPABASE_START_CATEGORIES.START_TIMEOUT;
  if ([130, 137, 143].includes(exitCode)) return SUPABASE_START_CATEGORIES.START_CANCELLED;
  if (exitCode === 0) {
    if (evidence?.requiredServicesState === "ready" && evidence?.healthState === "healthy" && evidence?.supabaseStatus === "available") return SUPABASE_START_CATEGORIES.START_SUCCEEDED;
    if (evidence?.requiredServicesState === "unhealthy" || evidence?.healthState === "failed") return SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE;
    return SUPABASE_START_CATEGORIES.START_INCOMPLETE;
  }
  if (!dockerCommandAvailable || !dockerDaemonAvailable) return SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE;
  if (!supabaseCliAvailable) return SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY;
  if (evidence?.firstFailedBootstrapJob) return SUPABASE_START_CATEGORIES.BOOTSTRAP_JOB_FAILURE;
  const error = inferFirstErrorEvidence(log);
  const signalCategories = {
    DOCKER_UNAVAILABLE: SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE,
    AUTHENTICATION: SUPABASE_START_CATEGORIES.AUTHENTICATION_FAILURE,
    TCP_REFUSED: SUPABASE_START_CATEGORIES.NETWORK_FAILURE,
    TCP_TIMEOUT: SUPABASE_START_CATEGORIES.NETWORK_FAILURE,
    NETWORK: SUPABASE_START_CATEGORIES.NETWORK_FAILURE,
    IMAGE_PULL: SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE,
    PORT_BIND: SUPABASE_START_CATEGORIES.PORT_CONFLICT,
    HEALTHCHECK: SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE,
    RESOURCE: SUPABASE_START_CATEGORIES.INSUFFICIENT_RESOURCES,
    CLI_CONFIGURATION: SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY,
    SQLSTATE_SYNTAX: SUPABASE_START_CATEGORIES.MIGRATION_SQL_SYNTAX,
    SQLSTATE_DEPENDENCY: SUPABASE_START_CATEGORIES.MIGRATION_SQL_DEPENDENCY,
    SQLSTATE_DATA: SUPABASE_START_CATEGORIES.MIGRATION_SQL_DATA,
    SQLSTATE_RLS: SUPABASE_START_CATEGORIES.MIGRATION_RLS_PERMISSION,
    SQLSTATE_CONCURRENCY: SUPABASE_START_CATEGORIES.MIGRATION_SQL_CONCURRENCY,
    SQLSTATE_CONNECTION: SUPABASE_START_CATEGORIES.DATABASE_CONNECTION_FAILURE,
  };
  if (signalCategories[error.signal]) return signalCategories[error.signal];
  if (evidence && typeof evidence === "object") {
    if (evidence.portState === "conflict") return SUPABASE_START_CATEGORIES.PORT_CONFLICT;
    if (evidence.timeoutObserved === true) return SUPABASE_START_CATEGORIES.START_TIMEOUT;
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
    return { available: true, valid: projectId === "web" && majorVersion === "17" && healthTimeout === "2m" && validPorts, projectId, ports };
  } catch {
    return { available: false, valid: false, projectId: null, ports: {} };
  }
}

const DB_HEALTH_STATES = new Set(["healthy", "unhealthy", "starting", "no_health", "unobserved"]);
const DB_POSTGRES_STATES = new Set(["ready", "not_ready", "unavailable", "unobserved"]);
const DB_HOST_TCP_STATES = new Set(["connected", "refused", "timeout", "unavailable", "unobserved"]);

function safeProbeState(result, allowedStates, defaultState = "unavailable") {
  const value = String(result?.output ?? "").trim().split(/\s+/u).at(-1)?.replace(/^[^=]+=/u, "");
  return result?.available && allowedStates.has(value) ? value : defaultState;
}

function collectDbRuntimeChecks({ projectId, dbPort, dbRunning, probeCommand }) {
  if (!dbRunning || !projectId || !Number.isInteger(dbPort) || dbPort <= 0 || dbPort > 65535) {
    return { dbDockerHealth: "unobserved", dbPostgresInternal: "unobserved", dbHostTcp: "unobserved" };
  }
  const container = `supabase_db_${projectId}`;
  const health = probeCommand("docker", ["inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}no_health{{end}}", container]);
  const postgres = probeCommand("docker", ["exec", container, "sh", "-c", "pg_isready -q -h 127.0.0.1 -p 5432; code=$?; if [ \"$code\" -eq 0 ]; then echo ready; elif [ \"$code\" -eq 1 ]; then echo not_ready; else echo unavailable; fi; exit 0"]);
  const tcpScript = "const net=require('node:net');const socket=net.connect({host:'127.0.0.1',port:Number(process.argv[1])});let done=false;const finish=(state)=>{if(done)return;done=true;console.log('tcp='+state);socket.destroy()};socket.setTimeout(900,()=>finish('timeout'));socket.once('connect',()=>finish('connected'));socket.once('error',(error)=>finish(error.code==='ECONNREFUSED'?'refused':'unavailable'));";
  const tcp = probeCommand("node", ["-e", tcpScript, String(dbPort)]);
  return {
    dbDockerHealth: safeProbeState(health, DB_HEALTH_STATES),
    dbPostgresInternal: safeProbeState(postgres, DB_POSTGRES_STATES),
    dbHostTcp: safeProbeState(tcp, DB_HOST_TCP_STATES),
  };
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

function inferStartStep(log, bootstrapJobs = null) {
  if (bootstrapJobs?.firstFailedJob) return `BOOTSTRAP_${bootstrapJobs.firstFailedJob.service.toUpperCase()}_JOB`;
  const phases = [
    ["DATABASE_HEALTH", /waiting for health checks|waiting for database health/i],
    ["SCHEMA_INITIALIZATION", /initiali[sz]ing schema/i],
    ["MIGRATIONS", /applying (?:database )?migrations?/i],
    ["SEED", /(?:running|applying) (?:the )?seed|seeding data/i],
    ["PERSISTENT_SERVICES", /starting (?:persistent )?services|starting containers/i],
  ];
  let phase = "UNKNOWN";
  for (const line of String(log ?? "").split(/\r?\n/u)) {
    const matched = phases.find(([, pattern]) => pattern.test(line));
    if (matched) phase = matched[0];
  }
  if (phase !== "UNKNOWN") return phase;
  if (bootstrapJobs?.lastStartedJob) return `BOOTSTRAP_${bootstrapJobs.lastStartedJob.toUpperCase()}_JOB`;
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
  AUTHENTICATION: "authentication",
  TCP_REFUSED: "tcp_refused",
  TCP_TIMEOUT: "tcp_timeout",
  RESOURCE: "resource",
  CLI_CONFIGURATION: "cli_configuration",
  PERMISSION: "permission",
  CONTAINER_CREATE: "container_create",
  CONTAINER_EXIT: "container_exit",
  UNKNOWN_ERROR: "unknown_error",
  SQLSTATE_SYNTAX: "sql_syntax",
  SQLSTATE_DEPENDENCY: "sql_dependency",
  SQLSTATE_DATA: "sql_data",
  SQLSTATE_RLS: "rls_permission",
  SQLSTATE_CONCURRENCY: "sql_concurrency",
  SQLSTATE_CONNECTION: "database_connection",
});

function sqlStateFromText(text) {
  return String(text ?? "").match(/\bsql\s*state\s*[:=]?\s*([0-9A-Z]{5})\b/i)?.[1]?.toUpperCase() ?? null;
}

function sqlStateFromLogLine(line) {
  const text = String(line ?? "");
  const fromText = sqlStateFromText(text);
  if (fromText) return fromText;
  try {
    const parsed = JSON.parse(text);
    const visit = (value) => {
      if (!value || typeof value !== "object") return null;
      for (const [key, nested] of Object.entries(value)) {
        if (/^(?:sqlstate|sql_state|sql_state_code|sqlState)$/i.test(key) && /^[0-9A-Z]{5}$/i.test(String(nested ?? ""))) return String(nested).toUpperCase();
        if (typeof nested === "object") {
          const found = visit(nested);
          if (found) return found;
        }
      }
      return null;
    };
    return visit(parsed);
  } catch {
    return null;
  }
}

function signalForSqlState(sqlState) {
  if (sqlState === "42601") return "SQLSTATE_SYNTAX";
  if (sqlState === "42501") return "SQLSTATE_RLS";
  if (/^(?:22|23)[0-9A-Z]{3}$/.test(sqlState ?? "")) return "SQLSTATE_DATA";
  if (/^(?:40001|40P01|55P03)$/.test(sqlState ?? "")) return "SQLSTATE_CONCURRENCY";
  if (/^08[0-9A-Z]{3}$/.test(sqlState ?? "")) return "SQLSTATE_CONNECTION";
  if (/^42[0-9A-Z]{3}$/.test(sqlState ?? "")) return "SQLSTATE_DEPENDENCY";
  return null;
}

function sanitizeErrorExcerpt(signal, service, sqlState = null) {
  const label = firstErrorDiagnosticLabels[signal] ?? "unknown";
  const safeService = service ?? "unavailable";
  return `class=${label};service=${safeService}${sqlState ? `;sqlstate=${sqlState}` : ""}`;
}

function sanitizeBootstrapJobError(job) {
  if (!job) return null;
  return `class=bootstrap_job_exit;service=${job.service};exit_code=${job.exitCode}`;
}

function terminalLogMessage(line) {
  const normalized = String(line ?? "").replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "").trim();
  if (!normalized) return null;
  if (normalized.startsWith("{")) {
    try {
      const entry = JSON.parse(normalized);
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const level = String(entry.level ?? entry.severity ?? "").toLowerCase();
      const error = entry.error ?? entry.Error;
      if (!/(error|fatal|panic)/.test(level) && error === undefined && !sqlStateFromLogLine(normalized)) return null;
      const messages = [];
      const collectMessages = (value, depth = 0) => {
        if (!value || typeof value !== "object" || depth > 6 || messages.length >= 5) return;
        for (const [key, nested] of Object.entries(value)) {
          if (/^(?:message|msg|detail|hint)$/i.test(key) && typeof nested === "string") messages.push(nested.slice(0, 500));
          else if (nested && typeof nested === "object") collectMessages(nested, depth + 1);
          if (messages.length >= 5) break;
        }
      };
      collectMessages(entry);
      const message = messages.join(" ") || "structured terminal error";
      const errorObject = error && typeof error === "object" ? error : {};
      const sqlState = [entry.sqlstate, entry.sqlState, entry.code, errorObject.sqlstate, errorObject.sqlState, errorObject.code]
        .find((value) => /^[0-9A-Z]{5}$/i.test(String(value ?? "")));
      return `Error: ${message}${sqlState ? ` SQLSTATE ${String(sqlState).toUpperCase()}` : ""}`;
    } catch {
      return null;
    }
  }
  return normalized;
}

function inferFirstErrorEvidence(log) {
  let genericError = null;
  const lines = String(log ?? "").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const normalized = terminalLogMessage(line);
    const sqlState = sqlStateFromLogLine(line) ?? sqlStateFromText(normalized);
    const signal = firstErrorSignalPatterns.find(([candidate, pattern]) => candidate !== "UNKNOWN_ERROR" && normalized && pattern.test(normalized))?.[0]
      ?? signalForSqlState(sqlState);
    const isTerminalError = normalized && /^\s*(?:error\b|fatal\b|panic:|failed\b|unable\b|cannot\b|could not\b)/i.test(normalized);
    const hasErrorSignal = normalized && firstErrorSignalPatterns.some(([candidate, pattern]) => candidate !== "UNKNOWN_ERROR" && pattern.test(normalized));
    if (!signal && !isTerminalError && !hasErrorSignal) continue;
    const resolvedSignal = signal ?? "UNKNOWN_ERROR";
    const result = {
      signal: resolvedSignal,
      sqlState,
      detail: safeSqlErrorDetail(lines.slice(index, index + 12).join(" "), sqlState),
      excerpt: sanitizeErrorExcerpt(resolvedSignal, inferFailureService(normalized), sqlState),
    };
    if (resolvedSignal !== "UNKNOWN_ERROR") return result;
    genericError ??= result;
  }
  return genericError ?? { signal: "NONE", excerpt: "none" };
}

function safeSqlErrorDetail(message, sqlState) {
  if (!sqlState) return null;
  if (sqlState === "22P02") {
    const candidate = String(message ?? "").match(/invalid input syntax for type\s+([a-z][a-z0-9_ ]{0,48}?)(?::|\s*$)/i)?.[1]?.trim().toLowerCase();
    const type = candidate && postgresErrorTypes.has(candidate) ? candidate.replace(/\s+/g, "_") : null;
    return type ? `INVALID_TEXT_REPRESENTATION;type=${type}` : "INVALID_TEXT_REPRESENTATION";
  }
  if (sqlState.startsWith("22")) return `DATA_EXCEPTION;sqlstate=${sqlState}`;
  if (sqlState.startsWith("23")) return `INTEGRITY_CONSTRAINT;sqlstate=${sqlState}`;
  return `SQL_ERROR;sqlstate=${sqlState}`;
}

function inferMigrationId(log, postgresLog = "", root = process.cwd()) {
  const explicitFailure = String(log ?? "").match(/\bfailed to apply migration\s+["']?(20\d{12})(?:_[a-z0-9_-]+\.sql)?\b/i)
    ?? String(log ?? "").match(/\bmigration\s+["']?(20\d{12})(?:_[a-z0-9_-]+\.sql)?["']?\s+(?:failed|failed to apply)\b/i);
  if (explicitFailure) return explicitFailure[1];
  const statement = postgresFailingStatement(postgresLog);
  if (!statement || statement.length < 24) return null;
  try {
    const migrationsDirectory = path.join(root, "apps/web/supabase/migrations");
    const matchingIds = readdirSync(migrationsDirectory)
      .filter((fileName) => /^20\d{12}_[a-z0-9_-]+\.sql$/i.test(fileName))
      .filter((fileName) => readFileSync(path.join(migrationsDirectory, fileName), "utf8").includes(statement))
      .map((fileName) => fileName.slice(0, 14));
    return matchingIds.length === 1 ? matchingIds[0] : null;
  } catch {
    return null;
  }
}

function postgresFailingStatement(log) {
  const lines = String(log ?? "").split(/\r?\n/u);
  const errorIndex = lines.findIndex((line) => sqlStateFromLogLine(line) || /invalid input syntax for type/i.test(line));
  if (errorIndex < 0) return null;
  const context = lines.slice(Math.max(0, errorIndex - 2), errorIndex + 6);
  for (const line of context) {
    const statement = line.match(/\bSTATEMENT:\s*(.+)$/i)?.[1];
    if (statement) return statement.trim();
    try {
      const parsed = JSON.parse(line);
      const findStatement = (value, depth = 0) => {
        if (!value || typeof value !== "object" || depth > 6) return null;
        for (const [key, nested] of Object.entries(value)) {
          if (/^(?:statement|query)$/i.test(key) && typeof nested === "string") return nested.trim();
          if (nested && typeof nested === "object") {
            const found = findStatement(nested, depth + 1);
            if (found) return found;
          }
        }
        return null;
      };
      const statementValue = findStatement(parsed);
      if (statementValue) return statementValue;
    } catch {
      // Plain PostgreSQL text log lines are expected alongside JSON log records.
    }
  }
  return null;
}

function postgresInstructionLocation(log) {
  const text = String(log ?? "");
  const character = text.match(/\bat character\s+(\d+)\b/i) ?? text.match(/\bat position\s+(\d+)\b/i);
  if (character) return `character_${character[1]}`;
  const jsonPosition = text.match(/"(?:statement_position|internal_position)"\s*:\s*"?(\d+)"?/i);
  if (jsonPosition) return `character_${jsonPosition[1]}`;
  const line = text.match(/\bline\s+(\d+)\s+at\s+(?:SQL statement|assignment|RETURN)/i);
  return line ? `line_${line[1]}` : null;
}

function postgresSqlErrorEvidence(log) {
  const text = String(log ?? "");
  const lines = text.split(/\r?\n/u);
  const stateIndex = lines.findIndex((line) => sqlStateFromLogLine(line));
  const invalidTextIndex = lines.findIndex((line) => /invalid input syntax for type/i.test(line));
  const textState = sqlStateFromText(text);
  const sqlState = stateIndex >= 0 ? sqlStateFromLogLine(lines[stateIndex]) : textState;
  const errorIndex = stateIndex >= 0 ? stateIndex : invalidTextIndex;
  if (!sqlState && invalidTextIndex < 0) return { sqlState: null, detail: null, instructionLocation: null };
  const errorContext = errorIndex >= 0 ? lines.slice(Math.max(0, errorIndex - 2), errorIndex + 6) : lines.slice(0, 8);
  const context = errorContext.join(" ");
  const detail = safeSqlErrorDetail(context, sqlState ?? "22P02");
  return { sqlState, detail, instructionLocation: postgresInstructionLocation(context) };
}

function inferFirstFailedStep(log, bootstrapJob, firstError, startPhase) {
  if (bootstrapJob) return `BOOTSTRAP_${bootstrapJob.service.toUpperCase()}_JOB`;
  if (startPhase === "MIGRATIONS") {
    const migrationSteps = {
      SQLSTATE_SYNTAX: "MIGRATION_SQL_SYNTAX",
      SQLSTATE_DEPENDENCY: "MIGRATION_SQL_DEPENDENCY",
      SQLSTATE_DATA: "MIGRATION_SQL_DATA",
      SQLSTATE_RLS: "MIGRATION_RLS_PERMISSION",
      SQLSTATE_CONCURRENCY: "MIGRATION_SQL_CONCURRENCY",
      SQLSTATE_CONNECTION: "MIGRATION_DATABASE_CONNECTION",
    };
    return migrationSteps[firstError?.signal] ?? "MIGRATION_EXECUTION_CAUSE_UNCLASSIFIED";
  }
  if (startPhase === "SCHEMA_INITIALIZATION") return "SCHEMA_INITIALIZATION_CAUSE_UNCLASSIFIED";
  if (["DOCKER_UNAVAILABLE", "IMAGE_PULL", "NETWORK", "PORT_BIND", "RESOURCE", "CONTAINER_CREATE", "CONTAINER_EXIT"].includes(firstError?.signal)) {
    return "DOCKER_INFRASTRUCTURE_FAILURE";
  }
  const lines = String(log ?? "").split(/\r?\n/u).map(terminalLogMessage).filter(Boolean);
  for (const line of lines) {
    if (/\b(?:migration|migrations)\b.*\b(?:failed|failure|error|unable|exited)\b|\bfailed to apply (?:database )?migration\b/i.test(line)) return "MIGRATIONS";
    if (/\bseed\b.*\b(?:failed|failure|error|unable|exited)\b|\bfailed to seed\b/i.test(line)) return "SEED";
    if (/\bschema\b.*\b(?:failed|failure|error|unable|exited)\b|\bfailed to initialize schema\b|\bfailed to initialise schema\b/i.test(line)) return "SCHEMA_INITIALIZATION";
    if (/\bhealth checks?\b.*\b(?:failed|failure|timeout|timed out)\b|\bhealthcheck\b.*\b(?:failed|failure|timeout|timed out)\b/i.test(line)) return "DATABASE_HEALTH";
    if (/\b(?:service|container)\b.*\b(?:failed to start|failed|failure|error|exited)\b/i.test(line)) return "PERSISTENT_SERVICES";
  }
  return "UNPROVEN";
}

function dockerEventMatchesProject(attributes, projectId) {
  if (projectId === undefined || projectId === null) return true;
  const labels = attributes.labels ?? attributes.Labels ?? attributes;
  return labels["com.supabase.cli.project"] === projectId;
}

export function parseFirstDockerFailureEvent(rawEvents, projectId) {
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
    if (!dockerEventMatchesProject(attributes, projectId)) continue;
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

export function parseDockerLifecycleEvents(rawEvents, projectId) {
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
    if (!dockerEventMatchesProject(attributes, projectId)) continue;
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

export function collectStartProgressSnapshot({ elapsedSeconds = 0, expectedNetwork, root = process.cwd(), probeCommand = (command, args) => probe(command, args, 2_000) }) {
  const dockerDaemon = probeCommand("docker", ["info", "--format", "{{.ServerVersion}}"]);
  const dockerContainers = probeCommand(dockerContainersCommand[0], dockerContainersCommand.slice(1));
  const dockerImages = probeCommand(dockerImagesCommand[0], dockerImagesCommand.slice(1));
  const dockerNetworks = probeCommand(dockerNetworksCommand[0], dockerNetworksCommand.slice(1));
  const containerInspectionAvailable = dockerContainers.available;
  const containerServices = containerInspectionAvailable ? parseContainerServices(dockerContainers.output) : {};
  const containerStates = containerInspectionAvailable ? classifyContainerStates(dockerContainers.output) : unavailableContainerStates();
  const containerCount = containerInspectionAvailable ? Object.values(containerStates).reduce((total, count) => total + count, 0) : null;
  const requiredServicesState = requiredServiceState(containerServices, containerCount);
  const configContract = readConfigContract(root);
  const dbChecks = collectDbRuntimeChecks({
    projectId: configContract.projectId,
    dbPort: configContract.ports.db,
    dbRunning: containerServices.db === "running",
    probeCommand,
  });
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
    ...dbChecks,
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
      dbDockerHealth: DB_HEALTH_STATES.has(snapshot.dbDockerHealth) ? snapshot.dbDockerHealth : "unobserved",
      dbPostgresInternal: DB_POSTGRES_STATES.has(snapshot.dbPostgresInternal) ? snapshot.dbPostgresInternal : "unobserved",
      dbHostTcp: DB_HOST_TCP_STATES.has(snapshot.dbHostTcp) ? snapshot.dbHostTcp : "unobserved",
      requiredServicesState: typeof snapshot.requiredServicesState === "string" ? snapshot.requiredServicesState : "unobserved",
      networkState: typeof snapshot.networkState === "string" ? snapshot.networkState : "unobserved",
    }));
}

function dbConnectivityDiagnosis(snapshots) {
  const dbSnapshots = snapshots.filter((snapshot) => snapshot.dbDockerHealth !== "unobserved"
    || snapshot.dbPostgresInternal !== "unobserved"
    || snapshot.dbHostTcp !== "unobserved");
  if (dbSnapshots.length === 0) return "unobserved";
  const latest = dbSnapshots.at(-1);
  if (latest.dbDockerHealth === "unhealthy") return "docker_unhealthy";
  if (latest.dbPostgresInternal === "not_ready") return "postgres_not_ready";
  if (latest.dbPostgresInternal === "ready" && latest.dbHostTcp === "refused") return "host_tcp_refused";
  if (latest.dbPostgresInternal === "ready" && latest.dbHostTcp === "timeout") return "host_tcp_timeout";
  if (latest.dbPostgresInternal === "ready" && latest.dbHostTcp === "connected") return "connected";
  return "inconclusive";
}

function inferConfirmedFailureService(log, firstDockerError, firstLogError) {
  if (["NONE", "UNKNOWN_ERROR"].includes(firstLogError.signal) && firstDockerError.signal !== "NONE") {
    return firstDockerError.excerpt.match(/;service=([a-z-]+)/)?.[1] ?? null;
  }
  const firstError = firstLogError;
  if (!["PORT_BIND", "IMAGE_PULL", "CONTAINER_CREATE", "RESOURCE", "PERMISSION"].includes(firstError.signal)) return null;
  return inferFailureService(String(log ?? "").split(/\r?\n/u).find((line) => firstErrorSignalPatterns.some(([signal, pattern]) => signal === firstError.signal && pattern.test(line))) ?? "");
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

export function collectBoundedStartEvidence({ log, postgresLog = "", postgresServerLog = "", dockerEvents = "", exitCode, durationSeconds = null, expectedNetwork, root = process.cwd(), probeCommand = probe, startProgressSnapshots = [], startProgressPartial = false }) {
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
  const bootstrapJobs = parseSupabaseBootstrapJobs(dockerEvents, configContract.projectId);
  const firstLogError = inferFirstErrorEvidence(log);
  const postgresError = postgresSqlErrorEvidence(postgresLog);
  const firstDockerError = parseFirstDockerFailureEvent(dockerEvents, configContract.projectId);
  const firstBootstrapJob = bootstrapJobs.firstFailedJob;
  const dockerEventIsMoreSpecific = firstLogError.signal === "UNKNOWN_ERROR" && firstDockerError.signal !== "NONE";
  const firstError = firstBootstrapJob
    ? { signal: firstBootstrapJob.signal === "DOCKER_OOM" ? "DOCKER_OOM" : "BOOTSTRAP_JOB_EXIT", excerpt: sanitizeBootstrapJobError(firstBootstrapJob), source: "DOCKER_EVENT" }
    : dockerEventIsMoreSpecific
    ? { ...firstDockerError, source: "DOCKER_EVENT" }
      : firstLogError.signal !== "NONE" && firstLogError.signal !== "UNKNOWN_ERROR"
      ? { ...firstLogError, detail: postgresError.detail ?? firstLogError.detail, sqlState: firstLogError.sqlState ?? postgresError.sqlState, source: postgresError.sqlState ? "POSTGRES_LOG" : "SUPABASE_CLI_LOG" }
      : postgresError.sqlState
        ? { signal: signalForSqlState(postgresError.sqlState) ?? "UNKNOWN_ERROR", sqlState: postgresError.sqlState, detail: postgresError.detail, source: "POSTGRES_LOG" }
      : firstLogError.signal !== "NONE"
        ? { ...firstLogError, source: "SUPABASE_CLI_LOG" }
      : { ...firstDockerError, source: firstDockerError.signal === "NONE" ? "UNAVAILABLE" : "DOCKER_EVENT" };
  const startPhase = inferStartStep(log, bootstrapJobs);
  const dbConnectivity = dbConnectivityDiagnosis(progressSnapshots);
  const lastDbObservation = [...progressSnapshots].reverse().find((snapshot) => snapshot.dbDockerHealth !== "unobserved"
    || snapshot.dbPostgresInternal !== "unobserved"
    || snapshot.dbHostTcp !== "unobserved");
  const confirmedService = firstBootstrapJob?.service ?? inferConfirmedFailureService(log, firstDockerError, firstLogError);
  const logService = inferFailureService(log);
  const suspectedService = confirmedService
    ? null
    : dbConnectivity === "connected"
      ? null
      : logService && (firstError.signal === "HEALTHCHECK" || firstError.signal === "CONTAINER_EXIT")
        ? logService
        : dbConnectivity.startsWith("host_tcp_") || dbConnectivity === "postgres_not_ready" || dbConnectivity === "docker_unhealthy"
          ? "db"
          : null;
  const evidence = {
    schemaVersion: 8,
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
    startPhase,
    firstFailedStep: inferFirstFailedStep(log, firstBootstrapJob, firstError, startPhase),
    firstFailedMigrationId: startPhase === "MIGRATIONS" ? inferMigrationId(log, postgresLog, root) : null,
    firstErrorSqlState: firstError.sqlState ?? String(log ?? "").split(/\r?\n/u).map(sqlStateFromLogLine).find(Boolean) ?? null,
    failureService: confirmedService,
    confirmedService,
    suspectedService,
    serviceAttribution: confirmedService ? "confirmed" : suspectedService ? "suspected" : "unknown",
    dbConnectivity,
    dbDockerHealth: lastDbObservation?.dbDockerHealth ?? "unobserved",
    dbPostgresInternal: lastDbObservation?.dbPostgresInternal ?? "unobserved",
    dbHostTcp: lastDbObservation?.dbHostTcp ?? "unobserved",
    dbConnectivityTimeline: progressSnapshots.map((snapshot) => `${snapshot.elapsedSeconds ?? "unknown"}:docker=${snapshot.dbDockerHealth};postgres=${snapshot.dbPostgresInternal};host_tcp=${snapshot.dbHostTcp}`).join(","),
    firstErrorSignal: firstError.signal,
    firstErrorDetail: firstError.detail ?? null,
    firstErrorInstructionLocation: postgresError.instructionLocation,
    postgresLogObserved: String(postgresLog ?? "").trim().length > 0,
    postgresServerLogObserved: String(postgresServerLog ?? "").trim().length > 0,
    firstErrorExcerpt: firstError.excerpt,
    firstErrorSource: firstError.source,
    dockerLifecycleEvents: parseDockerLifecycleEvents(dockerEvents, configContract.projectId),
    bootstrapLastStartedJob: bootstrapJobs.lastStartedJob,
    bootstrapLastStartedJobExitCode: bootstrapJobs.lastStartedJobExitCode,
    firstFailedBootstrapJob: firstBootstrapJob,
    bootstrapJobTimeline: bootstrapJobs.jobs.join(","),
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
  if (evidence.confirmedService) evidenceCodes.push("FAILED_SERVICE_CONFIRMED");
  else if (evidence.suspectedService) evidenceCodes.push("FAILED_SERVICE_SUSPECTED");
  if (evidence.dbConnectivity !== "unobserved") evidenceCodes.push(`DB_CONNECTIVITY_${evidence.dbConnectivity.toUpperCase()}`);
  if (firstDockerError.signal !== "NONE") evidenceCodes.push("DOCKER_FAILURE_EVENT_OBSERVED");
  if (bootstrapJobs.observed) evidenceCodes.push("BOOTSTRAP_JOBS_OBSERVED");
  if (firstBootstrapJob) evidenceCodes.push("BOOTSTRAP_JOB_FAILURE_CONFIRMED");
  if (evidence.dockerLifecycleEvents.length > 0) evidenceCodes.push("DOCKER_LIFECYCLE_EVENTS_OBSERVED");
  const category = classifySupabaseStartFailure({ log, exitCode, evidence });
  evidenceCodes.push(category === SUPABASE_START_CATEGORIES.UNCLASSIFIED ? "NO_CLASSIFIABLE_START_LOG_SIGNAL" : category === SUPABASE_START_CATEGORIES.START_SUCCEEDED ? "START_SUCCEEDED" : `LOG_SIGNAL_${category}`);
  evidence.evidenceCodes = [...new Set(evidenceCodes)].sort((left, right) => left.localeCompare(right, "en"));
  return evidence;
}

export function renderSupabaseStartDiagnostic({ category, exitCode, dockerVersion, supabaseCliVersion, dockerDaemonAvailable, evidence }) {
  const result = category === SUPABASE_START_CATEGORIES.START_SUCCEEDED ? "success" : "failure";
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
    lines.push(`first_failed_step=${evidence.firstFailedStep ?? "UNPROVEN"}`);
    lines.push(`first_failed_migration_id=${evidence.firstFailedMigrationId ?? "unavailable"}`);
    lines.push(`first_error_sqlstate=${evidence.firstErrorSqlState ?? "unavailable"}`);
    lines.push(`service_attribution=${evidence.serviceAttribution ?? "unknown"}`);
    lines.push(`confirmed_service=${evidence.confirmedService ?? "unavailable"}`);
    lines.push(`suspected_service=${evidence.suspectedService ?? "unavailable"}`);
    lines.push(`failure_service=${evidence.confirmedService ?? "unavailable"}`);
    lines.push(`first_error_signal=${evidence.firstErrorSignal ?? "unavailable"}`);
    lines.push(`first_error_detail=${evidence.firstErrorDetail ?? "unavailable"}`);
    lines.push(`first_error_instruction_location=${evidence.firstErrorInstructionLocation ?? "unavailable"}`);
    lines.push(`postgres_log_observed=${evidence.postgresLogObserved ? "true" : "false"}`);
    lines.push(`postgres_server_log_observed=${evidence.postgresServerLogObserved ? "true" : "false"}`);
    lines.push(`first_error_excerpt=${evidence.firstErrorExcerpt ?? "unavailable"}`);
    lines.push(`first_error_source=${evidence.firstErrorSource ?? "unavailable"}`);
    lines.push(`bootstrap_last_started_job=${evidence.bootstrapLastStartedJob ?? "unavailable"}`);
    lines.push(`bootstrap_last_started_job_exit_code=${evidence.bootstrapLastStartedJobExitCode ?? "unavailable"}`);
    lines.push(`bootstrap_first_failed_job=${evidence.firstFailedBootstrapJob ? `${evidence.firstFailedBootstrapJob.service};exit_code=${evidence.firstFailedBootstrapJob.exitCode}` : "none"}`);
    lines.push(`bootstrap_job_timeline=${evidence.bootstrapJobTimeline || "none"}`);
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
    lines.push(`db_docker_health=${evidence.dbDockerHealth ?? "unobserved"}`);
    lines.push(`db_postgres_internal=${evidence.dbPostgresInternal ?? "unobserved"}`);
    lines.push(`db_host_tcp=${evidence.dbHostTcp ?? "unobserved"}`);
    lines.push(`db_connectivity=${evidence.dbConnectivity ?? "unobserved"}`);
    lines.push(`db_connectivity_timeline=${evidence.dbConnectivityTimeline || "unavailable"}`);
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
  const postgresLogFile = readArgument("--postgres-log-file");
  const postgresServerLogFile = readArgument("--postgres-server-log-file");
  const watchPidValue = readArgument("--watch-pid");
  const exitCodeValue = readArgument("--exit-code");
  const durationValue = readArgument("--duration-seconds");
  const expectedNetwork = readArgument("--expected-network");
  const root = readArgument("--root") ?? process.cwd();
  if (watchPidValue !== undefined) {
    const watchPid = Number.parseInt(watchPidValue, 10);
    if (!progressFile || !Number.isInteger(watchPid) || watchPid <= 0) throw new Error("Supabase start progress monitor requires --progress-file and a positive --watch-pid.");
    const startedAt = Date.now();
    do {
      appendFileSync(progressFile, `${JSON.stringify(collectStartProgressSnapshot({ elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000), expectedNetwork, root }))}\n`);
      if (!isProcessAlive(watchPid)) break;
      sleepSync(5_000);
    } while (isProcessAlive(watchPid));
    return;
  }
  const exitCode = Number.parseInt(exitCodeValue ?? "", 10);
  const durationSeconds = durationValue === undefined ? null : Number.parseInt(durationValue, 10);
  if (!logFile || !Number.isInteger(exitCode) || exitCode < 0 || (durationValue !== undefined && (!Number.isInteger(durationSeconds) || durationSeconds < 0))) throw new Error("Supabase start diagnostic requires --log-file and a non-negative --exit-code.");
  const log = readFileSync(logFile, "utf8");
  const postgresContainerLog = postgresLogFile && existsSync(postgresLogFile) ? readFileSync(postgresLogFile, "utf8") : "";
  const postgresServerLog = postgresServerLogFile && existsSync(postgresServerLogFile) ? readFileSync(postgresServerLogFile, "utf8") : "";
  const postgresLog = [postgresContainerLog, postgresServerLog].filter(Boolean).join("\n");
  const dockerEvents = dockerEventsFile ? readFileSync(dockerEventsFile, "utf8") : "";
  const progress = readProgressSnapshots(progressFile);
  const evidence = collectBoundedStartEvidence({ log, postgresLog, postgresServerLog, dockerEvents, exitCode, durationSeconds, expectedNetwork, root, startProgressSnapshots: progress.snapshots, startProgressPartial: progress.partial });
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
