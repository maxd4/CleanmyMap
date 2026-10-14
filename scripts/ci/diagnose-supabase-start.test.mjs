import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifySupabaseStartFailure,
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

test("the workflow keeps startup failure blocking and never prints the raw log", () => {
  assert.match(workflow, /set \+e[\s\S]*?start_exit_code=\$\?/);
  assert.match(workflow, /node scripts\/ci\/diagnose-supabase-start\.mjs/);
  assert.match(workflow, /if \[ "\$start_exit_code" -ne 0 \]; then\s+exit "\$start_exit_code"/);
  assert.match(workflow, /trap 'rm -f "\$start_log"' EXIT/);
  assert.doesNotMatch(workflow, /cat\s+[^\n]*supabase-start\.log/);
});
