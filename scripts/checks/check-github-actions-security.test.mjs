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

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ciWorkflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "ci.yml"), "utf8");

assert.match(ciWorkflow, /jobs:\n  scope:/);
assert.match(ciWorkflow, /web_code_relevant:/);
assert.match(ciWorkflow, /mobile_code_relevant:/);
assert.match(ciWorkflow, /web-checks:\n    needs: scope/);
assert.match(ciWorkflow, /mobile-validation:\n    needs: scope/);
assert.equal((ciWorkflow.match(/persist-credentials: false/g) ?? []).length, 3);
assert.equal((ciWorkflow.match(/node-version-file: \$\{\{ env\.NODE_VERSION_FILE \}\}/g) ?? []).length, 2);
assert.equal((ciWorkflow.match(/check-node-version-contract\.mjs/g) ?? []).length, 2);
assert.doesNotMatch(ciWorkflow, /check:agent-skills/);
assert.match(ciWorkflow, /check:doc-governance/);
assert.match(ciWorkflow, /Mobile security tests/);
