import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const TEST_SUFFIXES = Object.freeze([
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  ".spec.tsx",
]);

/**
 * Contracts that are intentionally not co-located with the migration which
 * they protect. Keep this registry explicit so FAST never falls back to all
 * Vitest or all script tests for a small database change.
 */
export const MIGRATION_CONTRACT_REGISTRY = Object.freeze([
  Object.freeze({
    family: "action_registrations",
    migrationPattern: /action[_-]registrations/i,
    scriptTests: Object.freeze(["scripts/checks/action-registrations-contract.test.mjs"]),
  }),
  Object.freeze({
    family: "action_conversations",
    migrationPattern: /action[_-]conversations?/i,
    vitestTests: Object.freeze(["src/lib/chat/action-conversations-migration.test.ts"]),
  }),
  Object.freeze({
    family: "action_message_references",
    migrationPattern: /action[_-]message[_-]references?/i,
    vitestTests: Object.freeze(["src/lib/chat/action-message-reference-migration.test.ts"]),
  }),
  Object.freeze({
    family: "dm_inbox",
    migrationPattern: /dm[_-]inbox/i,
    vitestTests: Object.freeze(["src/lib/chat/dm-inbox-migration.test.ts"]),
  }),
  Object.freeze({
    family: "feedback_private_reply",
    migrationPattern: /feedback[_-]private[_-]reply/i,
    vitestTests: Object.freeze(["src/lib/chat/feedback-private-reply-migration.test.ts"]),
  }),
  Object.freeze({
    family: "territory_context",
    migrationPattern: /territory[_-]context/i,
    vitestTests: Object.freeze(["src/lib/supabase/territory-context-migration.test.ts"]),
  }),
  Object.freeze({
    family: "supabase_security_advisors",
    migrationPattern: /security|privileg|rls|advisor/i,
    vitestTests: Object.freeze(["src/lib/supabase/supabase-security-advisors.test.ts"]),
  }),
]);

function toRepositoryPath(file) {
  return path.join(REPOSITORY_ROOT, ...file.split("/"));
}

function isWebTestPath(file) {
  return /^apps\/web\/src\/.*\.(test|spec)\.(ts|tsx)$/.test(file);
}

function getSiblingCandidates(file) {
  const extension = path.extname(file);
  const source = file.slice(0, -extension.length);
  return TEST_SUFFIXES.map((suffix) => `${source}${suffix}`);
}

function fileExists(file, existingFiles) {
  if (existingFiles) return existingFiles.has(file);
  return fs.existsSync(toRepositoryPath(file));
}

/**
 * Resolve only co-located tests for changed Web sources. The optional file
 * set makes the resolver deterministic for planner tests and candidate views.
 */
export function resolveAssociatedWebTestFiles(changedFiles = [], { existingFiles } = {}) {
  const normalizedExisting = existingFiles
    ? new Set([...existingFiles].map((file) => String(file).replaceAll("\\", "/")))
    : undefined;
  const resolved = new Set();

  for (const rawFile of changedFiles) {
    const file = String(rawFile).replaceAll("\\", "/").replace(/^\.\//, "");
    if (!file.startsWith("apps/web/src/") || !/\.(ts|tsx)$/.test(file)) continue;
    if (isWebTestPath(file)) {
      if (fileExists(file, normalizedExisting)) {
        resolved.add(file.slice("apps/web/".length));
      }
      continue;
    }
    for (const candidate of getSiblingCandidates(file)) {
      if (fileExists(candidate, normalizedExisting)) {
        resolved.add(candidate.slice("apps/web/".length));
      }
    }
  }

  return [...resolved].sort();
}

export function resolveMigrationContracts(changedFiles = []) {
  const matched = new Map();
  for (const rawFile of changedFiles) {
    const file = String(rawFile).replaceAll("\\", "/").replace(/^\.\//, "");
    if (!file.startsWith("apps/web/supabase/migrations/")) continue;
    for (const entry of MIGRATION_CONTRACT_REGISTRY) {
      if (!entry.migrationPattern.test(file)) continue;
      const current = matched.get(entry.family) ?? {
        family: entry.family,
        scriptTests: new Set(),
        vitestTests: new Set(),
      };
      for (const testFile of entry.scriptTests ?? []) current.scriptTests.add(testFile);
      for (const testFile of entry.vitestTests ?? []) current.vitestTests.add(testFile);
      matched.set(entry.family, current);
    }
  }

  return [...matched.values()]
    .map((entry) => ({
      family: entry.family,
      scriptTests: [...entry.scriptTests].sort(),
      vitestTests: [...entry.vitestTests].sort(),
    }))
    .sort((left, right) => left.family.localeCompare(right.family));
}
