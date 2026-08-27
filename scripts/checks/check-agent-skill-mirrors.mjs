import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const canonicalRoot = path.join(repoRoot, ".agents", "skills");
const mirrorRoot = path.join(repoRoot, ".codex", "skills");
const syncRequested = process.argv.includes("--sync");
const skippedDirectories = new Set([
  ".git",
  "node_modules",
]);

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

function findForbiddenCheckoutSkillArtifacts() {
  const allowedAgentRoots = new Set([
    path.resolve(repoRoot, ".agents"),
    path.resolve(repoRoot, ".codex"),
  ]);
  const violations = [];

  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(repoRoot, fullPath).split(path.sep).join("/");

      if (entry.name === "skills-lock.json") {
        violations.push(`${relativePath}: skills-lock.json inside the checkout`);
      }

      if (
        (entry.name === ".agents" || entry.name === ".codex") &&
        !allowedAgentRoots.has(path.resolve(fullPath))
      ) {
        violations.push(`${relativePath}: nested agent skill directory`);
      }

      if (
        entry.isDirectory() &&
        !skippedDirectories.has(entry.name)
      ) {
        visit(fullPath);
      }
    }
  };

  visit(repoRoot);
  return [...new Set(violations)].sort();
}

function syncSkill(skillName) {
  const canonicalSkillRoot = path.join(canonicalRoot, skillName);
  const mirrorSkillRoot = path.join(mirrorRoot, skillName);
  fs.rmSync(mirrorSkillRoot, { recursive: true, force: true });
  fs.cpSync(canonicalSkillRoot, mirrorSkillRoot, { recursive: true });
}

const mirrorSkills = listDirectories(mirrorRoot);
const failures = findForbiddenCheckoutSkillArtifacts();

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
  process.exit(1);
}

console.log(
  `Agent skill mirror check passed (${mirrorSkills.length} mirrored skills; canonical .agents/skills; mirror .codex/skills).`,
);
