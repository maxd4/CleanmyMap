import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const SUPABASE_START_CATEGORIES = Object.freeze({
  DOCKER_UNAVAILABLE: "DOCKER_UNAVAILABLE",
  IMAGE_UNAVAILABLE: "IMAGE_UNAVAILABLE",
  PORT_CONFLICT: "PORT_CONFLICT",
  HEALTHCHECK_FAILURE: "HEALTHCHECK_FAILURE",
  CLI_CONFIGURATION_INCOMPATIBILITY: "CLI_CONFIGURATION_INCOMPATIBILITY",
  INSUFFICIENT_RESOURCES: "INSUFFICIENT_RESOURCES",
  UNCLASSIFIED: "UNCLASSIFIED",
  START_SUCCEEDED: "START_SUCCEEDED",
});

const categoryPatterns = [
  [
    SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE,
    /(pull access denied|manifest unknown|failed to (resolve|pull|copy)|error response from daemon:.*(get|pull)|image .*not found)/i,
  ],
  [
    SUPABASE_START_CATEGORIES.PORT_CONFLICT,
    /(port is already allocated|address already in use|bind:.*address|listen tcp.*already)/i,
  ],
  [
    SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE,
    /(health.?check|unhealthy|timed out waiting|container .* failed to become healthy)/i,
  ],
  [
    SUPABASE_START_CATEGORIES.INSUFFICIENT_RESOURCES,
    /(no space left on device|out of memory|cannot allocate memory|disk quota|insufficient (memory|resources))/i,
  ],
  [
    SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY,
    /(unknown option|unknown flag|invalid configuration|could not find.*config|project_id|unsupported .*version|cannot find module|could not determine executable|command not found)/i,
  ],
];

const dockerUnavailablePattern = /(cannot connect to the docker daemon|is the docker daemon running|docker daemon.*(not running|unavailable)|docker command not found|error during connect)/i;
const containerStateNames = Object.freeze(["running", "exited", "created", "restarting", "other"]);

export function classifySupabaseStartFailure({
  log,
  exitCode,
  dockerCommandAvailable = true,
  dockerDaemonAvailable = true,
  supabaseCliAvailable = true,
}) {
  if (exitCode === 0) return SUPABASE_START_CATEGORIES.START_SUCCEEDED;

  if (!dockerCommandAvailable || !dockerDaemonAvailable || dockerUnavailablePattern.test(log)) {
    return SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE;
  }

  if (!supabaseCliAvailable) return SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY;

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(log)) return category;
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

function readConfigContract(root) {
  try {
    const config = readFileSync(path.join(root, "apps/web/supabase/config.toml"), "utf8");
    const projectId = config.match(/^project_id\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
    const majorVersion = config.match(/^major_version\s*=\s*(\d+)\s*$/m)?.[1] ?? null;
    const healthTimeout = config.match(/^health_timeout\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
    return {
      available: true,
      valid: projectId === "web" && majorVersion === "17" && healthTimeout === "2m",
    };
  } catch {
    return { available: false, valid: false };
  }
}

function classifyContainerStates(output) {
  const states = Object.fromEntries(containerStateNames.map((state) => [state, 0]));
  for (const line of String(output ?? "").split(/\r?\n/).filter(Boolean)) {
    const status = line.split("\t")[1]?.toLowerCase() ?? "";
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

export function collectBoundedStartEvidence({
  log,
  exitCode,
  durationSeconds = null,
  root = process.cwd(),
  probeCommand = probe,
}) {
  const dockerVersion = probeCommand("docker", ["--version"]);
  const dockerDaemon = probeCommand("docker", ["info", "--format", "{{.ServerVersion}}"]);
  const dockerInfo = probeCommand("docker", ["info", "--format", "{{json .}}"]);
  const dockerContainers = probeCommand("docker", ["ps", "-a", "--filter", "name=supabase_", "--format", "{{.Names}}\t{{.Status}}"]);
  const supabaseCli = probeCommand("npx", ["--no-install", "supabase", "--version"]);
  const supabaseStatus = probeCommand("npx", ["--no-install", "supabase", "status", "--workdir", "apps/web", "--output", "json"]);
  const configContract = readConfigContract(root);
  const parsedDockerInfo = parseJsonObject(dockerInfo.output);
  const containerInspectionAvailable = dockerContainers.available;
  const containerStates = containerInspectionAvailable ? classifyContainerStates(dockerContainers.output) : unavailableContainerStates();
  const containerCount = containerInspectionAvailable
    ? Object.values(containerStates).reduce((total, count) => total + count, 0)
    : null;
  const category = categoryForLog(log, exitCode);
  const evidenceCodes = [
    dockerVersion.available ? "DOCKER_COMMAND_AVAILABLE" : "DOCKER_COMMAND_UNAVAILABLE",
    dockerDaemon.available ? "DOCKER_DAEMON_AVAILABLE" : "DOCKER_DAEMON_UNAVAILABLE",
    supabaseCli.available ? "SUPABASE_CLI_AVAILABLE" : "SUPABASE_CLI_UNAVAILABLE",
    configContract.valid ? "SUPABASE_CONFIG_CONTRACT_VALID" : configContract.available ? "SUPABASE_CONFIG_CONTRACT_INVALID" : "SUPABASE_CONFIG_UNAVAILABLE",
    supabaseStatus.available ? "SUPABASE_STATUS_AVAILABLE" : "SUPABASE_STATUS_UNAVAILABLE",
    containerCount === null ? "SUPABASE_CONTAINERS_UNOBSERVED" : containerCount === 0 ? "NO_SUPABASE_CONTAINERS" : "SUPABASE_CONTAINERS_PRESENT",
    parsedDockerInfo ? "DOCKER_RESOURCES_OBSERVED" : "DOCKER_RESOURCES_UNAVAILABLE",
    category === SUPABASE_START_CATEGORIES.UNCLASSIFIED ? "NO_CLASSIFIABLE_START_LOG_SIGNAL" : category === SUPABASE_START_CATEGORIES.START_SUCCEEDED ? "START_SUCCEEDED" : `LOG_SIGNAL_${category}`,
  ];
  if (exitCode !== 0) evidenceCodes.push("NONZERO_START_EXIT");
  if (Number.isFinite(durationSeconds) && durationSeconds >= 80) evidenceCodes.push("START_DURATION_OVER_80_SECONDS");

  return {
    schemaVersion: 1,
    evidenceCodes: [...new Set(evidenceCodes)].sort((left, right) => left.localeCompare(right, "en")),
    dockerCommandAvailable: dockerVersion.available,
    dockerDaemonAvailable: dockerDaemon.available,
    supabaseCliAvailable: supabaseCli.available,
    dockerServerVersion: sanitizeVersion(dockerDaemon.output),
    supabaseCliVersion: sanitizeVersion(supabaseCli.output),
    dockerContainers: containerCount,
    dockerContainerStates: containerStates,
    dockerCpuCount: Number.isSafeInteger(parsedDockerInfo?.NCPU) ? parsedDockerInfo.NCPU : null,
    dockerMemoryBytes: Number.isSafeInteger(parsedDockerInfo?.MemTotal) ? parsedDockerInfo.MemTotal : null,
    supabaseStatus: supabaseStatus.available ? "available" : "unavailable",
    configContract: configContract.valid ? "valid" : configContract.available ? "invalid" : "unavailable",
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
  };
}

function categoryForLog(log, exitCode) {
  return classifySupabaseStartFailure({ log, exitCode });
}

export function renderSupabaseStartDiagnostic({
  category,
  exitCode,
  dockerVersion,
  supabaseCliVersion,
  dockerDaemonAvailable,
  evidence,
}) {
  const result = exitCode === 0 ? "success" : "failure";
  const daemon = dockerDaemonAvailable ? "available" : "unavailable";
  const lines = [
    "Supabase start diagnostic (bounded; raw log withheld):",
    `result=${result} exit_code=${exitCode}`,
    `category=${category}`,
    `docker_version=${sanitizeVersion(dockerVersion)}`,
    `supabase_cli_version=${sanitizeVersion(supabaseCliVersion)}`,
    `docker_daemon=${daemon}`,
  ];
  if (evidence) {
    lines.push(`evidence_schema_version=${evidence.schemaVersion}`);
    lines.push(`evidence_codes=${evidence.evidenceCodes.join(",")}`);
    lines.push(`docker_containers=${evidence.dockerContainers ?? "unavailable"}`);
    lines.push(`docker_container_states=${Object.entries(evidence.dockerContainerStates).map(([state, count]) => `${state}:${count}`).join(",")}`);
    lines.push(`docker_cpu_count=${evidence.dockerCpuCount ?? "unavailable"}`);
    lines.push(`docker_memory_bytes=${evidence.dockerMemoryBytes ?? "unavailable"}`);
    lines.push(`supabase_status=${evidence.supabaseStatus}`);
    lines.push(`config_contract=${evidence.configContract}`);
    lines.push(`duration_seconds=${evidence.durationSeconds ?? "unavailable"}`);
  }
  return lines.join("\n");
}

function probe(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000,
    windowsHide: true,
  });

  return {
    available: !result.error && result.status === 0,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function readArgument(name) {
  const prefix = `${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

function main() {
  const logFile = readArgument("--log-file");
  const exitCodeValue = readArgument("--exit-code");
  const durationValue = readArgument("--duration-seconds");
  const exitCode = Number.parseInt(exitCodeValue ?? "", 10);
  const durationSeconds = durationValue === undefined ? null : Number.parseInt(durationValue, 10);

  if (!logFile || !Number.isInteger(exitCode) || exitCode < 0 || (durationValue !== undefined && (!Number.isInteger(durationSeconds) || durationSeconds < 0))) {
    throw new Error("Supabase start diagnostic requires --log-file and a non-negative --exit-code.");
  }

  const log = readFileSync(logFile, "utf8");
  const evidence = collectBoundedStartEvidence({ log, exitCode, durationSeconds });
  const category = classifySupabaseStartFailure({
    log,
    exitCode,
    dockerCommandAvailable: evidence.dockerCommandAvailable,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    supabaseCliAvailable: evidence.supabaseCliAvailable,
  });

  process.stdout.write(renderSupabaseStartDiagnostic({
    category,
    exitCode,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.evidenceCodes.includes("DOCKER_DAEMON_AVAILABLE"),
    evidence,
  }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Supabase start diagnostic unavailable: ${error instanceof Error ? error.message : "unknown error"}\n`);
    process.exitCode = 1;
  }
}
