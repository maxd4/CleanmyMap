import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const checkerPath = path.join(repoRoot, "scripts", "checks", "check-top-heavy-files.mjs");
const fixtureParent = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-top-heavy-checker-tests-"));

function makeContent(lines, line = (index) => `export const value${index} = ${index};`) {
  return Array.from({ length: lines }, (_, index) => line(index)).join("\n");
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function createFixture({ source = makeContent(1), baseline = { version: 1, allowed: [] }, extraFiles = {} } = {}) {
  const root = fs.mkdtempSync(path.join(fixtureParent, "fixture-"));
  writeFile(root, "apps/web/src/fixture.ts", source);
  writeFile(root, "scripts/checks/heavy-files-baseline.json", JSON.stringify(baseline, null, 2));
  for (const [relativePath, content] of Object.entries(extraFiles)) writeFile(root, relativePath, content);
  execFileSync("git", ["init", "-q"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", "--", "."], { cwd: root, stdio: "ignore" });
  execFileSync("git", [
    "-c", "user.name=CleanMyMap tests", "-c", "user.email=cleanmymap-tests",
    "commit", "-qm", "fixture",
  ], { cwd: root, stdio: "ignore" });
  return root;
}

function runChecker(root, args = []) {
  const result = spawnSync(process.execPath, [checkerPath, ...args], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function withFixture(options, callback) {
  const root = createFixture(options);
  try {
    return callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

test.after(() => fs.rmSync(fixtureParent, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

test("un fichier au-dessus du seuil REVIEW mais sous HARD passe", () => {
  withFixture({ source: makeContent(501) }, (root) => {
    const result = runChecker(root);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /REVIEW_REQUIRED/);
    assert.match(result.output, /PASS/);
  });
});

test("un warning seul reste non bloquant avec --enforce", () => {
  withFixture({ source: makeContent(501) }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
  });
});

test("un nouveau dépassement HARD échoue", () => {
  withFixture({ source: makeContent(1001) }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Nouveaux dépassements HARD/);
  });
});

test("une exception ratifiée inchangée passe", () => {
  const source = makeContent(1001);
  withFixture({
    source,
    baseline: {
      version: 1,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        decision: "COHESIVE_SINGLE_FILE",
        reason: "Responsabilité cohésive conservée en attendant une revue dédiée.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1001,
        maxBytes: Buffer.byteLength(source),
      }],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
  });
});

test("une exception qui dépasse maxLines échoue", () => {
  withFixture({
    source: makeContent(1002),
    baseline: {
      version: 1,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        decision: "DEFERRED_SPLIT",
        reason: "Découpage différé jusqu'à la caractérisation du contrat.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1001,
        maxBytes: 50000,
      }],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /plafonds ratifiés/);
  });
});

test("une exception qui dépasse maxBytes échoue", () => {
  const source = makeContent(4, () => `export const payload = "${"x".repeat(80)}";`);
  withFixture({
    source,
    baseline: {
      version: 1,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        decision: "COHESIVE_SINGLE_FILE",
        reason: "Fichier cohésif conservé avec un plafond de taille explicite.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1000,
        maxBytes: 100,
      }],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce", "--warn-kb=0.05", "--max-kb=0.1"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /plafonds ratifiés/);
  });
});

test("une exception redevenue sous HARD est stale et échoue", () => {
  withFixture({
    source: makeContent(501),
    baseline: {
      version: 1,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        decision: "COHESIVE_SINGLE_FILE",
        reason: "Exception historique à réévaluer dès le retour sous HARD.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1000,
        maxBytes: 50000,
      }],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /stale/);
  });
});

test("un chemin absent ou hors root invalide la baseline", () => {
  for (const entryPath of ["apps/web/src/missing.ts", "README.md"]) {
    withFixture({
      extraFiles: { "README.md": "readme\n" },
      baseline: {
        version: 1,
        allowed: [{
          path: entryPath,
          decision: "COHESIVE_SINGLE_FILE",
          reason: "Entrée volontairement invalide pour le test de schéma.",
          reviewedRef: "fixture-review-ref",
          maxLines: 1000,
          maxBytes: 50000,
        }],
      },
    }, (root) => {
      const result = runChecker(root, ["--enforce"]);
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /BASELINE_INVALID/);
    });
  }
});

test("une baseline malformée échoue explicitement", () => {
  withFixture({ baseline: { allowed: [] } }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /baseline malformée/);
  });
});

test("un scan --ref ne lit ni le worktree ni un fichier untracked", () => {
  withFixture({ source: makeContent(501) }, (root) => {
    writeFile(root, "apps/web/src/fixture.ts", makeContent(1001));
    writeFile(root, "apps/web/src/untracked.ts", makeContent(1001));
    const result = runChecker(root, ["--enforce", "--ref=HEAD"]);
    assert.equal(result.status, 0, result.output);
    assert.doesNotMatch(result.output, /untracked/);
    assert.doesNotMatch(result.output, /Nouveaux dépassements HARD/);
  });
});
