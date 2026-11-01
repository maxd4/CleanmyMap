#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const SCIENTIFIC_FORMULA_PATHS = Object.freeze({
  waste: "apps/web/src/lib/waste/cigarette-butts.ts",
  impact: "apps/web/src/lib/impact/impact-terrain-2026.ts",
  projection: "apps/web/src/lib/impact/scientific-projection-versions.ts",
  sqlDirectory: "apps/web/supabase/migrations",
});

const SQL_FUNCTION_PATTERN = /create\s+(?:or\s+replace\s+)?function\s+(public\.[a-z0-9_]+)\s*\(([^)]*)\)([\s\S]*?)\bas\s+\$([a-z0-9_]*)\$([\s\S]*?)\$\4\$/gi;

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

function normalizeSqlSignature(name, argumentsList) {
  return `${name.toLowerCase()}(${argumentsList.replace(/\s+/g, " ").trim().toLowerCase()})`;
}

export function extractSqlFunctionDefinitions(source, sourceName = "<inline>") {
  return [...String(source ?? "").matchAll(SQL_FUNCTION_PATTERN)].map((match) => ({
    signature: normalizeSqlSignature(match[1], match[2]),
    name: match[1].toLowerCase(),
    body: match[5],
    sourceName,
  }));
}

export function resolveEffectiveSqlFunctions(sqlSources) {
  const effective = new Map();
  for (const source of sqlSources ?? []) {
    for (const definition of extractSqlFunctionDefinitions(source.source, source.name)) {
      effective.set(definition.signature, definition);
    }
  }
  return [...effective.values()];
}

function stripSqlComments(source) {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\r\n]*/g, "");
}

function findActiveSqlVolumeCoefficientDuplicates(sqlFunctions) {
  return sqlFunctions.filter((definition) => {
    const body = stripSqlComments(definition.body);
    return /\b(?:600|700)\b/.test(body) &&
      /(?:\b[a-z0-9_]*volume_l\b|\bvolume\b|\bper[_ -]?liter\b|\blitre\b)/i.test(body);
  });
}

function readEffectiveSqlProjectionVersion(sqlFunctions) {
  const definition = sqlFunctions.find(
    (candidate) => candidate.signature === "public.current_public_impact_projection_version()",
  );
  return stripSqlComments(definition?.body ?? "").match(/select\s+'([^']+)'::text/i)?.[1] ?? null;
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
  const conversionResolutionPolicyVersion = resolveAssignment(
    assignments,
    "CIGARETTE_BUTTS_CONVERSION_RESOLUTION_POLICY_VERSION",
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
    conversionResolutionPolicyVersion,
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
  sqlSources,
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
  const effectiveSqlFunctions = resolveEffectiveSqlFunctions(
    sqlSources ?? (sqlSource === undefined ? [] : [{ name: "<inline>", source: sqlSource }]),
  );

  if (base && base.volumeV2 !== current.volumeV2 && base.volumeVersion === current.volumeVersion) {
    issues.push("volume factor changed without changing the effective volume conversion identity");
  }
  const massMethodChanged = base && (
    base.massV2Factors.join("|") !== current.massV2Factors.join("|") ||
    base.computeMassFormula !== current.computeMassFormula
  );
  if (base &&
    (base.volumeV2 !== current.volumeV2 || massMethodChanged) &&
    base.projectionVersion === current.projectionVersion) {
    issues.push("scientific factor changed without changing the public projection identity");
  }
  if (base &&
    (base.massV2Factors.join("|") !== current.massV2Factors.join("|") ||
      base.computeMassFormula !== current.computeMassFormula) &&
    base.massVersion === current.massVersion) {
    issues.push("mass factors or formula changed without changing the effective mass conversion identity");
  }
  if (base && base.lotFormula !== current.lotFormula &&
    base.volumeVersion === current.volumeVersion &&
    base.massVersion === current.massVersion &&
    base.conversionResolutionPolicyVersion === current.conversionResolutionPolicyVersion) {
    issues.push("lot conversion formula changed without changing an effective conversion identity");
  }

  const sqlProjectionVersion = readEffectiveSqlProjectionVersion(effectiveSqlFunctions);
  if (!sqlProjectionVersion) {
    issues.push("active SQL projection identity definition is missing");
  }
  if (sqlProjectionVersion !== current.projectionVersion) {
    issues.push(
      `SQL projection identity ${sqlProjectionVersion ?? "missing"} differs from TypeScript ${current.projectionVersion ?? "missing"}`,
    );
  }
  const duplicatedSqlDefinitions = findActiveSqlVolumeCoefficientDuplicates(effectiveSqlFunctions);
  if (duplicatedSqlDefinitions.length > 0) {
    issues.push(
      `active SQL must consume the projected action value, not duplicate the volume coefficient (${duplicatedSqlDefinitions.map((definition) => definition.sourceName).join(", ")})`,
    );
  }
  return {
    issues,
    base,
    current,
    sqlProjectionVersion,
    effectiveSqlFunctions,
    duplicatedSqlDefinitions,
  };
}

function gitShow(repositoryRoot, ref, file) {
  const result = spawnSync("git", ["show", `${ref}:${file}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout : null;
}

function readOption(argv, name) {
  const argumentIndex = argv.indexOf(name);
  if (argumentIndex < 0) return null;
  const value = argv[argumentIndex + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`[scientific-formula-version] ${name} requires a base Git reference.`);
  }
  return value;
}

function requireBaseValue(value, label) {
  if (!value || /^0+$/.test(value)) {
    throw new Error(`[scientific-formula-version] ${label} is required; refusing an unbased comparison.`);
  }
  return value;
}

export function resolveBaseRef({ argv = process.argv, env = process.env } = {}) {
  const explicit = readOption(argv, "--base-ref") || env.SCIENTIFIC_FORMULA_BASE_REF;
  if (explicit) return explicit;

  const eventName = env.SCIENTIFIC_FORMULA_EVENT_NAME || env.GITHUB_EVENT_NAME || "";
  if (eventName === "push") {
    return requireBaseValue(
      env.SCIENTIFIC_FORMULA_EVENT_BEFORE || env.EVENT_BEFORE || env.GITHUB_EVENT_BEFORE,
      "push event before SHA",
    );
  }
  if (eventName === "pull_request") {
    return requireBaseValue(
      env.SCIENTIFIC_FORMULA_PR_BASE_SHA || env.PR_BASE_SHA ||
        (env.GITHUB_BASE_REF ? `origin/${env.GITHUB_BASE_REF}` : ""),
      "pull request base SHA",
    );
  }
  if (eventName === "workflow_dispatch") {
    throw new Error("[scientific-formula-version] workflow_dispatch requires SCIENTIFIC_FORMULA_BASE_REF.");
  }
  if (eventName) {
    throw new Error(`[scientific-formula-version] unsupported GitHub event '${eventName}'.`);
  }

  if (env.GITHUB_BASE_REF) return `origin/${env.GITHUB_BASE_REF}`;

  // Local/manual fallback is deliberately the published branch, never HEAD^:
  // it covers all unpublished commits in one comparison.
  return "origin/main";
}

function resolveCandidateRef({ argv = process.argv, env = process.env } = {}) {
  return readOption(argv, "--candidate-ref") ||
    env.SCIENTIFIC_FORMULA_CANDIDATE_SHA ||
    env.GITHUB_SHA ||
    null;
}

function gitRevision(repositoryRoot, ref) {
  const result = spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function readSqlSources(repositoryRoot) {
  const directory = path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.sqlDirectory);
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({
      name: file,
      source: readFileSync(path.join(directory, file), "utf8"),
    }));
}

function readCurrentWasteSource(repositoryRoot) {
  const primaryPath = path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.waste);
  const enginePath = path.join(
    repositoryRoot,
    "apps/web/src/lib/waste/cigarette-butts-engine.ts",
  );
  const primarySource = readFileSync(primaryPath, "utf8");
  return existsSync(enginePath)
    ? `${primarySource}\n${readFileSync(enginePath, "utf8")}`
    : primarySource;
}

function main() {
  const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
  const currentWasteSource = readCurrentWasteSource(repositoryRoot);
  const currentImpactSource = readFileSync(
    path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.impact),
    "utf8",
  );
  const currentProjectionSource = readFileSync(
    path.join(repositoryRoot, SCIENTIFIC_FORMULA_PATHS.projection),
    "utf8",
  );
  const sqlSources = readSqlSources(repositoryRoot);
  const baseRef = resolveBaseRef();
  const candidateRef = resolveCandidateRef();
  if (candidateRef) {
    const currentRevision = gitRevision(repositoryRoot, "HEAD");
    const candidateRevision = gitRevision(repositoryRoot, candidateRef);
    if (!candidateRevision || currentRevision !== candidateRevision) {
      throw new Error(
        `[scientific-formula-version] candidate revision ${candidateRef} is unavailable or does not match the checked-out candidate.`,
      );
    }
  }
  const baseFiles = Object.entries(SCIENTIFIC_FORMULA_PATHS)
    .filter(([key]) => key !== "sqlDirectory")
    .map(([key, file]) => [key, gitShow(repositoryRoot, baseRef, file)]);
  const missingBaseFiles = baseFiles.filter(([, source]) => source === null).map(([key]) => key);
  if (missingBaseFiles.length > 0) {
    throw new Error(
      `[scientific-formula-version] base Git reference '${baseRef}' is unavailable for: ${missingBaseFiles.join(", ")}.`,
    );
  }
  const baseSources = Object.fromEntries(baseFiles);
  const result = validateScientificFormulaIdentity({
    baseWasteSource: baseSources.waste,
    currentWasteSource,
    baseImpactSource: baseSources.impact,
    currentImpactSource,
    projectionSource: {
      base: baseSources.projection,
      current: currentProjectionSource,
    },
    sqlSources,
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
