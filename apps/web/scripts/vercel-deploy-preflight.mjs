#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HOBBY_FUNCTION_LIMIT = 12;
const REQUIRED_IGNORE_ENTRIES = [".next/", "node_modules/", "artifacts/"];
const VALID_PLANS = new Set(["hobby", "pro", "enterprise", "unknown"]);

const scriptDirectory = resolve(fileURLToPath(import.meta.url), "..");

function repositoryRoot() {
  return resolve(scriptDirectory, "../../..");
}

function appRoot(repoRoot) {
  return join(repoRoot, "apps", "web");
}

function relativePath(repoRoot, pathname) {
  return relative(repoRoot, pathname).split("\\").join("/");
}

function collectSymbolicLinks(rootDirectory) {
  const links = [];

  function visit(directory) {
    if (!existsSync(directory)) {
      return;
    }

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const pathname = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        links.push(pathname);
        continue;
      }
      if (entry.isDirectory()) {
        visit(pathname);
      }
    }
  }

  visit(rootDirectory);
  return links;
}

function countOutputFunctions(functionsDirectory) {
  if (!existsSync(functionsDirectory)) {
    return 0;
  }

  return readdirSync(functionsDirectory, { withFileTypes: true }).filter(
    (entry) => entry.name.endsWith(".func") || entry.name.endsWith(".rsc.func"),
  ).length;
}

function findBuildOutput(repoRoot, appDirectory) {
  const candidates = [
    join(repoRoot, ".vercel", "output"),
    join(appDirectory, ".vercel", "output"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function readProjectSettings(appDirectory) {
  const projectPath = join(appDirectory, ".vercel", "project.json");
  if (!existsSync(projectPath)) {
    return { projectPath, settings: null };
  }

  try {
    const project = JSON.parse(readFileSync(projectPath, "utf8"));
    return { projectPath, settings: project.settings ?? null };
  } catch (error) {
    return { projectPath, settings: { parseError: error.message } };
  }
}

function findSensitivePlaceholders(repoRoot, appDirectory) {
  const candidates = [
    join(repoRoot, ".vercel", ".env.production.local"),
    join(appDirectory, ".vercel", ".env.production.local"),
  ];
  const envPath = candidates.find((candidate) => existsSync(candidate));
  if (!envPath) {
    return { envPath: candidates[0], keys: [] };
  }

  const keys = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("[SENSITIVE]"))
    .map((line) => line.slice(0, line.indexOf("=")).trim())
    .filter(Boolean);

  return { envPath, keys };
}

export function runPreflight({ repoRoot = repositoryRoot(), mode = "source", plan = "unknown" } = {}) {
  const resolvedRepoRoot = resolve(repoRoot);
  const resolvedAppRoot = appRoot(resolvedRepoRoot);
  const errors = [];
  const warnings = [];
  const checks = [];

  if (!new Set(["source", "prebuilt"]).has(mode)) {
    errors.push(`mode invalide: ${mode} (attendu: source ou prebuilt)`);
  }
  if (!VALID_PLANS.has(plan)) {
    errors.push(`plan invalide: ${plan} (attendu: hobby, pro, enterprise ou unknown)`);
  }

  const ignorePath = join(resolvedAppRoot, ".vercelignore");
  if (!existsSync(ignorePath)) {
    errors.push("apps/web/.vercelignore est absent");
  } else {
    const ignoreContents = readFileSync(ignorePath, "utf8");
    const missingEntries = REQUIRED_IGNORE_ENTRIES.filter((entry) => !ignoreContents.includes(entry));
    if (missingEntries.length > 0) {
      errors.push(`apps/web/.vercelignore ne couvre pas: ${missingEntries.join(", ")}`);
    } else {
      checks.push("apps/web/.vercelignore couvre les artefacts locaux");
    }
  }

  const { settings } = readProjectSettings(resolvedAppRoot);
  if (!settings) {
    errors.push("apps/web/.vercel/project.json est absent; le projet Vercel local n'est pas lié");
  } else if (settings.parseError) {
    errors.push(`apps/web/.vercel/project.json est illisible: ${settings.parseError}`);
  } else if (settings.rootDirectory !== "apps/web") {
    errors.push(`rootDirectory Vercel inattendu: ${settings.rootDirectory ?? "absent"} (attendu: apps/web)`);
  } else {
    checks.push("rootDirectory Vercel = apps/web");
  }

  if (!existsSync(join(resolvedAppRoot, "vercel.json"))) {
    errors.push("apps/web/vercel.json est absent");
  } else {
    checks.push("apps/web/vercel.json présent");
  }

  if (mode === "prebuilt") {
    const outputRoot = findBuildOutput(resolvedRepoRoot, resolvedAppRoot);
    if (!outputRoot) {
      errors.push(".vercel/output est absent; exécuter vercel build --prod avant le prebuilt");
    } else {
      const links = collectSymbolicLinks(outputRoot);
      if (links.length > 0) {
        errors.push(
          `${links.length} lien(s) symbolique(s) dans .vercel/output; utiliser le déploiement Git ou un runner Linux pour le prebuilt`,
        );
      } else {
        checks.push(".vercel/output ne contient aucun lien symbolique");
      }

      const functionCount = countOutputFunctions(join(outputRoot, "functions"));
      checks.push(`${functionCount} fonction(s) Vercel dans le prebuilt`);
      if (plan === "hobby" && functionCount > HOBBY_FUNCTION_LIMIT) {
        errors.push(
          `${functionCount} fonctions dépassent la limite Hobby de ${HOBBY_FUNCTION_LIMIT}; passer en Pro ou réduire la surface serveur`,
        );
      } else if (plan === "unknown" && functionCount > HOBBY_FUNCTION_LIMIT) {
        warnings.push(
          `${functionCount} fonctions détectées: le plan doit être confirmé avant un prebuilt (Hobby limite à ${HOBBY_FUNCTION_LIMIT})`,
        );
      }
    }

    const placeholderEnv = findSensitivePlaceholders(resolvedRepoRoot, resolvedAppRoot);
    if (placeholderEnv.keys.length > 0) {
      errors.push(
        `${relativePath(resolvedRepoRoot, placeholderEnv.envPath)} contient des placeholders [SENSITIVE] pour: ${placeholderEnv.keys.join(", ")}; ne pas utiliser ce fichier comme environnement de build`,
      );
    }
  }

  return { mode, plan, checks, warnings, errors, ok: errors.length === 0 };
}

function parseArguments(argv) {
  const options = { mode: "source", plan: process.env.VERCEL_PLAN?.trim().toLowerCase() || "unknown" };
  for (const argument of argv) {
    if (argument.startsWith("--mode=")) {
      options.mode = argument.slice("--mode=".length);
    } else if (argument.startsWith("--plan=")) {
      options.plan = argument.slice("--plan=".length).toLowerCase();
    }
  }
  return options;
}

function main() {
  const result = runPreflight(parseArguments(process.argv.slice(2)));
  console.log(`Préflight Vercel (${result.mode}, plan=${result.plan})`);
  for (const check of result.checks) console.log(`PASS  ${check}`);
  for (const warning of result.warnings) console.warn(`WARN  ${warning}`);
  for (const error of result.errors) console.error(`FAIL  ${error}`);
  process.exitCode = result.ok ? 0 : 1;
}

const currentFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  main();
}
