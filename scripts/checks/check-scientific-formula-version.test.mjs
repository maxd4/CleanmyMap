import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractScientificMethodIdentity,
  resolveBaseRef,
  validateScientificFormulaIdentity,
} from "./check-scientific-formula-version.mjs";

const waste = (volume, version) => `
export const CIGARETTE_BUTTS_PER_VOLUME_LITER_V1 = 600;
export const CIGARETTE_BUTTS_PER_VOLUME_LITER_V2 = ${volume};
export const CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2 = "${version}";
export const CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION = CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2;
export const CIGARETTE_BUTTS_MASS_CONVERSION_VERSION = "mass-v2";
export const CIGARETTE_BUTTS_MASS_FACTORS = { [CIGARETTE_BUTTS_MASS_CONVERSION_VERSION]: { propre: 0.22, humide: 0.5, mouille: 0.5 } };
export function calculateCigaretteButtsLot(input) {
  return Math.round(input.value * ${volume});
}
export function computeButtsCount(weightKg) {
  return Math.round(weightKg / 0.5);
}
`;

const projection = (version) => `export const PUBLIC_IMPACT_PROJECTION_VERSION = "${version}";`;
const sql = (version) => `create or replace function public.current_public_impact_projection_version() returns text as $$ select '${version}'::text; $$;`;
const sqlHelper = (name, body) => `create or replace function public.${name}(p_volume_l numeric) returns numeric language sql as $$ ${body} $$;`;
const impact = `
export const CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V2 = "mass-v2";
export const CIGARETTE_BUTTS_MASS_CONVERSION_VERSION = CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V2;
export const CIGARETTE_BUTTS_MASS_FACTORS_G_PER_BUTT = {
  [CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V2]: { propre: 0.22, humide: 0.5, mouille: 0.5 },
};
export function computeButtsCount(weightKg) {
  return Math.round(weightKg / 0.5);
}
`;

test("fails when a volume factor changes without a method identity change", () => {
  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(700, "volume-v1"),
    baseImpactSource: impact,
    currentImpactSource: impact,
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v1") },
    sqlSource: sql("projection-v1"),
  });
  assert.match(result.issues.join("\n"), /volume factor changed/);
});

test("uses the push before SHA for a multi-commit push instead of HEAD^", () => {
  const baseRef = resolveBaseRef({
    env: {
      SCIENTIFIC_FORMULA_EVENT_NAME: "push",
      SCIENTIFIC_FORMULA_EVENT_BEFORE: "push-before-sha",
    },
  });
  assert.equal(baseRef, "push-before-sha");

  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(700, "volume-v1"),
    baseImpactSource: impact,
    currentImpactSource: impact,
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v1") },
    sqlSource: sql("projection-v1"),
  });
  assert.match(result.issues.join("\n"), /volume factor changed/);
});

test("fails when a changed conversion factor keeps the dependent projection identity", () => {
  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(700, "volume-v2"),
    baseImpactSource: impact,
    currentImpactSource: impact,
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v1") },
    sqlSource: sql("projection-v1"),
  });
  assert.match(result.issues.join("\n"), /public projection identity/);
});

test("accepts a factor change with a new identity and matching SQL projection", () => {
  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(700, "volume-v2"),
    baseImpactSource: impact,
    currentImpactSource: impact,
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v2") },
    sqlSource: sql("projection-v2"),
  });
  assert.deepEqual(result.issues, []);
  assert.equal(extractScientificMethodIdentity({ wasteSource: waste(700, "volume-v2"), projectionSource: projection("projection-v2") }).volumeV2, "700");
});

test("rejects a TypeScript/SQL projection identity divergence", () => {
  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(600, "volume-v1"),
    baseImpactSource: impact,
    currentImpactSource: impact,
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v1") },
    sqlSource: sql("projection-v0"),
  });
  assert.match(result.issues.join("\n"), /SQL projection identity/);
});

test("fails when mass factors change without a new mass identity", () => {
  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(600, "volume-v1"),
    baseImpactSource: impact,
    currentImpactSource: impact.replace("humide: 0.5", "humide: 0.6"),
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v1") },
    sqlSource: sql("projection-v1"),
  });
  assert.match(result.issues.join("\n"), /mass factors or formula changed/);
});

test("rejects a duplicated coefficient in an active SQL definition but ignores superseded history", () => {
  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(600, "volume-v1"),
    baseImpactSource: impact,
    currentImpactSource: impact,
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v1") },
    sqlSources: [
      { name: "20261101000004_historical.sql", source: `${sql("projection-v1")}\n${sqlHelper("active_projection_helper", "select p_volume_l * 600")}` },
      { name: "20261101000012_current.sql", source: `${sql("projection-v1")}\n${sqlHelper("active_projection_helper", "select p_volume_l")}` },
      { name: "20261101000013_active_duplicate.sql", source: sqlHelper("another_active_helper", "select p_volume_l * 700") },
    ],
  });
  assert.deepEqual(result.duplicatedSqlDefinitions.map((definition) => definition.sourceName), [
    "20261101000013_active_duplicate.sql",
  ]);
  assert.match(result.issues.join("\n"), /active_duplicate/);
});

test("accepts a versioned append-only SQL evolution with historical definitions intact", () => {
  const result = validateScientificFormulaIdentity({
    baseWasteSource: waste(600, "volume-v1"),
    currentWasteSource: waste(700, "volume-v2"),
    baseImpactSource: impact,
    currentImpactSource: impact,
    projectionSource: { base: projection("projection-v1"), current: projection("projection-v2") },
    sqlSources: [
      { name: "20261101000004_historical.sql", source: `${sql("projection-v1")}\n${sqlHelper("active_projection_helper", "select p_volume_l * 600")}` },
      { name: "20261101000013_current.sql", source: `${sql("projection-v2")}\n${sqlHelper("active_projection_helper", "select p_volume_l")}` },
    ],
  });
  assert.deepEqual(result.issues, []);
});

test("fails closed when a required event base reference is unavailable", () => {
  assert.throws(
    () => resolveBaseRef({
      env: { SCIENTIFIC_FORMULA_EVENT_NAME: "push" },
    }),
    /push event before SHA is required/,
  );
  assert.throws(
    () => resolveBaseRef({
      env: { SCIENTIFIC_FORMULA_EVENT_NAME: "pull_request" },
    }),
    /pull request base SHA is required/,
  );
});

test("fails explicitly when the resolved Git base ref is not available", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./check-scientific-formula-version.mjs", import.meta.url)), "--base-ref", "missing-scientific-base-ref"],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base Git reference 'missing-scientific-base-ref' is unavailable/);
});
