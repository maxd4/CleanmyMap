import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGithubRelease } from "./github-release-evaluation.mjs";

const sha = "a".repeat(40);
const historyRules = {
  target: "branch", enforcement: "active",
  conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
  rules: [{ type: "deletion" }, { type: "non_fast_forward" }],
  bypass_actors: [],
};
const updateRule = {
  target: "branch", enforcement: "active",
  conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
  rules: [{ type: "update" }],
  bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5 }],
};
const run = (path, extra = {}) => ({
  path, head_sha: sha, head_branch: "main", event: "push",
  status: "completed", conclusion: "success", ...extra,
});
const ci = run(".github/workflows/ci.yml");
const codeql = (extra = {}) => run(".github/workflows/codeql.yml", extra);
const baseline = {
  sha, dependabot: [], codeScanning: [], secretScanning: [],
  rulesets: [historyRules, updateRule], runs: [ci, codeql()],
};
const cases = [
  ["complete", {}, "PASS"],
  ["unrelated run", { runs: [run(".github/workflows/supabase-backup.yml")] }, "NOT_RUN"],
  ["empty runs", { runs: [] }, "NOT_RUN"],
  ["malformed alerts", { dependabot: { unexpected: true } }, "BLOCKED_ACCESS"],
  ["open alerts", { dependabot: [{ state: "open" }] }, "FAIL"],
  ["empty rulesets", { rulesets: [] }, "FAIL"],
  ["history bypass", { rulesets: [{ ...historyRules, bypass_actors: [{}] }, updateRule] }, "FAIL"],
  ["wrong candidate", { runs: [{ ...ci, head_sha: "b".repeat(40) }] }, "BLOCKED_ACCESS"],
  ["skipped CodeQL", { runs: [ci, codeql({ conclusion: "skipped" })] }, "NOT_RUN"],
  ["pending", { runs: [ci, codeql({ status: "queued", conclusion: null })] }, "NOT_RUN"],
  ["failed integration", { runs: [...baseline.runs, run(".github/workflows/supabase-sql-proof.yml", { conclusion: "failure" })] }, "FAIL"],
  ["wrong branch", { runs: [ci, codeql({ head_branch: "other" })] }, "NOT_RUN"],
  ["unknown conclusion", { runs: [ci, codeql({ conclusion: "unexpected" })] }, "BLOCKED_ACCESS"],
  ["no rule details", { rulesets: [{ id: 1 }] }, "BLOCKED_ACCESS"],
];
for (const [label, overrides, expected] of cases) {
  test(label, () => assert.equal(evaluateGithubRelease({ ...baseline, ...overrides }).status, expected));
}
