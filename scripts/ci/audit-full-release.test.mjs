import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evaluateGithubRelease } from "./audit-github-release.mjs";
import {
  evaluateSupabaseRelease,
  isValidProjectRef,
  parseArgs,
  resolveProjectRef,
} from "./audit-supabase-release.mjs";

const validProjectRef = "abcdefghijklmnopqrst";

test("GitHub release audit fails on open alerts and accepts only completed SHA evidence", () => {
  const blocked = evaluateGithubRelease({
    dependabot: [{ state: "open" }],
    codeScanning: [],
    secretScanning: [],
    runs: [{ status: "completed", conclusion: "success" }],
    rulesets: [],
  });
  assert.equal(blocked.status, "FAIL");
  assert.equal(blocked.openAlerts, 1);

  const ready = evaluateGithubRelease({
    dependabot: [],
    codeScanning: [],
    secretScanning: [],
    runs: [{ status: "completed", conclusion: "success" }],
    rulesets: [],
  });
  assert.equal(ready.status, "PASS");
});

test("GitHub release audit does not infer success without a workflow run", () => {
  const result = evaluateGithubRelease({
    dependabot: [],
    codeScanning: [],
    secretScanning: [],
    runs: [],
    rulesets: [],
  });
  assert.equal(result.status, "NOT_RUN");
});

test("Supabase release audit requires an explicitly identified project and health/log evidence", () => {
  const blocked = evaluateSupabaseRelease({
    projectRef: "prod-ref",
    projects: [{ id: "other-ref" }],
    commands: [],
    healthLogs: { status: "PASS" },
  });
  assert.equal(blocked.status, "BLOCKED_ACCESS");

  const ready = evaluateSupabaseRelease({
    projectRef: "prod-ref",
    projects: [{ id: "prod-ref" }],
    commands: [{ status: 0 }, { status: 0 }],
    healthLogs: { status: "PASS" },
  });
  assert.equal(ready.status, "PASS");

  const incomplete = evaluateSupabaseRelease({
    projectRef: "prod-ref",
    projects: [{ id: "prod-ref" }],
    commands: [{ status: 0 }],
    healthLogs: { status: "BLOCKED_ACCESS" },
  });
  assert.equal(incomplete.status, "BLOCKED_ACCESS");
});

test("Supabase project reference resolution uses explicit, process, then local configuration", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "cleanmymap-supabase-audit-"));
  const envPath = join(directory, ".env.local");
  const secret = "local-secret-must-not-be-loaded";

  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(envPath, `SUPABASE_PROJECT_REF=${validProjectRef}\nSUPABASE_SERVICE_ROLE_KEY=${secret}\n`, "utf8");

  assert.equal(resolveProjectRef({
    argv: ["--project-ref", "zyxwvutsrqponmlkjihg"],
    env: { SUPABASE_PROJECT_REF: "mnopqrstabcdefghijkl" },
    envPath,
  }), "zyxwvutsrqponmlkjihg");
  assert.equal(resolveProjectRef({
    argv: [],
    env: { SUPABASE_PROJECT_REF: "mnopqrstabcdefghijkl" },
    envPath,
  }), "mnopqrstabcdefghijkl");
  assert.equal(resolveProjectRef({ argv: [], env: {}, envPath }), validProjectRef);
  assert.equal(resolveProjectRef({ argv: [], env: { CI: "true" }, envPath }), "");

  assert.equal(resolveProjectRef({
    argv: ["--project-ref=not-a-project-ref"],
    env: { SUPABASE_PROJECT_REF: "mnopqrstabcdefghijkl" },
    envPath,
  }), "");
  assert.equal(resolveProjectRef({
    argv: [],
    env: { SUPABASE_PROJECT_REF: "not-a-project-ref" },
    envPath,
  }), "");
  assert.equal(resolveProjectRef({ argv: [], env: {}, envPath: join(directory, "missing.env") }), "");
  assert.equal(isValidProjectRef("abcdefghijklmnopqrst"), true);
  assert.equal(isValidProjectRef("prod-ref"), false);

  const parsed = parseArgs([], { env: {}, envPath });
  assert.equal(parsed.projectRef, validProjectRef);
  assert.equal(parsed.projectRef.includes(secret), false);
  assert.equal(Object.prototype.hasOwnProperty.call(process.env, "SUPABASE_SERVICE_ROLE_KEY"), false);
});
