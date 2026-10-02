import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditWorkflowContent } from "./check-github-actions-security.mjs";

const pinned = "actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd";

assert.deepEqual(
  auditWorkflowContent(`permissions: {}\nsteps:\n  - uses: ${pinned}\n    with:\n      persist-credentials: false\n`),
  [],
);

assert.equal(
  auditWorkflowContent("name: missing-permissions\njobs:\n  test:\n    runs-on: ubuntu-latest\n")[0].includes("explicit top-level permissions"),
  true,
);

assert.equal(
  auditWorkflowContent(`permissions: {}\nsteps:\n  - uses: ${pinned}\n    with:\n      fetch-depth: 0\n`)[0].includes("persist-credentials: false"),
  true,
);

assert.equal(
  auditWorkflowContent("permissions: {}\non:\n  pull_request_target:\n    types: [opened]\n").length,
  1,
);

assert.equal(
  auditWorkflowContent("permissions: {}\nsteps:\n  - uses: actions/checkout@v4\n")[0].includes("full commit SHA"),
  true,
);

assert.equal(
  auditWorkflowContent("permissions: write-all\n")[0].includes("broad workflow permissions"),
  true,
);

assert.equal(
  auditWorkflowContent("permissions: {}\nenv:\n  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n")[0].includes("server secret name"),
  true,
);

assert.equal(
  auditWorkflowContent("permissions: {}\n- uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02\n  with:\n    path: artifacts/playwright\n", ".github/workflows/e2e-supabase.yml").some((issue) => issue.includes("raw Playwright")),
  true,
);

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ciWorkflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "ci.yml"), "utf8");
const e2eWorkflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "e2e-supabase.yml"), "utf8");
const codeqlWorkflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "codeql.yml"), "utf8");
const pinnedCiCheckoutSha = ["3d3c42e5aac5ba805825", "da76410c181273ba90b1"].join("");

assert.doesNotMatch(e2eWorkflow, /path:\s*artifacts\/playwright\b/);
assert.match(e2eWorkflow, /stage-public-e2e-artifact\.mjs/);
assert.match(e2eWorkflow, /check-public-e2e-artifact\.mjs/);
assert.match(e2eWorkflow, /path:\s*artifacts\/ci-public-evidence\b/);

const firstPartyCodeqlJob = codeqlWorkflow.match(/  analyze-first-party-javascript:[\s\S]*?(?=\n  [a-z-]+:|\s*$)/)?.[0] ?? "";
const vendoredCodeqlJob = codeqlWorkflow.match(/  analyze-vendored-javascript:[\s\S]*?(?=\n  [a-z-]+:|\s*$)/)?.[0] ?? "";
const nonJavaScriptCodeqlJob = codeqlWorkflow.match(/  analyze:[\s\S]*?(?=\n  [a-z-]+:|\s*$)/)?.[0] ?? "";

assert.match(firstPartyCodeqlJob, /languages:\s*javascript-typescript/);
assert.match(firstPartyCodeqlJob, /queries:\s*security-extended,security-and-quality/);
assert.match(firstPartyCodeqlJob, /paths-ignore:\s*\n\s+- apps\/mobile\/vendor\/\*\*/);
assert.match(firstPartyCodeqlJob, /category:\s*"\/language:javascript-typescript\/first-party"/);
assert.match(vendoredCodeqlJob, /languages:\s*javascript-typescript/);
assert.match(vendoredCodeqlJob, /queries:\s*security-extended\s*$/m);
assert.doesNotMatch(vendoredCodeqlJob, /security-and-quality/);
assert.match(vendoredCodeqlJob, /paths:\s*\n\s+- apps\/mobile\/vendor\/\*\*/);
assert.match(vendoredCodeqlJob, /category:\s*"\/language:javascript-typescript\/vendor"/);
assert.match(nonJavaScriptCodeqlJob, /language:\s*\["python",\s*"actions"\]/);
assert.match(nonJavaScriptCodeqlJob, /queries:\s*security-extended,security-and-quality/);
assert.doesNotMatch(codeqlWorkflow, /^paths-ignore:/m);
assert.doesNotMatch(codeqlWorkflow, /^paths:/m);
assert.match(codeqlWorkflow, /runs-on:\s*"ubuntu-24\.04"/);
assert.deepEqual(auditWorkflowContent(codeqlWorkflow, ".github/workflows/codeql.yml"), []);

assert.match(ciWorkflow, /jobs:\n  scope:/);
const secretAuditJob = ciWorkflow.match(/  secret-audit:[\s\S]*?\n\n  dependency-audit:/)?.[0] ?? "";
assert.match(secretAuditJob, /runs-on: ubuntu-latest/);
assert.doesNotMatch(secretAuditJob, /needs:\s*scope|\n\s+if:/);
assert.match(secretAuditJob, /permissions:\n\s+contents: read/);
assert.match(secretAuditJob, new RegExp(`actions/checkout@${pinnedCiCheckoutSha}`));
assert.match(secretAuditJob, /ref: \$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
assert.match(secretAuditJob, /persist-credentials: false/);
assert.match(secretAuditJob, /node-version-file: \$\{\{ env\.NODE_VERSION_FILE \}\}/);
assert.match(secretAuditJob, /git rev-parse HEAD/);
assert.match(secretAuditJob, /npm run security:secrets -- --ref=/);
assert.doesNotMatch(secretAuditJob, /npm ci/);
assert.equal((ciWorkflow.match(/security:secrets/g) ?? []).length, 1);
assert.doesNotMatch(ciWorkflow.match(/  web-governance:[\s\S]*?\n\n  web-static:/)?.[0] ?? "", /security:secrets/);
assert.doesNotMatch(ciWorkflow.match(/  mobile-validation:[\s\S]*?(?=\n  [a-z-]+:|\s*$)/)?.[0] ?? "", /security:secrets/);
// A Python-only maintenance change cannot skip this job because it has no scope dependency or condition.
assert.match(secretAuditJob, /secret audit/i);
assert.match(ciWorkflow, /web_code_relevant:/);
assert.match(ciWorkflow, /mobile_code_relevant:/);
assert.match(ciWorkflow, /web-governance:\n    needs: scope/);
for (const job of [
  "web-static",
  "web-quality",
  "web-tests",
  "web-coverage",
  "web-vercel-audit",
  "web-build",
]) {
  assert.match(ciWorkflow, new RegExp(`${job}:\\n    needs: scope`));
}
assert.doesNotMatch(ciWorkflow, /web-validation:/);
assert.match(ciWorkflow, /Install Node dependencies/);
assert.match(ciWorkflow, /TypeScript typecheck/);
assert.match(ciWorkflow, /Web lint/);
assert.match(ciWorkflow, /Web Vitest tests/);
assert.match(ciWorkflow, /Web production build/);
assert.match(ciWorkflow, /mobile-validation:\n    needs: scope/);
assert.match(ciWorkflow, /dependency-review:\n    needs: scope\n    if: github\.event_name == 'pull_request'/);
assert.match(ciWorkflow, /uses: actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/);
assert.match(ciWorkflow, /fail-on-severity: high/);
const dependencyReviewJob = ciWorkflow.match(/  dependency-review:[\s\S]*?\n\n  web-governance:/)?.[0] ?? "";
assert.doesNotMatch(dependencyReviewJob, /secrets\./);
assert.doesNotMatch(dependencyReviewJob, /actions\/checkout@/);
assert.equal((ciWorkflow.match(/persist-credentials: false/g) ?? []).length, 11);
assert.equal((ciWorkflow.match(/node-version-file: \$\{\{ env\.NODE_VERSION_FILE \}\}/g) ?? []).length, 10);
assert.equal((ciWorkflow.match(/check-node-version-contract\.mjs/g) ?? []).length, 8);
assert.doesNotMatch(ciWorkflow, /check:agent-skills/);
assert.match(ciWorkflow, /check:doc-governance/);
assert.match(ciWorkflow, /Mobile security tests/);
assert.match(ciWorkflow, /Mobile Vitest tests/);
assert.match(ciWorkflow, /Mobile Vitest coverage ratchet/);
assert.match(ciWorkflow, /Mobile lint/);
assert.match(ciWorkflow, /Architectural Semgrep \(mobile-only\)/);
assert.match(ciWorkflow, /web_code_relevant != 'true'/);
