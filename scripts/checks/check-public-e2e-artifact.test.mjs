import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

import {
  PUBLIC_E2E_ARTIFACT_ROOT,
  validatePublicE2EArtifact,
} from "./check-public-e2e-artifact.mjs";

const syntheticJwt = ["eyJ" + "a".repeat(11), "b".repeat(11), "c".repeat(11)].join(".");
const syntheticClerkKey = ["pk_test_", "a".repeat(24)].join("");

function staging() {
  const root = mkdtempSync(join(resolve(PUBLIC_E2E_ARTIFACT_ROOT), "test-"));
  mkdirSync(join(root, "evidence"), { recursive: true });
  return root;
}

function withStaging(callback) {
  const root = staging();
  try {
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts synthetic evidence JSON and an explicitly allowed screenshot", () => {
  withStaging((root) => {
    writeFileSync(join(root, "evidence", "summary.json"), '{"status":"passed"}\n');
    mkdirSync(join(root, "screenshots"));
    writeFileSync(join(root, "screenshots", "clean.png"), Buffer.from([137, 80, 78, 71]));

    assert.deepEqual(validatePublicE2EArtifact(root), []);
  });
});

test("rejects a traversal root outside the public evidence directory", () => {
  const outsideRoot = join(PUBLIC_E2E_ARTIFACT_ROOT, "..", "outside");
  assert.match(validatePublicE2EArtifact(outsideRoot)[0], /outside/);
});

for (const [name, relativePath, content] of [
  ["rejects Clerk user state", "clerk/user.json", "{}"],
  ["rejects traces", "trace.zip", "trace"],
  ["rejects env files", ".env.local", "CLERK_SECRET_KEY=not-public"],
  ["rejects cookie/session JSON", "evidence/session.json", '{"cookie":"secret"}'],
  ["rejects JWTs", "evidence/token.json", JSON.stringify({ token: syntheticJwt })],
  ["rejects Clerk keys", "evidence/key.json", JSON.stringify({ key: syntheticClerkKey })],
  ["rejects Authorization headers", "evidence/header.json", '{"header":"Authorization: Bearer token"}'],
  ["rejects non-allowlisted files", "evidence/notes.txt", "safe-looking text"],
]) {
  test(name, () => {
    withStaging((root) => {
      const absolutePath = join(root, ...relativePath.split("/"));
      mkdirSync(join(absolutePath, ".."), { recursive: true });
      writeFileSync(absolutePath, content);

      assert.notDeepEqual(validatePublicE2EArtifact(root), []);
    });
  });
}
