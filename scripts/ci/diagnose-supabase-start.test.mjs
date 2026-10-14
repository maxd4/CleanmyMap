import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifySupabaseStartFailure,
  collectBoundedStartEvidence,
  renderSupabaseStartDiagnostic,
  SUPABASE_START_CATEGORIES,
} from "./diagnose-supabase-start.mjs";

const workflow = readFileSync(resolve(".github", "workflows", "e2e-supabase.yml"), "utf8");

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

test("classifies Docker, port, healthcheck, resources and CLI failures", () => {
  const cases = [
    ["Cannot connect to the Docker daemon", SUPABASE_START_CATEGORIES.DOCKER_UNAVAILABLE],
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
  const probeOutputs = new Map([
    ["docker --version", { available: true, output: "Docker version 28.0.4, build private-token" }],
    ["docker info --format {{.ServerVersion}}", { available: true, output: "28.0.4" }],
    ["docker info --format {{json .}}", { available: true, output: JSON.stringify({ NCPU: 4, MemTotal: 8_000_000_000, DockerRootDir: "/private/path" }) }],
    ["docker ps -a --filter name=supabase_ --format {{.Names}}\t{{.Status}}", { available: true, output: "supabase_db\tExited (1)" }],
    ["npx --no-install supabase --version", { available: true, output: "2.117.0" }],
    ["npx --no-install supabase status --workdir apps/web --output json", { available: false, output: "status details private-token" }],
  ]);
  const evidence = collectBoundedStartEvidence({
    log: "opaque startup failure private-token",
    exitCode: 1,
    durationSeconds: 91,
    probeCommand: (command, args) => probeOutputs.get([command, ...args].join(" ")) ?? { available: false, output: "unexpected" },
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
  assert.match(diagnostic, /evidence_codes=/);
  assert.doesNotMatch(diagnostic, /private-token|DockerRootDir|supabase_db/);
});

test("the workflow keeps startup failure blocking and never prints the raw log", () => {
  assert.match(workflow, /set \+e[\s\S]*?start_exit_code=\$\?/);
  assert.match(workflow, /node scripts\/ci\/diagnose-supabase-start\.mjs/);
  assert.match(workflow, /--duration-seconds="\$start_duration_seconds"/);
  assert.match(workflow, /if \[ "\$start_exit_code" -ne 0 \]; then\s+exit "\$start_exit_code"/);
  assert.match(workflow, /trap 'rm -f "\$start_log"' EXIT/);
  assert.doesNotMatch(workflow, /cat\s+[^\n]*supabase-start\.log/);
});
