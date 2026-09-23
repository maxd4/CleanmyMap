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
  auditWorkflowContent(`steps:\n  - uses: ${pinned}\n    with:\n      fetch-depth: 0\n`)[0].includes("persist-credentials: false"),
  true,
);

assert.equal(
  auditWorkflowContent("on:\n  pull_request_target:\n    types: [opened]\n").length,
  1,
);

assert.equal(
  auditWorkflowContent("steps:\n  - uses: actions/checkout@v4\n")[0].includes("full commit SHA"),
  true,
);

assert.equal(
  auditWorkflowContent("permissions: write-all\n")[0].includes("broad workflow permissions"),
  true,
);

assert.equal(
  auditWorkflowContent("env:\n  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n")[0].includes("server secret name"),
  true,
);

assert.equal(
  auditWorkflowContent("- uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02\n  with:\n    path: artifacts/playwright\n", ".github/workflows/e2e-supabase.yml")[0].includes("raw Playwright"),
  true,
);

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ciWorkflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "ci.yml"), "utf8");
const e2eWorkflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "e2e-supabase.yml"), "utf8");
const codeqlWorkflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "codeql.yml"), "utf8");

assert.doesNotMatch(e2eWorkflow, /path:\s*artifacts\/playwright\b/);
assert.match(e2eWorkflow, /stage-public-e2e-artifact\.mjs/);
assert.match(e2eWorkflow, /check-public-e2e-artifact\.mjs/);
assert.match(e2eWorkflow, /path:\s*artifacts\/ci-public-evidence\b/);

assert.match(codeqlWorkflow, /language:\s*\["javascript-typescript",\s*"python",\s*"actions"\]/);
assert.match(codeqlWorkflow, /queries:\s*security-extended,security-and-quality/);
assert.match(codeqlWorkflow, /if:\s*matrix\.language\s*==\s*'javascript-typescript'/);
assert.deepEqual(auditWorkflowContent(codeqlWorkflow, ".github/workflows/codeql.yml"), []);

assert.match(ciWorkflow, /jobs:\n  scope:/);
assert.match(ciWorkflow, /web_code_relevant:/);
assert.match(ciWorkflow, /mobile_code_relevant:/);
assert.match(ciWorkflow, /web-governance:\n    needs: scope/);
assert.match(ciWorkflow, /web-validation:\n    needs: scope/);
assert.match(ciWorkflow, /Install Node dependencies/);
assert.match(ciWorkflow, /TypeScript typecheck/);
assert.match(ciWorkflow, /Web lint/);
assert.match(ciWorkflow, /Web Vitest tests/);
assert.match(ciWorkflow, /Web production build/);
assert.match(ciWorkflow, /mobile-validation:\n    needs: scope/);
assert.equal((ciWorkflow.match(/persist-credentials: false/g) ?? []).length, 4);
assert.equal((ciWorkflow.match(/node-version-file: \$\{\{ env\.NODE_VERSION_FILE \}\}/g) ?? []).length, 3);
assert.equal((ciWorkflow.match(/check-node-version-contract\.mjs/g) ?? []).length, 3);
assert.doesNotMatch(ciWorkflow, /check:agent-skills/);
assert.match(ciWorkflow, /check:doc-governance/);
assert.match(ciWorkflow, /Mobile security tests/);
