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

function reviewEntry(source, { path: entryPath = "apps/web/src/fixture.ts", kind = "runtime", status = "REVIEW", maxLines = source.split("\n").length, maxBytes = Buffer.byteLength(source) } = {}) {
  return {
    path: entryPath,
    kind,
    status,
    reviewedRef: "fixture-review-ref",
    maxLines,
    maxBytes,
  };
}

function createFixture({ source = makeContent(1), sourcePath = "apps/web/src/fixture.ts", baseline = { version: 3, allowed: [], review: [] }, extraFiles = {} } = {}) {
  const root = fs.mkdtempSync(path.join(fixtureParent, "fixture-"));
  writeFile(root, sourcePath, source);
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

test("un fichier REVIEW historique inchangé passe", () => {
  const source = makeContent(501);
  withFixture({ source, baseline: { version: 3, allowed: [], review: [reviewEntry(source)] } }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /REVIEW_REQUIRED/);
    assert.match(result.output, /PASS/);
  });
});

test("un fichier REVIEW qui grossit au-delà de son plafond échoue", () => {
  const baselineSource = makeContent(501);
  withFixture({
    source: makeContent(502),
    baseline: { version: 3, allowed: [], review: [reviewEntry(baselineSource)] },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /plafonds REVIEW ratifiés/);
  });
});

test("un nouveau fichier qui franchit REVIEW échoue", () => {
  withFixture({ source: makeContent(1), extraFiles: { "apps/web/src/new.ts": makeContent(501) } }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Nouveaux dépassements REVIEW/);
  });
});

test("une amélioration REVIEW acquise est reconnue", () => {
  const source = makeContent(400);
  const historicalSource = makeContent(501);
  withFixture({
    source,
    baseline: { version: 3, allowed: [], review: [reviewEntry(historicalSource)] },
  }, (root) => {
    const candidate = runChecker(root, ["--enforce"]);
    assert.equal(candidate.status, 0, candidate.output);
    assert.match(candidate.output, /Améliorations REVIEW détectées/);

    writeFile(root, "scripts/checks/heavy-files-baseline.json", JSON.stringify({
      version: 3,
      allowed: [],
      review: [reviewEntry(source, { status: "IMPROVED" })],
    }, null, 2));
    const acquired = runChecker(root, ["--enforce"]);
    assert.equal(acquired.status, 0, acquired.output);
    assert.match(acquired.output, /Améliorations REVIEW acquises/);
  });
});

test("un retour au-dessus de REVIEW après amélioration échoue", () => {
  const baselineSource = makeContent(400);
  withFixture({
    source: makeContent(501),
    baseline: { version: 3, allowed: [], review: [reviewEntry(baselineSource, { status: "IMPROVED" })] },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /retour au-dessus du seuil REVIEW/);
  });
});

test("un nouveau dépassement HARD échoue", () => {
  withFixture({ source: makeContent(1001) }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Nouveaux dépassements HARD/);
  });
});

test("une exception COHESIVE ratifiée reste plafonnée", () => {
  const source = makeContent(1001);
  withFixture({
    source,
    baseline: {
      version: 3,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        kind: "runtime",
        decision: "COHESIVE_SINGLE_FILE",
        reason: "Responsabilité cohésive conservée en attendant une revue dédiée.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1001,
        maxBytes: Buffer.byteLength(source),
      }],
      review: [],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
  });
});

test("TOP_HEAVY_FAILURE_PATH_TEST: une exception qui dépasse maxLines échoue sans ReferenceError", () => {
  withFixture({
    source: makeContent(1002),
    baseline: {
      version: 3,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        kind: "runtime",
        decision: "DEFERRED_SPLIT",
        reason: "Découpage différé jusqu'à la caractérisation du contrat.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1001,
        maxBytes: 50000,
      }],
      review: [],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /plafonds ratifiés/);
    assert.doesNotMatch(result.output, /ReferenceError/);
  });
});

test("une exception qui dépasse maxBytes échoue", () => {
  const source = makeContent(4, () => `export const payload = "${"x".repeat(20000)}";`);
  withFixture({
    source,
    baseline: {
      version: 3,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        kind: "runtime",
        decision: "COHESIVE_SINGLE_FILE",
        reason: "Fichier cohésif conservé avec un plafond de taille explicite.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1000,
        maxBytes: 100,
      }],
      review: [],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /plafonds ratifiés/);
  });
});

test("une exception redevenue sous HARD est stale et échoue", () => {
  withFixture({
    source: makeContent(501),
    baseline: {
      version: 3,
      allowed: [{
        path: "apps/web/src/fixture.ts",
        kind: "runtime",
        decision: "COHESIVE_SINGLE_FILE",
        reason: "Exception historique à réévaluer dès le retour sous HARD.",
        reviewedRef: "fixture-review-ref",
        maxLines: 1000,
        maxBytes: 50000,
      }],
      review: [],
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
        version: 3,
        allowed: [{
          path: entryPath,
          kind: "runtime",
          decision: "COHESIVE_SINGLE_FILE",
          reason: "Entrée volontairement invalide pour le test de schéma.",
          reviewedRef: "fixture-review-ref",
          maxLines: 1000,
          maxBytes: 50000,
        }],
        review: [],
      },
    }, (root) => {
      const result = runChecker(root, ["--enforce"]);
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /BASELINE_INVALID/);
    });
  }
});

test("une baseline v1 exige une migration explicite", () => {
  withFixture({ baseline: { version: 1, allowed: [] } }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /migration explicite/);
  });
});

test("une baseline v2 historique est lue avec le KIND classifié", () => {
  const source = makeContent(501);
  withFixture({
    source,
    baseline: {
      version: 2,
      allowed: [],
      review: [{
        path: "apps/web/src/fixture.ts",
        status: "REVIEW",
        reviewedRef: "fixture-review-ref",
        maxLines: 501,
        maxBytes: Buffer.byteLength(source),
      }],
    },
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /PASS/);
  });
});

test("une baseline malformée échoue explicitement", () => {
  withFixture({ baseline: { allowed: [] } }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /baseline malformée/);
  });
});

test("un scan --ref ne lit ni le worktree ni un fichier untracked", () => {
  const source = makeContent(501);
  withFixture({ source, baseline: { version: 3, allowed: [], review: [reviewEntry(source)] } }, (root) => {
    writeFile(root, "apps/web/src/fixture.ts", makeContent(1001));
    writeFile(root, "apps/web/src/untracked.ts", makeContent(1001));
    const result = runChecker(root, ["--enforce", "--ref=HEAD"]);
    assert.equal(result.status, 0, result.output);
    assert.doesNotMatch(result.output, /untracked/);
    assert.doesNotMatch(result.output, /Nouveaux dépassements HARD/);
  });
});

test("les seuils test et data/config sont plus larges que runtime", () => {
  withFixture({
    sourcePath: "apps/web/src/fixture.test.ts",
    source: makeContent(1000),
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /PASS: 0 fichier\(s\) HARD, 0 fichier\(s\) REVIEW_REQUIRED/);
  });

  withFixture({
    sourcePath: "apps/web/src/data/fixture.ts",
    source: makeContent(800),
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /PASS: 0 fichier\(s\) HARD, 0 fichier\(s\) REVIEW_REQUIRED/);
  });
});

test("un fichier généré marqué et régénérable est informatif mais non bloquant", () => {
  withFixture({
    sourcePath: "apps/web/src/generated/fixture.generated.ts",
    source: `// @generated\n${makeContent(1600)}`,
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Generated/);
    assert.doesNotMatch(result.output, /Nouveaux dépassements HARD/);
  });
});

test("un fichier manuel placé sous generated reste soumis au radar", () => {
  withFixture({
    sourcePath: "apps/web/src/generated/manual.ts",
    source: makeContent(1001),
  }, (root) => {
    const result = runChecker(root, ["--enforce"]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Nouveaux dépassements HARD/);
  });
});
