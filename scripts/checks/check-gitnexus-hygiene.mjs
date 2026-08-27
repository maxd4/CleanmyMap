#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generatedMarkers = [
  "<!-- gitnexus:start -->",
  "<!-- gitnexus:end -->",
];

export function isGitNexusIgnored(repoRoot) {
  const result = spawnSync(
    "git",
    ["check-ignore", "--no-index", "--quiet", "--", ".gitnexus/"],
    {
      cwd: repoRoot,
      stdio: "ignore",
      windowsHide: true,
    },
  );

  return result.status === 0;
}

export function findGitNexusHygieneViolations(
  repoRoot = defaultRepoRoot,
  { gitNexusIgnored = isGitNexusIgnored } = {},
) {
  const violations = [];
  const agentsPath = path.join(repoRoot, "AGENTS.md");

  if (fs.existsSync(agentsPath)) {
    const agentsContent = fs.readFileSync(agentsPath, "utf8");
    const foundMarkers = generatedMarkers.filter((marker) => agentsContent.includes(marker));
    if (foundMarkers.length > 0) {
      violations.push(
        `AGENTS.md contains forbidden GitNexus generated markers: ${foundMarkers.join(", ")}`,
      );
    }
  }

  if (fs.existsSync(path.join(repoRoot, "CLAUDE.md"))) {
    violations.push("CLAUDE.md at the repository root is forbidden; GitNexus must not generate it.");
  }

  if (fs.existsSync(path.join(repoRoot, ".claude", "skills", "gitnexus"))) {
    violations.push(".claude/skills/gitnexus/ is forbidden; keep GitNexus skills outside the repository.");
  }

  if (!gitNexusIgnored(repoRoot)) {
    violations.push(".gitnexus/ must remain local and ignored by Git.");
  }

  return violations;
}

export function main(repoRoot = defaultRepoRoot) {
  const violations = findGitNexusHygieneViolations(repoRoot);
  if (violations.length > 0) {
    console.error("GitNexus hygiene check failed.");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    return 1;
  }

  console.log("GitNexus hygiene check passed (.gitnexus/ is local and ignored; no generated governance artifacts found).");
  return 0;
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  process.exitCode = main();
}
