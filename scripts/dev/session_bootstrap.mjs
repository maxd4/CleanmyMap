import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REQUIRED = [
  "AGENTS.md",
  "project_context.md",
  "documentation/du/session/latest-session.md",
  "documentation/du/session/session_bootstrap.txt",
];

function mustExist(relativePath) {
  const absolutePath = join(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required bootstrap file: ${relativePath}`);
  }
}

for (const file of REQUIRED) {
  mustExist(file);
}

const bootstrapPrompt = readFileSync(
  join(ROOT, "documentation", "du", "session", "session_bootstrap.txt"),
  "utf8",
).trim();

console.log("Session bootstrap ready.");
console.log("Files checked: AGENTS.md, project_context.md, documentation/du/session/latest-session.md");
console.log(bootstrapPrompt);
