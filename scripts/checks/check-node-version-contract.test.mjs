import assert from "node:assert/strict";
import test from "node:test";

import { validateNodeVersionContract } from "./check-node-version-contract.mjs";

const validWorkflow = [
  "env:",
  "  NODE_VERSION_FILE: apps/web/.nvmrc",
  "jobs:",
  "  web:",
  "    steps:",
  "      - uses: actions/setup-node@" + "a".repeat(40),
  "        with:",
  "          node-version-file: ${{ env.NODE_VERSION_FILE }}",
  "  mobile:",
  "    steps:",
  "      - uses: actions/setup-node@" + "b".repeat(40),
  "        with:",
  "          node-version-file: ${{ env.NODE_VERSION_FILE }}",
  "",
].join("\n");

const validLockfile = {
  packages: {
    "node_modules/example": { engines: { node: "^22.13.0 || ^24.3.0" } },
  },
};

test("accepts the canonical Node 24 contract and supported runtime", () => {
  const result = validateNodeVersionContract({
    workflowContent: validWorkflow,
    actualNodeVersion: "24.14.0",
    contractContent: "24.x\n",
    lockfile: validLockfile,
    webPackage: {},
  });

  assert.deepEqual(result.issues, []);
});

test("rejects a divergent CI version and a runtime below ^24.3.0", () => {
  const result = validateNodeVersionContract({
    workflowContent: validWorkflow
      .replace("apps/web/.nvmrc", "24.x")
      .replace(/node-version-file:/g, "node-version:"),
    actualNodeVersion: "24.2.0",
    contractContent: "24.x\n",
    lockfile: validLockfile,
    webPackage: {},
  });

  assert.equal(result.issues.length, 3);
  assert.match(result.issues.join("\n"), /centralize Node/);
  assert.match(result.issues.join("\n"), /setup-node/);
  assert.match(result.issues.join("\n"), /satisfy \^24\.3\.0/);
});
