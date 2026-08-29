import { existsSync } from "node:fs";
import { join } from "node:path";

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

console.log("Session bootstrap ready.");
console.log("Files verified:");
for (const file of REQUIRED) {
  console.log(`- ${file}`);
}
