import assert from "node:assert/strict";
import test from "node:test";

import {
  addDeficits,
  metricDeficit,
  topAbsoluteDeficit,
  topDelta,
} from "./generate-coverage-reference.mjs";

const metrics = (values) => Object.fromEntries(Object.entries(values).map(([name, covered]) => [name, { covered, total: 10, pct: covered * 10 }]));

test("calcule les unités supplémentaires sur les compteurs exacts", () => {
  assert.deepEqual(metricDeficit({ covered: 84, total: 100 }, 85), { target: 85, deltaPp: 1, additional: 1 });
  assert.deepEqual(metricDeficit({ covered: 85, total: 100 }, 85), { target: 85, deltaPp: 0, additional: 0 });
  assert.deepEqual(metricDeficit({ covered: 86, total: 100 }, 85), { target: 85, deltaPp: 0, additional: 0 });
});

test("ne fabrique pas de déficit pour une métrique sans cible", () => {
  const deficits = addDeficits({ metrics: metrics({ statements: 1, branches: 1, functions: 1, lines: 1 }) }, null);
  assert.deepEqual(deficits.lines, { target: null, deltaPp: null, additional: null });
  assert.deepEqual(deficits.branches, { target: null, deltaPp: null, additional: null });
});

test("ne fabrique pas de déficit quand le dénominateur est nul", () => {
  assert.deepEqual(metricDeficit({ covered: 0, total: 0 }, 80), { target: null, deltaPp: null, additional: null });
});

test("classe séparément les lignes et branches manquantes", () => {
  const files = [
    { path: "a.ts", scope: "web", family: "business", classification: { domain: "business" }, metrics: metrics({ statements: 8, branches: 8, functions: 8, lines: 1 }), deficits: { lines: { additional: 8 }, branches: { additional: 2 } } },
    { path: "b.ts", scope: "web", family: "business", classification: { domain: "business" }, metrics: metrics({ statements: 8, branches: 8, functions: 8, lines: 8 }), deficits: { lines: { additional: 2 }, branches: { additional: 8 } } },
  ];
  assert.deepEqual(topAbsoluteDeficit(files).map((file) => file.path), ["a.ts", "b.ts"]);
});

test("le classement des plus grands deltas est déterministe", () => {
  const files = [
    { path: "z.ts", scope: "web", family: "business", classification: { domain: "business" }, deficits: { statements: { deltaPp: 10, additional: 1 }, branches: { deltaPp: 0, additional: 0 }, functions: { deltaPp: 0, additional: 0 }, lines: { deltaPp: 0, additional: 0 } } },
    { path: "a.ts", scope: "web", family: "business", classification: { domain: "business" }, deficits: { statements: { deltaPp: 10, additional: 1 }, branches: { deltaPp: 0, additional: 0 }, functions: { deltaPp: 0, additional: 0 }, lines: { deltaPp: 0, additional: 0 } } },
  ];
  assert.deepEqual(topDelta(files).map((file) => file.path), ["a.ts", "z.ts"]);
});
