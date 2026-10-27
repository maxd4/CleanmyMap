import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync as readFileSyncFromFs } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  classifySupabaseStartFailure,
  collectBoundedStartEvidence,
  renderSupabaseStartDiagnostic,
  SUPABASE_START_CATEGORIES,
} from "./diagnose-supabase-start.mjs";

const workflow = readFileSyncFromFs(resolve(".github", "workflows", "e2e-supabase.yml"), "utf8");
const dockerContainersCommand = "docker ps -a --filter name=supabase_ --format {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}";
const dockerImagesCommand = "docker images --format {{.Repository}}\t{{.Tag}}";
const dockerNetworksCommand = "docker network ls --format {{.Name}}\t{{.Driver}}";
const listeningPortsCommand = "ss -ltnH";

function createProbeCommand({
  dockerVersion = { available: true, output: "Docker version 28.0.4" },
  dockerDaemon = { available: true, output: "28.0.4" },
  dockerInfo = { available: true, output: JSON.stringify({ NCPU: 4, MemTotal: 8_000_000_000 }) },
  dockerContainers = { available: true, output: "" },
  dockerImages = { available: true, output: "supabase/postgres\t17" },
  dockerNetworks = { available: true, output: "bridge\tbridge" },
  listeningPorts = { available: true, output: "" },
  supabaseCli = { available: true, output: "2.117.0" },
  supabaseStatus = { available: false, output: "status unavailable" },
} = {}) {
  const probeOutputs = new Map([
    ["docker --version", dockerVersion],
    ["docker info --format {{.ServerVersion}}", dockerDaemon],
    ["docker info --format {{json .}}", dockerInfo],
    [dockerContainersCommand, dockerContainers],
    [dockerImagesCommand, dockerImages],
    [dockerNetworksCommand, dockerNetworks],
    [listeningPortsCommand, listeningPorts],
    ["npx --no-install supabase --version", supabaseCli],
    ["npx --no-install supabase status --workdir apps/web --output json", supabaseStatus],
  ]);
  return (command, args) => probeOutputs.get([command, ...args].join(" ")) ?? { available: false, output: "unexpected" };
}

async function withTempConfig(config, callback) {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-"));
  await mkdir(resolve(root, "apps", "web", "supabase"), { recursive: true });
  await writeFile(resolve(root, "apps", "web", "supabase", "config.toml"), config);
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("classifies a failed start without exposing the raw Docker message", () => {
  const secretLog = "Error: pull access denied for private/image token=super-secret-jwt";
  const category = classifySupabaseStartFailure({ log: secretLog, exitCode: 1 });
  const diagnostic = renderSupabaseStartDiagnostic({
    category,
    exitCode: 1,
    dockerVersion: "Docker version 27.0.1, build secret-build",
    supabaseCliVersion: "2.117.0",
    dockerDaemonAvailable: true,
  });

  assert.equal(category, SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE);
  assert.match(diagnostic, /category=IMAGE_UNAVAILABLE/);
  assert.match(diagnostic, /docker_version=27\.0\.1/);
  assert.doesNotMatch(diagnostic, /private\/image|super-secret-jwt|secret-build/);
});

test("keeps classification safe when bounded startup evidence is absent", () => {
  const input = { log: "opaque startup failure", exitCode: 1 };

  assert.equal(classifySupabaseStartFailure({ ...input, evidence: null }), SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  assert.equal(classifySupabaseStartFailure(input), SUPABASE_START_CATEGORIES.UNCLASSIFIED);
  assert.equal(
    classifySupabaseStartFailure({
      ...input,
      evidence: { durationSeconds: 95, dockerContainers: 0, supabaseStatus: "unavailable" },
    }),
    SUPABASE_START_CATEGORIES.START_TIMEOUT,
  );
});

test("classifies Docker, port, healthcheck, resources and CLI failures", () => {
  const cases = [
    ["Cannot connect to the Docker daemon", SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE],
    ["failed to resolve registry network: i/o timeout", SUPABASE_START_CATEGORIES.NETWORK_FAILURE],
    ["Error: port is already allocated", SUPABASE_START_CATEGORIES.PORT_CONFLICT],
    ["container db is unhealthy", SUPABASE_START_CATEGORIES.HEALTHCHECK_FAILURE],
    ["no space left on device", SUPABASE_START_CATEGORIES.INSUFFICIENT_RESOURCES],
    ["unknown flag: --workdir", SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY],
    ["", SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY, { supabaseCliAvailable: false }],
    ["unexpected opaque startup failure", SUPABASE_START_CATEGORIES.UNCLASSIFIED],
  ];

  for (const [log, expected, options = {}] of cases) {
    assert.equal(
      classifySupabaseStartFailure({ log, exitCode: 1, ...options }),
      expected,
      `expected ${expected} for ${log}`,
    );
  }
});

test("turns a long failed start with no containers into an actionable bounded code", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    durationSeconds: 95,
    probeCommand: createProbeCommand(),
  });

  assert.equal(
    classifySupabaseStartFailure({ log: "opaque startup failure", exitCode: 1, evidence }),
    SUPABASE_START_CATEGORIES.START_TIMEOUT,
  );
  assert.ok(evidence.evidenceCodes.includes("REQUIRED_SERVICES_MISSING"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_NETWORK_MISSING"));
  assert.equal(evidence.startPhase, "UNKNOWN");
});

test("classifies a delayed start with no Supabase network or containers as a timeout", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    durationSeconds: 88,
    probeCommand: createProbeCommand(),
  });

  assert.equal(
    classifySupabaseStartFailure({ log: "opaque startup failure", exitCode: 1, evidence }),
    SUPABASE_START_CATEGORIES.START_TIMEOUT,
  );
});

test("never reports success for a non-zero Supabase start result", () => {
  assert.notEqual(
    classifySupabaseStartFailure({ log: "", exitCode: 1 }),
    SUPABASE_START_CATEGORIES.START_SUCCEEDED,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "", exitCode: 0 }),
    SUPABASE_START_CATEGORIES.START_SUCCEEDED,
  );
});

test("emits bounded machine evidence without returning Docker or Supabase output", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure private-token",
    exitCode: 1,
    durationSeconds: 91,
    probeCommand: createProbeCommand({ dockerContainers: { available: true, output: "supabase_db\tpostgres\tExited (1)\t" } }),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.configContract, "valid");
  assert.equal(evidence.dockerContainers, 1);
  assert.deepEqual(evidence.dockerContainerStates, { running: 0, exited: 1, created: 0, restarting: 0, other: 0 });
  assert.ok(evidence.evidenceCodes.includes("START_DURATION_OVER_80_SECONDS"));
  assert.ok(evidence.evidenceCodes.includes("NO_CLASSIFIABLE_START_LOG_SIGNAL"));
  assert.equal(evidence.requiredServicesState, "incomplete");
  assert.equal(evidence.healthState, "failed");
  assert.match(diagnostic, /evidence_codes=/);
  assert.doesNotMatch(diagnostic, /private-token|DockerRootDir|supabase_db/);
});

test("confirms zero containers only when docker ps succeeds", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });

  assert.equal(evidence.dockerContainers, 0);
  assert.deepEqual(evidence.dockerContainerStates, { running: 0, exited: 0, created: 0, restarting: 0, other: 0 });
  assert.ok(evidence.evidenceCodes.includes("NO_SUPABASE_CONTAINERS"));
  assert.ok(!evidence.evidenceCodes.includes("SUPABASE_CONTAINERS_UNOBSERVED"));
});

test("marks container evidence unavailable when docker ps fails", () => {
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    probeCommand: createProbeCommand({ dockerContainers: { available: false, output: "" } }),
  });

  assert.equal(evidence.dockerContainers, null);
  assert.deepEqual(evidence.dockerContainerStates, {
    running: "unavailable",
    exited: "unavailable",
    created: "unavailable",
    restarting: "unavailable",
    other: "unavailable",
  });
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONTAINERS_UNOBSERVED"));
  assert.ok(!evidence.evidenceCodes.includes("NO_SUPABASE_CONTAINERS"));
});

test("does not disclose docker ps stderr when container inspection fails", () => {
  const secret = "docker-secret-jwt";
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure",
    exitCode: 1,
    probeCommand: createProbeCommand({ dockerContainers: { available: false, output: `permission denied token=${secret}` } }),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.dockerContainers, null);
  assert.match(diagnostic, /docker_containers=unavailable/);
  assert.doesNotMatch(diagnostic, new RegExp(secret));
});

test("keeps START_SUCCEEDED explicit and does not emit a failure log signal", () => {
  const evidence = collectBoundedStartEvidence({
    log: "",
    exitCode: 0,
    probeCommand: createProbeCommand({ dockerContainers: { available: true, output: "" } }),
  });

  assert.equal(
    classifySupabaseStartFailure({ log: "", exitCode: 0 }),
    SUPABASE_START_CATEGORIES.START_SUCCEEDED,
  );
  assert.ok(evidence.evidenceCodes.includes("START_SUCCEEDED"));
  assert.ok(!evidence.evidenceCodes.includes("NO_CLASSIFIABLE_START_LOG_SIGNAL"));
});

test("preserves failure classification when supabase start fails", () => {
  const evidence = collectBoundedStartEvidence({
    log: "failed to pull image from registry",
    exitCode: 1,
    probeCommand: createProbeCommand(),
  });

  assert.equal(
    classifySupabaseStartFailure({ log: "failed to pull image from registry", exitCode: 1 }),
    SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE,
  );
  assert.ok(evidence.evidenceCodes.includes("LOG_SIGNAL_IMAGE_UNAVAILABLE"));
  assert.ok(!evidence.evidenceCodes.includes("START_SUCCEEDED"));
});

test("identifies the configured E2E services and port conflict without publishing names or logs", () => {
  const evidence = collectBoundedStartEvidence({
    log: "failed to bind service kong: address already in use",
    exitCode: 1,
    probeCommand: createProbeCommand({
      dockerContainers: {
        available: true,
        output: [
          "supabase_db_web\tpostgres\tUp 10 seconds\t",
          "supabase_kong_web\tkong\tUp 10 seconds\t0.0.0.0:54321->8000/tcp",
          "supabase_rest_web\tpostgrest\tUp 10 seconds\t",
          "supabase_storage_api_web\tstorage\tUp 10 seconds\t",
        ].join("\n"),
      },
      listeningPorts: { available: true, output: "LISTEN 0 128 127.0.0.1:54321 0.0.0.0:*" },
    }),
  });
  const diagnostic = renderSupabaseStartDiagnostic({
    category: classifySupabaseStartFailure({ log: "failed to bind service kong: address already in use", exitCode: 1, evidence }),
    exitCode: 1,
    dockerVersion: evidence.dockerServerVersion,
    supabaseCliVersion: evidence.supabaseCliVersion,
    dockerDaemonAvailable: evidence.dockerDaemonAvailable,
    evidence,
  });

  assert.equal(evidence.requiredServicesState, "ready");
  assert.equal(evidence.portState, "conflict");
  assert.equal(evidence.failureService, "kong");
  assert.match(diagnostic, /category=PORT_CONFLICT/);
  assert.match(diagnostic, /failure_service=kong/);
  assert.match(diagnostic, /port_conflicts=54321/);
  assert.doesNotMatch(diagnostic, /postgres|private|token|docker-secret/);
});

test("classifies explicit probe failures before log heuristics", () => {
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 1, dockerCommandAvailable: false }),
    SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 1, dockerDaemonAvailable: false }),
    SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 1, supabaseCliAvailable: false }),
    SUPABASE_START_CATEGORIES.CLI_CONFIGURATION_INCOMPATIBILITY,
  );
  assert.equal(
    classifySupabaseStartFailure({ log: "opaque", exitCode: 0, dockerCommandAvailable: false }),
    SUPABASE_START_CATEGORIES.START_SUCCEEDED,
  );
});

test("collects unavailable Docker, CLI, status, network and host-port probes as bounded evidence", () => {
  const evidence = collectBoundedStartEvidence({
    log: "DNS resolution failed through proxy",
    exitCode: 1,
    probeCommand: createProbeCommand({
      dockerVersion: { available: false, output: "docker command not found" },
      dockerDaemon: { available: false, output: "Cannot connect to the Docker daemon" },
      dockerInfo: { available: false, output: "DockerRootDir=/sensitive" },
      dockerContainers: { available: false, output: "permission denied" },
      dockerImages: { available: false, output: "manifest unknown" },
      dockerNetworks: { available: false, output: "network secret" },
      listeningPorts: { available: false, output: "ss unavailable" },
      supabaseCli: { available: false, output: "supabase CLI missing" },
      supabaseStatus: { available: false, output: "status secret" },
    }),
  });

  assert.equal(evidence.dockerCommandAvailable, false);
  assert.equal(evidence.dockerDaemonAvailable, false);
  assert.equal(evidence.supabaseCliAvailable, false);
  assert.equal(evidence.dockerContainers, null);
  assert.equal(evidence.dockerImages, null);
  assert.equal(evidence.networkState, "unobserved");
  assert.equal(evidence.portState, "unobserved");
  assert.equal(evidence.requiredServicesState, "unobserved");
  assert.equal(evidence.healthState, "unavailable");
  assert.ok(evidence.evidenceCodes.includes("DOCKER_COMMAND_UNAVAILABLE"));
  assert.ok(evidence.evidenceCodes.includes("DOCKER_DAEMON_UNAVAILABLE"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_CLI_UNAVAILABLE"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONTAINERS_UNOBSERVED"));
  assert.ok(evidence.evidenceCodes.includes("HOST_PORTS_UNOBSERVED"));
  assert.equal(evidence.dockerServerVersion, "unavailable");
  assert.equal(evidence.supabaseCliVersion, "unavailable");
});

test("records missing images, absent networks, invalid versions and invalid configuration", async () => {
  const config = [
    'project_id = "wrong"',
    "major_version = 18",
    'health_timeout = "30s"',
    "[api]", "port = 0",
    "[db]", "port = 54321",
    "[studio]", "port = 54321",
  ].join("\n");

  await withTempConfig(config, async (root) => {
    const evidence = collectBoundedStartEvidence({
      root,
      log: "manifest unknown for image",
      exitCode: 1,
      probeCommand: createProbeCommand({
        dockerVersion: { available: true, output: "Docker version invalid" },
        dockerDaemon: { available: true, output: "server-version=bad" },
        dockerImages: { available: true, output: "" },
        dockerNetworks: { available: true, output: "bridge\tbridge" },
      }),
    });
    assert.equal(evidence.configContract, "invalid");
    assert.deepEqual(evidence.configuredPorts, { api: 0, db: 54321, studio: 54321 });
    assert.equal(evidence.dockerImages, 0);
    assert.equal(evidence.networkState, "missing");
    assert.equal(evidence.dockerServerVersion, "unavailable");
    assert.equal(evidence.portState, "clear");
    assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONFIG_CONTRACT_INVALID"));
    assert.ok(evidence.evidenceCodes.includes("NO_DOCKER_IMAGES"));
    assert.ok(evidence.evidenceCodes.includes("SUPABASE_NETWORK_MISSING"));
    assert.equal(
      classifySupabaseStartFailure({ log: "manifest unknown for image", exitCode: 1, evidence }),
      SUPABASE_START_CATEGORIES.IMAGE_UNAVAILABLE,
    );
  });
});

test("marks a missing TOML configuration unavailable without throwing", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "diagnose-supabase-start-missing-"));
  try {
    const evidence = collectBoundedStartEvidence({ root, log: "opaque", exitCode: 1, probeCommand: createProbeCommand() });
    assert.equal(evidence.configContract, "unavailable");
    assert.deepEqual(evidence.configuredPorts, {});
    assert.ok(evidence.evidenceCodes.includes("SUPABASE_CONFIG_UNAVAILABLE"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("distinguishes partial, unhealthy, ready and unknown container states", () => {
  const output = [
    "supabase_db_web\tpostgres\tUp 10 seconds\t",
    "supabase_kong_web\tkong\tRestarting (1) 2 seconds ago\t",
    "supabase_rest_web\tpostgrest\tExited (1) 1 second ago\t",
    "supabase_storage_api_web\tstorage\tCreated\t",
    "supabase_studio_web\tstudio\tPaused\t",
  ].join("\n");
  const evidence = collectBoundedStartEvidence({
    log: "container db is unhealthy",
    exitCode: 1,
    probeCommand: createProbeCommand({ dockerContainers: { available: true, output } }),
  });

  assert.deepEqual(evidence.dockerContainerStates, { running: 1, exited: 1, created: 1, restarting: 1, other: 1 });
  assert.deepEqual(evidence.dockerContainerServices, { db: "running", kong: "restarting", rest: "exited", storage: "created", studio: "other" });
  assert.equal(evidence.requiredServicesState, "unhealthy");
  assert.equal(evidence.healthState, "failed");
  assert.ok(evidence.requiredServicesMissing.length === 0);
  assert.ok(evidence.evidenceCodes.includes("SERVICE_HEALTH_FAILURE"));
  assert.ok(evidence.evidenceCodes.includes("LOG_SIGNAL_HEALTHCHECK_FAILURE"));
});

test("emits combined proof codes for ready services, clear ports and available status", () => {
  const evidence = collectBoundedStartEvidence({
    log: "startup complete",
    exitCode: 0,
    durationSeconds: 80,
    probeCommand: createProbeCommand({
      dockerContainers: {
        available: true,
        output: [
          "supabase_db_web\tpostgres\tUp 10 seconds\t",
          "supabase_kong_web\tkong\tUp 10 seconds\t",
          "supabase_rest_web\tpostgrest\tUp 10 seconds\t",
          "supabase_storage_api_web\tstorage\tUp 10 seconds\t",
        ].join("\n"),
      },
      dockerNetworks: { available: true, output: "supabase_network\tbridge" },
      listeningPorts: { available: true, output: "LISTEN 0 128 127.0.0.1:1 0.0.0.0:*" },
      supabaseStatus: { available: true, output: '{"DB": "ready"}' },
    }),
  });
  assert.equal(evidence.requiredServicesState, "ready");
  assert.equal(evidence.healthState, "healthy");
  assert.equal(evidence.supabaseStatus, "available");
  assert.equal(evidence.portState, "clear");
  assert.ok(evidence.evidenceCodes.includes("REQUIRED_SERVICES_READY"));
  assert.ok(evidence.evidenceCodes.includes("SERVICES_HEALTHY"));
  assert.ok(evidence.evidenceCodes.includes("SUPABASE_NETWORK_OBSERVED"));
  assert.ok(evidence.evidenceCodes.includes("HOST_PORTS_CLEAR"));
  assert.ok(evidence.evidenceCodes.includes("START_SUCCEEDED"));
  assert.ok(evidence.evidenceCodes.includes("START_PHASE_UNOBSERVED"));
  assert.ok(!evidence.evidenceCodes.includes("NONZERO_START_EXIT"));
});

test("renders all evidence fields while withholding raw logs and sensitive container names", () => {
  const evidence = {
    schemaVersion: 2,
    evidenceCodes: ["CODE_A", "CODE_B"],
    startPhase: "UNKNOWN",
    failureService: "db",
    dockerContainers: null,
    dockerContainerStates: { running: "unavailable", exited: "unavailable", created: "unavailable", restarting: "unavailable", other: "unavailable" },
    dockerImages: null,
    networkState: "unobserved",
    portState: "unobserved",
    portConflicts: [],
    requiredServicesState: "unobserved",
    requiredServicesMissing: ["db", "kong"],
    healthState: "unavailable",
    dockerCpuCount: null,
    dockerMemoryBytes: null,
    supabaseStatus: "unavailable",
    configContract: "unavailable",
    configuredPorts: {},
    durationSeconds: null,
  };
  const diagnostic = renderSupabaseStartDiagnostic({
    category: SUPABASE_START_CATEGORIES.UNCLASSIFIED,
    exitCode: 1,
    dockerVersion: "Docker version 28.0.4 DockerRootDir=/secret",
    supabaseCliVersion: "2.117.0 token=secret",
    dockerDaemonAvailable: false,
    evidence,
  });
  assert.match(diagnostic, /result=failure exit_code=1/);
  assert.match(diagnostic, /docker_container_states=running:unavailable/);
  assert.match(diagnostic, /required_services_missing=db,kong/);
  assert.doesNotMatch(diagnostic, /DockerRootDir|\/secret|token=secret|supabase_db_web/);
});

test("the workflow keeps startup failure blocking and never prints the raw log", () => {
  assert.match(workflow, /set \+e[\s\S]*?start_exit_code=\$\?/);
  assert.match(workflow, /node scripts\/ci\/diagnose-supabase-start\.mjs/);
  assert.match(workflow, /--duration-seconds="\$start_duration_seconds"/);
  assert.match(workflow, /supabase start --workdir apps\/web --yes --output-format json/);
  assert.doesNotMatch(workflow, /--ignore-health-check/);
  assert.match(workflow, /if \[ "\$start_exit_code" -ne 0 \]; then\s+exit "\$start_exit_code"/);
  assert.match(workflow, /trap 'rm -f "\$start_log"' EXIT/);
  assert.doesNotMatch(workflow, /cat\s+[^\n]*supabase-start\.log/);
});
