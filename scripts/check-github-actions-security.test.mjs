import assert from "node:assert/strict";

import { auditWorkflowContent } from "./check-github-actions-security.mjs";

const pinned = "actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd";

assert.deepEqual(auditWorkflowContent(`permissions: {}\nsteps:\n  - uses: ${pinned}\n`), []);

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
