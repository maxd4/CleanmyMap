import assert from "node:assert/strict";
import test from "node:test";

import {
  FILE_KIND_POLICY,
  getDistanceToReview,
  isInPreventiveZone,
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

test("la surveillance runtime est informative aux bornes 300 et avant REVIEW", () => {
  assert.equal(isInPreventiveZone(row("runtime", 299, 10_000)), false);
  assert.equal(isInPreventiveZone(row("runtime", 300, 10_000)), true);
  assert.equal(isInPreventiveZone(row("runtime", 499, 10_000)), true);
  assert.equal(isInPreventiveZone(row("runtime", 500, 10_000)), true);
  assert.equal(isInPreventiveZone(row("runtime", 501, 10_000)), false);
  assert.deepEqual(getDistanceToReview(row("runtime", 300, 10_000)), { lines: 200, bytes: 40 * 1024 - 10_000 });
});

test("la surveillance des tests est informative aux bornes 600 et avant REVIEW", () => {
  assert.equal(isInPreventiveZone(row("test", 599, 10_000)), false);
  assert.equal(isInPreventiveZone(row("test", 600, 10_000)), true);
  assert.equal(isInPreventiveZone(row("test", 999, 10_000)), true);
  assert.equal(isInPreventiveZone(row("test", 1000, 10_000)), true);
  assert.equal(isInPreventiveZone(row("test", 1001, 10_000)), false);
});

test("data/config reste surveillé qualitativement sans seuil numérique préventif", () => {
  assert.equal(FILE_KIND_POLICY["data/config"].preventive, null);
  assert.equal(isInPreventiveZone(row("data/config", 799, 10_000)), false);
  assert.equal(isInPreventiveZone(row("data/config", 800, 10_000)), false);
});

test("les seuils REVIEW/HARD en octets restent indépendants du niveau préventif", () => {
  const runtimeReviewByBytes = row("runtime", 200, 40 * 1024 + 1);
  const runtimeHardByBytes = row("runtime", 200, 50 * 1024 + 1);
  assert.equal(isInPreventiveZone(runtimeReviewByBytes), false);
  assert.equal(isAboveReview(runtimeReviewByBytes), true);
  assert.equal(isAboveHard(runtimeHardByBytes), true);
});
