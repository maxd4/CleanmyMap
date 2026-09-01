#!/usr/bin/env node
import { resolve } from "node:path";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

const ROOT = resolve(".");

export function findLockfileViolations(view) {
  const tracked = view.listFiles();
  const rootLockfile = "package-lock.json";
  const allowedNestedLockfiles = new Set();
  const trackedLockfiles = tracked.filter(
    (path) => path.endsWith("/package-lock.json") || path === rootLockfile,
  );

  const invalidLockfiles = trackedLockfiles.filter(
    (path) => path !== rootLockfile && !allowedNestedLockfiles.has(path),
  );
  return {
    missingRoot: !tracked.includes(rootLockfile),
    invalidLockfiles,
  };
}

function main() {
  const ref = parseRepositoryRef();
  const view = createRepositoryView({ root: ROOT, ref });
  const violations = findLockfileViolations(view);
  if (violations.missingRoot) {
    console.error("[lockfile-policy] missing root package-lock.json");
    process.exit(1);
  }
  if (violations.invalidLockfiles.length > 0) {
    console.error("[lockfile-policy] unexpected nested lockfile(s):");
    for (const lockfile of violations.invalidLockfiles) {
      console.error(` - ${lockfile}`);
    }
    process.exit(1);
  }

  console.log(`[lockfile-policy] OK: root package-lock.json is the single source of truth${ref ? ` for ref ${ref}` : ""}.`);
}

main();
