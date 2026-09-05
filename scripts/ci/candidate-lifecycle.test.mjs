import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CANDIDATE_FAMILIES,
  CANDIDATE_MARKER,
  createCandidateMaterialization,
  findCandidateResidues,
} from "./candidate-lifecycle.mjs";

function createFixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-candidate-lifecycle-"));
}

function cleanupFixture(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test("creates and cleans a prepush candidate in the canonical root", () => {
  const root = createFixture();
  try {
    const materialization = createCandidateMaterialization({
      repositoryRoot: root,
      family: CANDIDATE_FAMILIES.PREPUSH,
      key: "0123456789abcdef0123456789abcdef01234567",
      purpose: "test",
    });

    assert.equal(
      materialization.materializedRoot.startsWith(
        path.join(root, ".artifacts", "validation", "prepush-candidate"),
      ),
      true,
    );
    assert.equal(fs.existsSync(path.join(materialization.materializedRoot, CANDIDATE_MARKER)), true);

    materialization.cleanup();
    assert.equal(fs.existsSync(materialization.materializedRoot), false);
    assert.deepEqual(findCandidateResidues(root).generated, []);
  } finally {
    cleanupFixture(root);
  }
});

test("cleans after a failed operation without touching a foreign artifact", () => {
  const root = createFixture();
  try {
    const materialization = createCandidateMaterialization({
      repositoryRoot: root,
      family: CANDIDATE_FAMILIES.PREPUSH,
      key: "0123456789abcdef0123456789abcdef01234567",
      purpose: "test-failure",
    });
    const foreignPath = path.join(root, "foreign-keep.txt");
    fs.writeFileSync(foreignPath, "keep\n");
    try {
      throw new Error("simulated command failure");
    } catch {
      materialization.cleanup();
    }

    assert.equal(fs.existsSync(materialization.materializedRoot), false);
    assert.equal(fs.readFileSync(foreignPath, "utf8"), "keep\n");
  } finally {
    cleanupFixture(root);
  }
});

test("uses the publication root only with an explicit safe run id", () => {
  const root = createFixture();
  try {
    const materialization = createCandidateMaterialization({
      repositoryRoot: root,
      family: CANDIDATE_FAMILIES.PUBLICATION,
      key: "run-20260905-001",
      purpose: "publication-race",
    });

    assert.equal(
      materialization.materializedRoot.startsWith(
        path.join(root, ".artifacts", "validation", "publication-candidate"),
      ),
      true,
    );
    materialization.cleanup();
    assert.equal(fs.existsSync(materialization.materializedRoot), false);
    assert.deepEqual(findCandidateResidues(root).generated, []);
  } finally {
    cleanupFixture(root);
  }
});

test("preserves a parallel candidate sharing the same commit key", () => {
  const root = createFixture();
  try {
    const first = createCandidateMaterialization({
      repositoryRoot: root,
      family: CANDIDATE_FAMILIES.PREPUSH,
      key: "0123456789abcdef0123456789abcdef01234567",
      purpose: "parallel-one",
    });
    const second = createCandidateMaterialization({
      repositoryRoot: root,
      family: CANDIDATE_FAMILIES.PREPUSH,
      key: "0123456789abcdef0123456789abcdef01234567",
      purpose: "parallel-two",
    });

    first.cleanup();
    assert.equal(fs.existsSync(first.materializedRoot), false);
    assert.equal(fs.existsSync(second.materializedRoot), true);
    assert.equal(findCandidateResidues(root).generated.includes(second.materializedRoot), true);

    second.cleanup();
    assert.equal(fs.existsSync(second.materializedRoot), false);
  } finally {
    cleanupFixture(root);
  }
});

test("rejects arbitrary candidate roots and unsafe publication ids", () => {
  const root = createFixture();
  try {
    assert.throws(
      () => createCandidateMaterialization({ repositoryRoot: root, family: "feature-candidate", key: "run" }),
      /Unsupported candidate family/,
    );
    assert.throws(
      () => createCandidateMaterialization({
        repositoryRoot: root,
        family: CANDIDATE_FAMILIES.PUBLICATION,
        key: "../foreign",
      }),
      /safe single path segment/,
    );
  } finally {
    cleanupFixture(root);
  }
});
