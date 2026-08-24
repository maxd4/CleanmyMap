import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const canonicalRoot = path.join(repoRoot, ".agents", "skills");
const mirrorRoot = path.join(repoRoot, ".codex", "skills");
const syncRequested = process.argv.includes("--sync");

function listDirectories(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        files.push(path.relative(root, fullPath).split(path.sep).join("/"));
      }
    }
  };

  visit(root);
  return files.sort();
}

function filesDiffer(canonicalSkillRoot, mirrorSkillRoot) {
  const canonicalFiles = listFiles(canonicalSkillRoot);
  const mirrorFiles = listFiles(mirrorSkillRoot);
  const allFiles = [...new Set([...canonicalFiles, ...mirrorFiles])].sort();
  const differences = [];

  if (canonicalFiles.join("\n") !== mirrorFiles.join("\n")) {
    differences.push("file list differs");
  }

  for (const relativeFile of allFiles) {
    const canonicalPath = path.join(canonicalSkillRoot, relativeFile);
    const mirrorPath = path.join(mirrorSkillRoot, relativeFile);
    if (!fs.existsSync(canonicalPath) || !fs.existsSync(mirrorPath)) {
      differences.push(relativeFile);
      continue;
    }

    if (!fs.readFileSync(canonicalPath).equals(fs.readFileSync(mirrorPath))) {
      differences.push(relativeFile);
    }
  }

  return differences;
}

function syncSkill(skillName) {
  const canonicalSkillRoot = path.join(canonicalRoot, skillName);
  const mirrorSkillRoot = path.join(mirrorRoot, skillName);
  fs.rmSync(mirrorSkillRoot, { recursive: true, force: true });
  fs.cpSync(canonicalSkillRoot, mirrorSkillRoot, { recursive: true });
}

const mirrorSkills = listDirectories(mirrorRoot);
const failures = [];

if (mirrorSkills.length === 0) {
  failures.push("No Codex skill mirror directories found.");
}

for (const skillName of mirrorSkills) {
  const canonicalSkillRoot = path.join(canonicalRoot, skillName);
  const mirrorSkillRoot = path.join(mirrorRoot, skillName);

  if (!fs.existsSync(canonicalSkillRoot)) {
    failures.push(`${skillName}: missing canonical skill under .agents/skills`);
    continue;
  }

  const differences = filesDiffer(canonicalSkillRoot, mirrorSkillRoot);
  if (differences.length > 0) {
    if (syncRequested) {
      syncSkill(skillName);
    } else {
      failures.push(`${skillName}: ${differences.join(", ")}`);
    }
  }
}

if (syncRequested) {
  for (const skillName of mirrorSkills) {
    const canonicalSkillRoot = path.join(canonicalRoot, skillName);
    if (fs.existsSync(canonicalSkillRoot)) {
      const remaining = filesDiffer(canonicalSkillRoot, path.join(mirrorRoot, skillName));
      if (remaining.length > 0) {
        failures.push(`${skillName}: sync incomplete (${remaining.join(", ")})`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Agent skill mirror check failed.");
  console.error(
    "Canonical source: .agents/skills; governed Codex mirrors: .codex/skills.",
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (!syncRequested) {
    console.error("Run node scripts/check-agent-skill-mirrors.mjs --sync after reviewing the canonical skills.");
  }
  process.exit(1);
}

console.log(
  `Agent skill mirror check passed (${mirrorSkills.length} mirrored skills; canonical .agents/skills; mirror .codex/skills).`,
);
