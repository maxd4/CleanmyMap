import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateGithubRelease } from "./audit-github-release.mjs";
import { evaluateSupabaseRelease } from "./audit-supabase-release.mjs";

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
