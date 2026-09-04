#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE_PATH = "apps/web/.env.local.example";
const ENV_TS_PATH = "apps/web/src/lib/env.ts";
const ENV_DTS_PATH = "apps/web/src/types/env.d.ts";

export const ENV_PLATFORM_ALLOWLIST = Object.freeze({
  CI: "CI runner flag",
  NODE_ENV: "Node.js runtime mode",
  PORT: "local tooling port",
  GIT_COMMIT_SHA: "deployment metadata",
  VERCEL: "Vercel platform flag",
  VERCEL_ENV: "Vercel deployment environment",
  "VERCEL_*": "Vercel deployment metadata",
  SENTRY_CLI_BIN: "Sentry build tooling override",
  SUPABASE_ACCESS_TOKEN: "Supabase CLI authentication",
  SUPABASE_DB_URL: "Supabase CLI database connection",
  POSTGRES_URL_NON_POOLING: "Supabase CLI database connection",
  DATABASE_URL: "local WebSocket tooling database connection",
});

const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|mjs)$/;

function isPlatformVariable(name) {
  return Object.hasOwn(ENV_PLATFORM_ALLOWLIST, name) || name.startsWith("VERCEL_");
}

function extractAssignmentKeys(source) {
  return new Set(
    source
      .split(/\r?\n/)
      .flatMap((line) => {
        const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);
        return match ? [match[1]] : [];
      }),
  );
}

function extractSchemaKeys(source) {
  const schema = source.match(/const envSchema\s*=\s*z\.object\(\{([\s\S]*?)\n\}\);/);
  if (!schema) return new Set();
  return new Set(
    [...schema[1].matchAll(/^\s{2}([A-Z][A-Z0-9_]*)\s*:/gm)].map((match) => match[1]),
  );
}

function extractProcessEnvKeys(source) {
  return new Set(
    [...source.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[["']([A-Z][A-Z0-9_]*)["']\])/g)]
      .map((match) => match[1] || match[2]),
  );
}

function extractProcessEnvFromView(view) {
  const keys = new Set();
  for (const filePath of view.listFiles("apps/web")) {
    if (!SOURCE_EXTENSIONS.test(filePath)) continue;
    for (const key of extractProcessEnvKeys(view.readText(filePath))) {
      keys.add(key);
    }
  }
  return keys;
}

function withoutPlatformVariables(keys) {
  return new Set([...keys].filter((key) => !isPlatformVariable(key)));
}

function sortedDifference(left, right) {
  return [...left].filter((key) => !right.has(key)).sort();
}

function compareSources(sources) {
  const applicationKeys = withoutPlatformVariables(
    new Set([...sources.template, ...sources.envTs, ...sources.envDts]),
  );
  const missing = Object.fromEntries(
    Object.entries({
      template: sources.template,
      envTs: sources.envTs,
      envDts: sources.envDts,
    }).map(([name, keys]) => [
      name,
      sortedDifference(applicationKeys, withoutPlatformVariables(keys)),
    ]),
  );
  const violations = Object.entries(missing)
    .filter(([, keys]) => keys.length > 0)
    .map(([source, keys]) => `${source} is missing: ${keys.join(", ")}`);
  const uncoveredProcessEnv = sortedDifference(
    withoutPlatformVariables(sources.processEnv),
    applicationKeys,
  );
  if (uncoveredProcessEnv.length > 0) {
    violations.push(`processEnv is not covered: ${uncoveredProcessEnv.join(", ")}`);
  }

  return {
    applicationKeys: [...applicationKeys].sort(),
    missing,
    uncoveredProcessEnv,
    violations,
  };
}

export function auditEnvContract({ templateSource, envTsSource, envDtsSource, processSources }) {
  const sources = {
    template: extractAssignmentKeys(templateSource),
    envTs: extractSchemaKeys(envTsSource),
    envDts: new Set(
      [...envDtsSource.matchAll(/^\s{4}([A-Z][A-Z0-9_]*)\??\s*:/gm)].map((match) => match[1]),
    ),
    processEnv: new Set(processSources.flatMap((source) => [...extractProcessEnvKeys(source.source)])),
  };
  const comparison = compareSources(sources);
  return {
    ok: comparison.violations.length === 0,
    applicationKeys: comparison.applicationKeys,
    sourceCounts: Object.fromEntries(
      Object.entries(sources).map(([name, keys]) => [name, keys.size]),
    ),
    missing: comparison.missing,
    uncoveredProcessEnv: comparison.uncoveredProcessEnv,
    violations: comparison.violations,
  };
}

function readRequired(view, relativePath) {
  if (!view.isFile(relativePath)) {
    throw new Error(`Missing environment contract file: ${relativePath}`);
  }
  return view.readText(relativePath);
}

export function auditRepositoryEnvContract(view) {
  const processSources = view
    .listFiles("apps/web")
    .filter((filePath) => SOURCE_EXTENSIONS.test(filePath))
    .map((filePath) => ({ path: filePath, source: view.readText(filePath) }));

  return auditEnvContract({
    templateSource: readRequired(view, TEMPLATE_PATH),
    envTsSource: readRequired(view, ENV_TS_PATH),
    envDtsSource: readRequired(view, ENV_DTS_PATH),
    processSources,
  });
}

function parseRoot(argv) {
  const rootArgument = argv.find((argument) => argument.startsWith("--root="));
  return rootArgument ? path.resolve(rootArgument.slice("--root=".length)) : REPO_ROOT;
}

export function main(argv = process.argv.slice(2)) {
  const ref = parseRepositoryRef(argv);
  const view = createRepositoryView({ root: parseRoot(argv), ref });
  const report = auditRepositoryEnvContract(view);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
