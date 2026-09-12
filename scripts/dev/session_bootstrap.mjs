import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { sessionMemoryStatus } from "./update_session_memory.mjs";

const ROOT = process.cwd();
const REQUIRED = [
  "AGENTS.md",
  "documentation/sessions/project_context.md",
  "documentation/sessions/history/latest-session.md",
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

const sessionMemoryPath = join(ROOT, "documentation", "sessions", "history", "latest-session.md");
const sessionMemory = sessionMemoryStatus(readFileSync(sessionMemoryPath, "utf8"));
if (!sessionMemory.valid) {
  throw new Error(`Invalid session memory format: ${sessionMemory.errors.join("; ")}`);
}

const branch = execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim();
if (branch !== "main") {
  throw new Error(`MAIN_ONLY_SINGLE_WRITER requires branch main; found ${branch || "detached HEAD"}.`);
}

console.log("Session bootstrap ready.");
console.log("MODEL=MAIN-ONLY/SINGLE-WRITER");
console.log("BRANCH=main");
console.log(`SESSION_MEMORY=VALID updated=${sessionMemory.date}`);
if (sessionMemory.stale) {
  console.warn(`SESSION_MEMORY_STALE age_days=${sessionMemory.ageDays} threshold_days=14`);
}
console.log("Files verified:");
for (const file of REQUIRED) {
  console.log(`- ${file}`);
}
