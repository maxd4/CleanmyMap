import assert from "node:assert/strict";
import test from "node:test";

import {
  FILE_KIND_POLICY,
  isAboveHard,
  isAboveReview,
  isExcludedGeneratedRow,
} from "./top-heavy-policy.mjs";

function row(kind, lines, bytes, generated = false) {
  return { file: `fixture-${kind}`, kind, lines, bytes, generated };
}

test("la politique expose les seuils REVIEW/HARD propres à chaque KIND", () => {
  assert.deepEqual(FILE_KIND_POLICY.runtime.review, { lines: 500, bytes: 40 * 1024 });
  assert.deepEqual(FILE_KIND_POLICY.runtime.hard, { lines: 1000, bytes: 50 * 1024 });
  assert.deepEqual(FILE_KIND_POLICY.test.review, { lines: 1000, bytes: 50 * 1024 });
  assert.deepEqual(FILE_KIND_POLICY.test.hard, { lines: 1500, bytes: 80 * 1024 });
  assert.deepEqual(FILE_KIND_POLICY["data/config"].review, { lines: 800, bytes: 50 * 1024 });
  assert.deepEqual(FILE_KIND_POLICY["data/config"].hard, { lines: 1500, bytes: 80 * 1024 });
});

test("un test sous son seuil KIND n'est pas assimilé à un monolithe runtime", () => {
  assert.equal(isAboveReview(row("test", 1000, 50 * 1024)), false);
  assert.equal(isAboveReview(row("test", 1001, 50 * 1024)), true);
  assert.equal(isAboveHard(row("test", 1500, 80 * 1024)), false);
  assert.equal(isAboveHard(row("test", 1501, 80 * 1024)), true);
});

test("generated n'est exclu que lorsque sa régénérabilité est prouvée", () => {
  const generated = row("generated", 3000, 100 * 1024, true);
  const unverified = row("generated", 1001, 50 * 1024, false);

  assert.equal(isExcludedGeneratedRow(generated), true);
  assert.equal(isAboveReview(generated), false);
  assert.equal(isAboveHard(generated), false);
  assert.equal(isExcludedGeneratedRow(unverified), false);
  assert.equal(isAboveHard(unverified), true);
});
