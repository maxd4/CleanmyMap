#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const SCIENTIFIC_FORMULA_PATHS = Object.freeze({
  waste: "apps/web/src/lib/waste/cigarette-butts.ts",
  impact: "apps/web/src/lib/impact/impact-terrain-2026.ts",
  projection: "apps/web/src/lib/impact/scientific-projection-versions.ts",
  sql: "apps/web/supabase/migrations/20261101000012_scientific_projection_volume_lot_reconciliation.sql",
});

function normalizeExpression(value) {
  return String(value)
    .replace(/(\d)_(?=\d)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function readConstAssignments(source) {
  const assignments = new Map();
  for (const match of source.matchAll(
    /export const ([A-Z][A-Z0-9_]+)\s*=\s*(?:(["'])(.*?)\2|([^;\n]+))/g,
  )) {
    assignments.set(match[1], normalizeExpression(match[3] ?? match[4]));
  }
  return assignments;
}

function resolveAssignment(assignments, name) {
  let value = assignments.get(name) ?? null;
  const seen = new Set();
  while (value && assignments.has(value) && !seen.has(value)) {
    seen.add(value);
    value = assignments.get(value) ?? null;
  }
  return value;
}

function readMassV2Factors(source) {
  const block = source.match(
    /\[CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V2\]\s*:\s*\{([\s\S]*?)\}\s*,?/,
  )?.[1] ?? "";
  return ["propre", "humide", "mouille"].map((condition) =>
    normalizeExpression(
      block.match(new RegExp(`${condition}\\s*:\\s*([^,\\n]+)`))?.[1] ?? "missing",
    ),
  );
}

function readFunctionBody(source, name) {
  return normalizeExpression(
    source.match(new RegExp(`export function ${name}\\([\\s\\S]*?\\n\\}`))?.[0] ?? "missing",
  );
}

export function extractScientificMethodIdentity({ wasteSource, impactSource, projectionSource }) {
  const assignments = readConstAssignments(wasteSource);
  const impactAssignments = readConstAssignments(impactSource ?? "");
  const projectionAssignments = readConstAssignments(projectionSource);
  const volumeV1 = resolveAssignment(assignments, "CIGARETTE_BUTTS_PER_VOLUME_LITER_V1");
  const volumeV2 = resolveAssignment(assignments, "CIGARETTE_BUTTS_PER_VOLUME_LITER_V2");
  const volumeVersion = resolveAssignment(
    assignments,
    "CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION",
  );
  const massVersion = resolveAssignment(
    impactAssignments,
    "CIGARETTE_BUTTS_MASS_CONVERSION_VERSION",
  );
  const projectionVersion = resolveAssignment(
    projectionAssignments,
    "PUBLIC_IMPACT_PROJECTION_VERSION",
  );
  return Object.freeze({
    volumeV1,
    volumeV2,
    volumeVersion,
    massVersion,
    massV2Factors: readMassV2Factors(impactSource ?? ""),
    lotFormula: readFunctionBody(wasteSource, "calculateCigaretteButtsLot"),
    computeMassFormula: readFunctionBody(impactSource ?? "", "computeButtsCount"),
    projectionVersion,
  });
}

export function validateScientificFormulaIdentity({
  baseWasteSource,
  currentWasteSource,
  baseImpactSource,
  currentImpactSource,
  projectionSource,
  sqlSource,
}) {
  const issues = [];
  const base = baseWasteSource && projectionSource.base
    ? extractScientificMethodIdentity({
      wasteSource: baseWasteSource,
      impactSource: baseImpactSource,
      projectionSource: projectionSource.base,
    })
    : null;
  const current = extractScientificMethodIdentity({
    wasteSource: currentWasteSource,
    impactSource: currentImpactSource,
    projectionSource: projectionSource.current,
  });

  if (base && base.volumeV2 !== current.volumeV2 && base.volumeVersion === current.volumeVersion) {
    issues.push("volume factor changed without changing the effective volume conversion identity");
  }
  if (base &&
    (base.massV2Factors.join("|") !== current.massV2Factors.join("|") ||
      base.computeMassFormula !== current.computeMassFormula) &&
    base.massVersion === current.massVersion) {
    issues.push("mass factors or formula changed without changing the effective mass conversion identity");
  }
  if (base && base.lotFormula !== current.lotFormula &&
    base.volumeVersion === current.volumeVersion &&
    base.massVersion === current.massVersion) {
    issues.push("lot conversion formula changed without changing an effective conversion identity");
  }

  const sqlProjectionVersion = sqlSource.match(
    /current_public_impact_projection_version\(\)[\s\S]*?select\s+'([^']+)'::text/i,
  )?.[1] ?? null;
  if (sqlProjectionVersion !== current.projectionVersion) {
    issues.push(
      `SQL projection identity ${sqlProjectionVersion ?? "missing"} differs from TypeScript ${current.projectionVersion ?? "missing"}`,
    );
  }
  if (/\b(?:volume_l|volume)\b[\s\S]{0,160}\b(?:600|700)\b|\b(?:600|700)\b[\s\S]{0,160}\b(?:volume_l|volume)\b/i.test(sqlSource)) {
    issues.push("active SQL must consume the projected action value, not duplicate the volume coefficient");
  }
  return { issues, base, current, sqlProjectionVersion };
}

function gitShow(repositoryRoot, ref, file) {
  const result = spawnSync("git", ["show", `${ref}:${file}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout : null;
}

function resolveBaseRef() {
  const argumentIndex = process.argv.indexOf("--base-ref");
  if (argumentIndex >= 0 && process.argv[argumentIndex + 1]) {
    return process.argv[argumentIndex + 1];
  }
  if (process.env.GITHUB_BASE_REF) return `origin/${process.env.GITHUB_BASE_REF}`;
  return "HEAD^";
}

function main() {
  const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
  const currentWasteSource = readFileSync(
    path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.waste),
    "utf8",
  );
  const currentImpactSource = readFileSync(
    path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.impact),
    "utf8",
  );
  const currentProjectionSource = readFileSync(
    path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.projection),
    "utf8",
  );
  const sqlSource = readFileSync(
    path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.sql),
    "utf8",
  );
  const baseRef = resolveBaseRef();
  const result = validateScientificFormulaIdentity({
    baseWasteSource: gitShow(repositoryRoot, baseRef, SCIENTIFIC_FORMULA_PATHS.waste),
    currentWasteSource,
    baseImpactSource: gitShow(repositoryRoot, baseRef, SCIENTIFIC_FORMULA_PATHS.impact),
    currentImpactSource,
    projectionSource: {
      base: gitShow(repositoryRoot, baseRef, SCIENTIFIC_FORMULA_PATHS.projection),
      current: currentProjectionSource,
    },
    sqlSource,
  });
  if (result.issues.length > 0) {
    console.error(`[scientific-formula-version] ${result.issues.length} issue(s):`);
    for (const issue of result.issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[scientific-formula-version] OK: volume=${result.current.volumeV2}/L (${result.current.volumeVersion}), projection=${result.current.projectionVersion}, base=${baseRef}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
