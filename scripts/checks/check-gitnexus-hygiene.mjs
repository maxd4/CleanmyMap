#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

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
  { gitNexusIgnored = isGitNexusIgnored, view = null } = {},
) {
  const violations = [];
  const repositoryView = view ?? createRepositoryView({ root: repoRoot });

  if (repositoryView.exists("AGENTS.md")) {
    const agentsContent = repositoryView.readText("AGENTS.md");
    const foundMarkers = generatedMarkers.filter((marker) => agentsContent.includes(marker));
    if (foundMarkers.length > 0) {
      violations.push(
        `AGENTS.md contains forbidden GitNexus generated markers: ${foundMarkers.join(", ")}`,
      );
    }
  }

  if (repositoryView.exists("CLAUDE.md")) {
    violations.push("CLAUDE.md at the repository root is forbidden; GitNexus must not generate it.");
  }

  if (repositoryView.exists(".claude/skills/gitnexus")) {
    violations.push(".claude/skills/gitnexus/ is forbidden; keep GitNexus skills outside the repository.");
  }

  const ignored = view
    ? /(?:^|\r?\n)\s*\/?\.gitnexus\/?\s*(?:#.*)?$/m.test(
        repositoryView.exists(".gitignore") ? repositoryView.readText(".gitignore") : "",
      ) && !repositoryView.listFiles(".gitnexus").length
    : gitNexusIgnored(repoRoot);
  if (!ignored) {
    violations.push(".gitnexus/ must remain local and ignored by Git.");
  }

  return violations;
}

export function main(repoRoot = defaultRepoRoot) {
  const ref = parseRepositoryRef();
  const view = createRepositoryView({ root: repoRoot, ref });
  const violations = findGitNexusHygieneViolations(repoRoot, { view });
  if (violations.length > 0) {
    console.error("GitNexus hygiene check failed.");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    return 1;
  }

  console.log(`GitNexus hygiene check passed${ref ? ` for ref ${ref}` : ""} (.gitnexus/ is local and ignored; no generated governance artifacts found).`);
  return 0;
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  process.exitCode = main();
}
