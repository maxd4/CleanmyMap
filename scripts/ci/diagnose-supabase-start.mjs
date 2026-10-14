import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

export function renderSupabaseStartDiagnostic({
  category,
  exitCode,
  dockerVersion,
  supabaseCliVersion,
  dockerDaemonAvailable,
}) {
  const result = exitCode === 0 ? "success" : "failure";
  const daemon = dockerDaemonAvailable ? "available" : "unavailable";
  return [
    "Supabase start diagnostic (bounded; raw log withheld):",
    `result=${result} exit_code=${exitCode}`,
    `category=${category}`,
    `docker_version=${sanitizeVersion(dockerVersion)}`,
    `supabase_cli_version=${sanitizeVersion(supabaseCliVersion)}`,
    `docker_daemon=${daemon}`,
  ].join("\n");
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
  const exitCode = Number.parseInt(exitCodeValue ?? "", 10);

  if (!logFile || !Number.isInteger(exitCode) || exitCode < 0) {
    throw new Error("Supabase start diagnostic requires --log-file and a non-negative --exit-code.");
  }

  const log = readFileSync(logFile, "utf8");
  const dockerVersion = probe("docker", ["--version"]);
  const dockerDaemon = probe("docker", ["info", "--format", "{{.ServerVersion}}"]);
  const supabaseCli = probe("npx", ["--no-install", "supabase", "--version"]);
  const category = classifySupabaseStartFailure({
    log,
    exitCode,
    dockerCommandAvailable: dockerVersion.available,
    dockerDaemonAvailable: dockerDaemon.available,
    supabaseCliAvailable: supabaseCli.available,
  });

  process.stdout.write(renderSupabaseStartDiagnostic({
    category,
    exitCode,
    dockerVersion: dockerVersion.output,
    supabaseCliVersion: supabaseCli.output,
    dockerDaemonAvailable: dockerDaemon.available,
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
