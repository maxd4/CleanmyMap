import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const allowRootFileGeneration = process.env.ALLOW_ROOT_FILE_GENERATION === "1";

const allowedRootFiles = new Set([
  ".codexignore",
  ".cursorrules",
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
  ".vercelignore",
  "AGENTS.md",
  "package-lock.json",
  "package.json",
  "PRE_PUSH_GUARD.md",
  "README.md",
  "resize_homepage.js",
  "resize_image.ps1",
]);

function listRootFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

const rootFiles = listRootFiles(repoRoot);
const forbidden = allowRootFileGeneration
  ? []
  : rootFiles.filter((file) => !allowedRootFiles.has(file) && !file.toLowerCase().endsWith(".bat"));

if (forbidden.length > 0) {
  console.error(
    [
      "Root file hygiene failed.",
      "The following files are not allowed at the repository root:",
      ...forbidden.map((file) => `- ${file}`),
      "",
      "Move them into artifacts/, documentation/, backups/ or an explicit subfolder.",
      "Set ALLOW_ROOT_FILE_GENERATION=1 only for an explicit one-off request.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  `Root file hygiene OK (${rootFiles.length} files scanned${allowRootFileGeneration ? ", override enabled" : ""}).`,
);
