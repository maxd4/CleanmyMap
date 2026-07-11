import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const canonicalPath = path.join(
  repoRoot,
  ".codex",
  "skills",
  "cleanmymap-repo",
  "SKILL.md",
);

const mirrorPath = path.join(
  repoRoot,
  ".agents",
  "skills",
  "cleanmymap-repo",
  "SKILL.md",
);

for (const filePath of [canonicalPath, mirrorPath]) {
  if (!fs.existsSync(filePath)) {
    console.error(
      `Agent skill mirror check failed: missing ${path.relative(repoRoot, filePath)}`,
    );
    process.exit(1);
  }
}

const canonical = fs.readFileSync(canonicalPath);
const mirror = fs.readFileSync(mirrorPath);

if (!canonical.equals(mirror)) {
  console.error(
    [
      "Agent skill mirror check failed.",
      "These files must stay byte-identical because two agent runtimes consume them:",
      `- ${path.relative(repoRoot, canonicalPath)}`,
      `- ${path.relative(repoRoot, mirrorPath)}`,
      "",
      "Edit the canonical skill, copy it to the mirror, then rerun npm run check:agent-skills.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Agent skill mirror check passed.");
