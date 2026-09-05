import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCandidateLifecycleReport,
  getStrictViolations,
} from "./check-candidate-lifecycle.mjs";
import {
  CANDIDATE_FAMILIES,
  createCandidateMaterialization,
} from "../ci/candidate-lifecycle.mjs";

const BASELINE = {
  version: 1,
  legacy: {
    generatedCandidates: [],
    unknownCanonicalEntries: [],
    adHocEntries: [
      ".artifacts/validation/chrome-onboarding-publication-20260904",
      ".artifacts/validation/governance-candidate-20260903.index",
      ".artifacts/validation/ribbon-home-logo-publication-20260905",
    ],
  },
};

function createFixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-candidate-check-"));
}

function removeFixture(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function writeEntry(root, relativePath, content = "fixture\n") {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

test("historical baseline passes strict policy", () => {
  const root = createFixture();
  try {
    for (const entry of BASELINE.legacy.adHocEntries) {
      if (entry.endsWith(".index")) writeEntry(root, entry);
      else fs.mkdirSync(path.join(root, entry), { recursive: true });
    }

    const report = buildCandidateLifecycleReport(root, BASELINE);
    assert.deepEqual(getStrictViolations(report), {
      generatedCandidates: [],
      unknownCanonicalEntries: [],
      adHocEntries: [],
    });
  } finally {
    removeFixture(root);
  }
});

test("a marked candidate residue fails strict policy", () => {
  const root = createFixture();
  let materialization;
  try {
    materialization = createCandidateMaterialization({
      repositoryRoot: root,
      family: CANDIDATE_FAMILIES.PREPUSH,
      key: "0123456789abcdef0123456789abcdef01234567",
      purpose: "strict-test",
    });
    const report = buildCandidateLifecycleReport(root, BASELINE);
    assert.equal(getStrictViolations(report).generatedCandidates.length, 1);
  } finally {
    materialization?.cleanup();
    removeFixture(root);
  }
});

test("a new feature-candidate entry fails strict policy", () => {
  const root = createFixture();
  try {
    writeEntry(root, ".artifacts/validation/feature-candidate/provenance.txt");
    const report = buildCandidateLifecycleReport(root, BASELINE);
    assert.deepEqual(getStrictViolations(report).adHocEntries, [
      ".artifacts/validation/feature-candidate",
    ]);
  } finally {
    removeFixture(root);
  }
});

test("a new unknown entry under a canonical family fails strict policy", () => {
  const root = createFixture();
  try {
    fs.mkdirSync(
      path.join(
        root,
        ".artifacts/validation/prepush-candidate/unknown-canonical-entry",
      ),
      { recursive: true },
    );
    const report = buildCandidateLifecycleReport(root, BASELINE);
    assert.deepEqual(getStrictViolations(report).unknownCanonicalEntries, [
      ".artifacts/validation/prepush-candidate/unknown-canonical-entry",
    ]);
  } finally {
    removeFixture(root);
  }
});

test("normal validation evidence does not create a false positive", () => {
  const root = createFixture();
  try {
    writeEntry(root, ".artifacts/validation/repository-inventory/run.json");
    writeEntry(root, ".artifacts/validation/test-reports/summary.json");
    const report = buildCandidateLifecycleReport(root, BASELINE);
    assert.deepEqual(getStrictViolations(report), {
      generatedCandidates: [],
      unknownCanonicalEntries: [],
      adHocEntries: [],
    });
  } finally {
    removeFixture(root);
  }
});
