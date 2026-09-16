import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { tmpdir } from "node:os";

import { validatePublicE2EArtifact } from "./check-public-e2e-artifact.mjs";

const syntheticJwt = ["eyJ" + "a".repeat(11), "b".repeat(11), "c".repeat(11)].join(".");
const syntheticClerkKey = ["pk_test_", "a".repeat(24)].join("");

function staging() {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-public-e2e-"));
  mkdirSync(join(root, "evidence"), { recursive: true });
  return root;
}

test("accepts synthetic evidence JSON and an explicitly allowed screenshot", () => {
  const root = staging();
  writeFileSync(join(root, "evidence", "summary.json"), '{"status":"passed"}\n');
  mkdirSync(join(root, "screenshots"));
  writeFileSync(join(root, "screenshots", "clean.png"), Buffer.from([137, 80, 78, 71]));

  assert.deepEqual(validatePublicE2EArtifact(root), []);
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
    const root = staging();
    const absolutePath = join(root, ...relativePath.split("/"));
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, content);

    assert.notDeepEqual(validatePublicE2EArtifact(root), []);
  });
}
