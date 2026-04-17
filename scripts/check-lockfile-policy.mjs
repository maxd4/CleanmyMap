#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function main() {
  const tracked = listTrackedFiles().filter((path) =>
    existsSync(resolve(ROOT, path)),
  );
  const rootLockfile = "package-lock.json";
  const trackedLockfiles = tracked.filter((path) => path.endsWith("/package-lock.json") || path === rootLockfile);

  if (!tracked.includes(rootLockfile)) {
    console.error("[lockfile-policy] missing root package-lock.json");
    process.exit(1);
  }

  const invalidLockfiles = trackedLockfiles.filter((path) => path !== rootLockfile);
  if (invalidLockfiles.length > 0) {
    console.error("[lockfile-policy] unexpected nested lockfile(s):");
    for (const path of invalidLockfiles) {
      console.error(` - ${path}`);
    }
    process.exit(1);
  }

  console.log("[lockfile-policy] OK: root package-lock.json is the single source of truth.");
}

main();
