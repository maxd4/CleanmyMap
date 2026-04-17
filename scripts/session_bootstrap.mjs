import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const FILES = [
  "AGENTS.md",
  "project_context.md",
  "DU/latest-session.md",
  "DU/session_bootstrap.txt",
];

function printFile(path) {
  if (!existsSync(path)) {
    console.log(`\n=== ${path} (missing) ===`);
    return;
  }
  const content = readFileSync(path, "utf8").trim();
  console.log(`\n=== ${path} ===`);
  console.log(content.length > 0 ? content : "(empty)");
}

console.log("Codex session bootstrap");
console.log("Read order: AGENTS -> project_context -> latest-session -> bootstrap prompt");

for (const relative of FILES) {
  printFile(join(ROOT, relative));
}
