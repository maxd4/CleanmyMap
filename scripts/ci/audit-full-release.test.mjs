import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evaluateGithubRelease, fetchGithubReleaseEvidence } from "./audit-github-release.mjs";
import {
  evaluateSupabaseRelease,
  isValidProjectRef,
  parseArgs,
  resolveProjectRef,
} from "./audit-supabase-release.mjs";

const validProjectRef = "abcdefghijklmnopqrst";
const serviceRoleEnvKey = "SUPABASE_SERVICE_ROLE_KEY";
const syntheticServiceRoleKey = ["synthetic", "service", "role", "key"].join("-");

function captureEnvironmentValue(name) {
  return {
    present: Object.prototype.hasOwnProperty.call(process.env, name),
    value: process.env[name],
  };
}

async function withSyntheticEnvironmentValue(name, value, callback) {
  const previous = captureEnvironmentValue(name);
  try {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
    return await callback();
  } finally {
    if (previous.present) {
      process.env[name] = previous.value;
    } else {
      delete process.env[name];
    }
  }
}

const githubSha = "a".repeat(40);
const historyRules = {
  target: "branch",
  enforcement: "active",
  conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
  rules: [{ type: "deletion" }, { type: "non_fast_forward" }],
  bypass_actors: [],
};
const updateRule = {
  target: "branch",
  enforcement: "active",
  conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
  rules: [{ type: "update" }],
  bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5 }],
};
let nextRunId = 1;
const workflowRun = (workflowPath, extra = {}) => ({
  id: nextRunId++,
  path: workflowPath,
  head_sha: githubSha,
  head_branch: "main",
  event: "push",
  status: "completed",
  conclusion: "success",
  run_number: 1,
  ...extra,
});
const ciRun = workflowRun(".github/workflows/ci.yml");
const codeqlRun = (extra = {}) => workflowRun(".github/workflows/codeql.yml", extra);
const githubBaseline = {
  sha: githubSha,
  dependabot: [],
  codeScanning: [],
  secretScanning: [],
  rulesets: [historyRules, updateRule],
  runs: [ciRun, codeqlRun()],
};

for (const [label, overrides, expected] of [
  ["complete", {}, "PASS"],
  ["unrelated run", { runs: [workflowRun(".github/workflows/supabase-backup.yml")] }, "NOT_RUN"],
  ["empty runs", { runs: [] }, "NOT_RUN"],
  ["malformed alerts", { dependabot: { unexpected: true } }, "BLOCKED_ACCESS"],
  ["open alerts", { dependabot: [{ state: "open" }] }, "FAIL"],
  ["empty rulesets", { rulesets: [] }, "FAIL"],
  ["history bypass", { rulesets: [{ ...historyRules, bypass_actors: [{}] }, updateRule] }, "FAIL"],
  ["wrong candidate", { runs: [{ ...ciRun, head_sha: "b".repeat(40) }] }, "BLOCKED_ACCESS"],
  ["skipped CodeQL", { runs: [ciRun, codeqlRun({ conclusion: "skipped" })] }, "NOT_RUN"],
  ["pending", { runs: [ciRun, codeqlRun({ status: "queued", conclusion: null })] }, "NOT_RUN"],
  ["failed integration", { runs: [...githubBaseline.runs, workflowRun(".github/workflows/supabase-sql-proof.yml", { conclusion: "failure" })] }, "FAIL"],
  ["superseded run on same workflow+SHA+branch+event", { runs: [ciRun, codeqlRun({ conclusion: "failure", run_number: 1 }), codeqlRun({ conclusion: "success", run_number: 2 })] }, "PASS"],
  ["wrong branch", { runs: [ciRun, codeqlRun({ head_branch: "other" })] }, "NOT_RUN"],
  ["unknown conclusion", { runs: [ciRun, codeqlRun({ conclusion: "unexpected" })] }, "BLOCKED_ACCESS"],
  ["no rule details", { rulesets: [{ id: 1 }] }, "BLOCKED_ACCESS"],
]) {
  test(`GitHub release audit: ${label}`, () => {
    assert.equal(evaluateGithubRelease({ ...githubBaseline, ...overrides }).status, expected);
  });
}

test("GitHub release transport paginates rulesets/runs and fails closed on errors or incomplete pagination", () => {
  const okResponses = new Map([
    [`api repos/maxd4/CleanmyMap`, { status: 0, stdout: JSON.stringify({ full_name: "maxd4/CleanmyMap", default_branch: "main" }) }],
    [`api --paginate --slurp repos/maxd4/CleanmyMap/dependabot/alerts?state=open&per_page=100`, { status: 0, stdout: "[[]]" }],
    [`api --paginate --slurp repos/maxd4/CleanmyMap/code-scanning/alerts?state=open&per_page=100`, { status: 0, stdout: "[[]]" }],
    [`api --paginate --slurp repos/maxd4/CleanmyMap/secret-scanning/alerts?state=open&per_page=100`, { status: 0, stdout: "[[]]" }],
    [`api --paginate --slurp repos/maxd4/CleanmyMap/rulesets?per_page=100`, { status: 0, stdout: JSON.stringify([[{ id: 1 }, { id: 2 }]]) }],
    [`api repos/maxd4/CleanmyMap/rulesets/1`, { status: 0, stdout: JSON.stringify(historyRules) }],
    [`api repos/maxd4/CleanmyMap/rulesets/2`, { status: 0, stdout: JSON.stringify(updateRule) }],
    [`api --paginate --slurp repos/maxd4/CleanmyMap/actions/runs?head_sha=${githubSha}&per_page=100`, { status: 0, stdout: JSON.stringify([{ total_count: 2, workflow_runs: [ciRun, codeqlRun()] }]) }],
  ]);
  const evidence = fetchGithubReleaseEvidence({
    repo: "maxd4/CleanmyMap",
    sha: githubSha,
    runner: (args) => okResponses.get(args.join(" ")) ?? { status: 1, stdout: "" },
  });
  assert.equal(evaluateGithubRelease({ ...evidence, sha: githubSha }).status, "PASS");

  assert.throws(
    () => fetchGithubReleaseEvidence({ repo: "maxd4/CleanmyMap", sha: githubSha, runner: () => ({ status: 1, stdout: "" }) }),
    /unavailable/,
  );
  assert.throws(
    () => fetchGithubReleaseEvidence({
      repo: "maxd4/CleanmyMap",
      sha: githubSha,
      runner: (args) => args.join(" ").includes("actions/runs") ? { status: 0, stdout: "not-json" } : okResponses.get(args.join(" ")),
    }),
    /invalid JSON/,
  );
  assert.throws(
    () => fetchGithubReleaseEvidence({
      repo: "maxd4/CleanmyMap",
      sha: githubSha,
      runner: (args) => {
        const key = args.join(" ");
        if (key.includes("actions/runs")) {
          return { status: 0, stdout: JSON.stringify([{ total_count: 3, workflow_runs: [ciRun] }]) };
        }
        return okResponses.get(key);
      },
    }),
    /Incomplete or inconsistent workflow runs pagination/,
  );

  for (const [label, runPayload, pattern] of [
    ["empty pages", [], /did not return any page/],
    ["missing total_count", [{ workflow_runs: [ciRun] }], /missing valid total_count/],
    ["non-numeric total_count", [{ total_count: "2", workflow_runs: [ciRun] }], /missing valid total_count/],
    ["inconsistent total_count", [{ total_count: 2, workflow_runs: [ciRun] }, { total_count: 3, workflow_runs: [codeqlRun()] }], /Inconsistent workflow runs total_count/],
    ["duplicate run id", [{ total_count: 2, workflow_runs: [ciRun, { ...ciRun }] }], /Duplicate GitHub workflow run id/],
    ["missing run id", [{ total_count: 1, workflow_runs: [{ ...ciRun, id: undefined }] }], /missing valid id/],
  ]) {
    assert.throws(
      () => fetchGithubReleaseEvidence({
        repo: "maxd4/CleanmyMap",
        sha: githubSha,
        runner: (args) => {
          const key = args.join(" ");
          if (key.includes("actions/runs")) {
            return { status: 0, stdout: JSON.stringify(runPayload) };
          }
          return okResponses.get(key);
        },
      }),
      pattern,
      label,
    );
  }
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
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(envPath, `SUPABASE_PROJECT_REF=${validProjectRef}\nSUPABASE_SERVICE_ROLE_KEY=${syntheticServiceRoleKey}\n`, "utf8");

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

  for (const [label, initialValue] of [
    ["absent", undefined],
    ["present", syntheticServiceRoleKey],
  ]) {
    await t.test(`preserves the service-role environment state when initially ${label}`, async () => {
      const outerState = captureEnvironmentValue(serviceRoleEnvKey);
      await withSyntheticEnvironmentValue(serviceRoleEnvKey, initialValue, () => {
        const initialState = captureEnvironmentValue(serviceRoleEnvKey);
        const resolvedProjectRef = resolveProjectRef({ argv: [], env: {}, envPath });
        const parsed = parseArgs([], { env: {}, envPath });
        const finalState = captureEnvironmentValue(serviceRoleEnvKey);

        assert.equal(resolvedProjectRef, validProjectRef);
        assert.equal(parsed.projectRef, validProjectRef);
        assert.equal(parsed.projectRef.includes(syntheticServiceRoleKey), false);
        assert.deepEqual(finalState, initialState);
      });
      assert.deepEqual(captureEnvironmentValue(serviceRoleEnvKey), outerState);
    });
  }
});
