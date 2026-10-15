import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, rmdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import {
  PUBLIC_E2E_ARTIFACT_ROOT,
  validatePublicE2EArtifact,
} from "./check-public-e2e-artifact.mjs";

const syntheticJwt = ["eyJ" + "a".repeat(11), "b".repeat(11), "c".repeat(11)].join(".");
const syntheticClerkKey = ["pk_test_", "a".repeat(24)].join("");

function staging(artifactRootPath = PUBLIC_E2E_ARTIFACT_ROOT) {
  const artifactRoot = resolve(artifactRootPath);
  const artifactRootExisted = existsSync(artifactRoot);
  mkdirSync(artifactRoot, { recursive: true });
  const root = mkdtempSync(join(artifactRoot, "test-"));
  mkdirSync(join(root, "evidence"), { recursive: true });
  return {
    root,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
      if (!artifactRootExisted) {
        try {
          rmdirSync(artifactRoot);
        } catch (error) {
          if (!new Set(["ENOTEMPTY", "EEXIST", "ENOENT"]).has(error?.code)) throw error;
        }
      }
    },
  };
}

function withStaging(callback, artifactRootPath = PUBLIC_E2E_ARTIFACT_ROOT) {
  const fixture = staging(artifactRootPath);
  try {
    return callback(fixture.root);
  } finally {
    fixture.cleanup();
  }
}

function withIsolatedArtifactRoot(callback) {
  const container = mkdtempSync(join(tmpdir(), "cleanmymap-public-e2e-root-"));
  const artifactRoot = join(container, "artifacts", "ci-public-evidence");
  try {
    return callback(artifactRoot);
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
}

test("cleans an artifact parent created by the test without touching the checkout root", () => {
  withIsolatedArtifactRoot((artifactRoot) => {
    assert.equal(existsSync(artifactRoot), false);
    withStaging(() => {}, artifactRoot);
    assert.equal(existsSync(artifactRoot), false);
  });
});

test("preserves an artifact parent that existed before staging", () => {
  withIsolatedArtifactRoot((artifactRoot) => {
    mkdirSync(artifactRoot, { recursive: true });
    withStaging(() => {}, artifactRoot);
    assert.equal(existsSync(artifactRoot), true);
  });
});

test("preserves a foreign artifact when the parent cannot be removed", () => {
  withIsolatedArtifactRoot((artifactRoot) => {
    mkdirSync(artifactRoot, { recursive: true });
    const foreignArtifact = join(artifactRoot, "foreign-report.json");
    writeFileSync(foreignArtifact, '{"owner":"another-test"}\n');

    withStaging(() => {}, artifactRoot);

    assert.equal(existsSync(artifactRoot), true);
    assert.equal(existsSync(foreignArtifact), true);
    assert.equal(readFileSync(foreignArtifact, "utf8"), '{"owner":"another-test"}\n');
  });
});

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

test("rejects a file symlink inside public evidence", () => {
  withStaging((root) => {
    const externalRoot = mkdtempSync(join(tmpdir(), "cleanmymap-public-e2e-external-"));
    const externalFile = join(externalRoot, "summary.json");
    const linkedFile = join(root, "evidence", "linked.json");
    writeFileSync(externalFile, '{"status":"passed"}\n');
    symlinkSync(externalFile, linkedFile, "file");

    try {
      assert.match(validatePublicE2EArtifact(root).join("\n"), /symbolic links are forbidden/);
    } finally {
      rmSync(externalRoot, { recursive: true, force: true });
    }
  });
});

test("rejects a staging directory reached through a parent symlink", () => {
  const artifactRoot = resolve(PUBLIC_E2E_ARTIFACT_ROOT);
  const artifactRootExisted = existsSync(artifactRoot);
  const externalRoot = mkdtempSync(join(tmpdir(), "cleanmymap-public-e2e-parent-"));
  const linkName = `parent-link-${randomUUID()}`;
  const linkedParent = join(artifactRoot, linkName);
  const linkedStaging = join(linkedParent, "staging");

  mkdirSync(artifactRoot, { recursive: true });
  mkdirSync(join(externalRoot, "staging"), { recursive: true });
  symlinkSync(externalRoot, linkedParent, "junction");

  try {
    assert.match(validatePublicE2EArtifact(linkedStaging).join("\n"), /symbolic link|resolves outside/);
  } finally {
    rmSync(linkedParent, { recursive: true, force: true });
    rmSync(externalRoot, { recursive: true, force: true });
    if (!artifactRootExisted) {
      try {
        rmdirSync(artifactRoot);
      } catch (error) {
        if (!new Set(["ENOTEMPTY", "EEXIST", "ENOENT"]).has(error?.code)) throw error;
      }
    }
  }
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
