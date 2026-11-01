import assert from "node:assert/strict";
import test from "node:test";

import {
  extractScientificMethodIdentity,
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
