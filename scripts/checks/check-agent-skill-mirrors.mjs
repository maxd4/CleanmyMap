#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

const repoRoot = process.cwd();
const canonicalRoot = ".agents/skills";
const mirrorRoot = ".codex/skills";
const args = process.argv.slice(2);
const syncRequested = args.includes("--sync");
const ref = parseRepositoryRef(args);

function listDirectories(view, root) {
  const prefix = `${root}/`;
  return [...new Set(view.listFiles(root)
    .filter((file) => file.startsWith(prefix))
    .map((file) => file.slice(prefix.length).split("/")[0]))].sort();
}

function listFiles(view, root) {
  const prefix = `${root}/`;
  return view.listFiles(root)
    .filter((file) => file.startsWith(prefix))
    .map((file) => file.slice(prefix.length))
    .sort();
}

function filesDiffer(view, canonicalSkillRoot, mirrorSkillRoot) {
  const canonicalFiles = listFiles(view, canonicalSkillRoot);
  const mirrorFiles = listFiles(view, mirrorSkillRoot);
  const allFiles = [...new Set([...canonicalFiles, ...mirrorFiles])].sort();
  const differences = [];

  if (canonicalFiles.join("\n") !== mirrorFiles.join("\n")) {
    differences.push("file list differs");
  }

  for (const relativeFile of allFiles) {
    const canonicalPath = `${canonicalSkillRoot}/${relativeFile}`;
    const mirrorPath = `${mirrorSkillRoot}/${relativeFile}`;
    if (!view.isFile(canonicalPath) || !view.isFile(mirrorPath)) {
      differences.push(relativeFile);
      continue;
    }

    if (!view.readBinary(canonicalPath).equals(view.readBinary(mirrorPath))) {
      differences.push(relativeFile);
    }
  }

  return differences;
}

function findForbiddenCheckoutSkillArtifacts(view) {
  const violations = [];
  const allowedAgentRoots = new Set([".agents", ".codex"]);

  for (const relativePath of view.listFiles()) {
    const parts = relativePath.split("/");
    if (parts.at(-1) === "skills-lock.json") {
      violations.push(`${relativePath}: skills-lock.json inside the checkout`);
    }

    for (const agentDirectory of [".agents", ".codex"]) {
      const index = parts.indexOf(agentDirectory);
      if (index >= 0 && !allowedAgentRoots.has(parts.slice(0, index + 1).join("/"))) {
        violations.push(`${parts.slice(0, index + 1).join("/")}: nested agent skill directory`);
      }
    }
  }

  return [...new Set(violations)].sort();
}

function syncSkill(skillName) {
  const canonicalSkillRoot = path.join(repoRoot, ".agents", "skills", skillName);
  const mirrorSkillRoot = path.join(repoRoot, ".codex", "skills", skillName);
  fs.rmSync(mirrorSkillRoot, { recursive: true, force: true });
  fs.cpSync(canonicalSkillRoot, mirrorSkillRoot, { recursive: true });
}

function main() {
  if (ref && syncRequested) {
    console.error("--sync is a mutator and is forbidden with --ref.");
    return 1;
  }

  const view = createRepositoryView({ root: repoRoot, ref });
  const failures = findForbiddenCheckoutSkillArtifacts(view);
  const mirrorSkills = listDirectories(view, mirrorRoot);

  if (mirrorSkills.length === 0) {
    failures.push("No Codex skill mirror directories found.");
  }

  for (const skillName of mirrorSkills) {
    const canonicalSkillRoot = `${canonicalRoot}/${skillName}`;
    const mirrorSkillRoot = `${mirrorRoot}/${skillName}`;

    if (!view.exists(canonicalSkillRoot)) {
      failures.push(`${skillName}: missing canonical skill under .agents/skills`);
      continue;
    }

    const differences = filesDiffer(view, canonicalSkillRoot, mirrorSkillRoot);
    if (differences.length > 0) {
      if (syncRequested) {
        syncSkill(skillName);
      } else {
        failures.push(`${skillName}: ${differences.join(", ")}`);
      }
    }
  }

  if (syncRequested) {
    const syncedView = createRepositoryView({ root: repoRoot });
    for (const skillName of mirrorSkills) {
      const remaining = filesDiffer(syncedView, `${canonicalRoot}/${skillName}`, `${mirrorRoot}/${skillName}`);
      if (remaining.length > 0) {
        failures.push(`${skillName}: sync incomplete (${remaining.join(", ")})`);
      }
    }
  }

  if (failures.length > 0) {
    console.error("Agent skill mirror check failed.");
    console.error("Canonical source: .agents/skills; governed Codex mirrors: .codex/skills.");
    if (failures.some((failure) => failure.includes("agent skill directory") || failure.includes("skills-lock.json"))) {
      console.error("Third-party/local skill installation detected inside the checkout.");
      console.error("Remove it and reinstall with `npx skills add <package> --global` outside the repository.");
      console.error("Supported user-level target: %USERPROFILE%\\.agents\\skills (the `skills` CLI global scope).");
    }
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    if (!syncRequested) {
      console.error("Run node scripts/checks/check-agent-skill-mirrors.mjs --sync after reviewing the canonical skills.");
    }
    return 1;
  }

  console.log(`Agent skill mirror check passed (${mirrorSkills.length} mirrored skills${ref ? ` for ref ${ref}` : ""}; canonical .agents/skills; mirror .codex/skills).`);
  return 0;
}

process.exitCode = main();
