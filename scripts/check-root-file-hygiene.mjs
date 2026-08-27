import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = process.cwd();
const allowRootFileGeneration = process.env.ALLOW_ROOT_FILE_GENERATION === "1";

const allowedRootFiles = new Set([
  ".aLANCER_SITE_LOCAL_ROLE_BENEVOLE.bat",
  ".aLANCER_SITE_LOCAL_ROLE_MAX.bat",
  ".codexignore",
  ".cursorrules",
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
  ".vercelignore",
  "AGENTS.md",
  "AUTHORS.md",
  "COMMANDES_UTILISATEUR.md",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "PRE_PUSH_GUARD.md",
  "README.md",
  "SECURITY.md",
  "UBIQUITOUS_LANGUAGE.md",
]);

export const trackedCanonicalRootDirectories = [
  ".agents",
  ".artifacts",
  ".codex",
  ".devcontainer",
  ".githooks",
  ".github",
  ".kiro",
  ".vscode",
  "apps",
  "documentation",
  "e2e",
  "maintenance",
  "scripts",
  "supabase",
];

export const trackedTransitionalRootDirectories = [];

export const localOnlyRootDirectories = [
  "artifacts",
  "backups",
  "scratch",
  ".gitnexus",
  ".playwright-mcp",
  ".vercel",
  ".codex-remote-attachments",
  "node_modules",
];

const repositoryInternalRootDirectories = [".git"];

export const allowedRootDirectories = [
  ...trackedCanonicalRootDirectories,
  ...trackedTransitionalRootDirectories,
  ...localOnlyRootDirectories,
  ...repositoryInternalRootDirectories,
];

export const localOnlyTrackedPrefixes = localOnlyRootDirectories.map(
  (directory) => `${directory}/`,
);

function listRootFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function listRootDirectories(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function findForbiddenRootDirectories(rootDirectories) {
  const allowed = new Set(allowedRootDirectories);
  return rootDirectories
    .filter((directory) => !allowed.has(directory))
    .sort();
}

export function findForbiddenTrackedPaths(trackedFiles) {
  return trackedFiles.filter((file) =>
    localOnlyTrackedPrefixes.some((prefix) => file.startsWith(prefix)),
  );
}

function listTrackedFiles(directory) {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: directory,
    encoding: "buffer",
  })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function main() {
  const rootFiles = listRootFiles(repoRoot);
  const rootDirectories = listRootDirectories(repoRoot);
  const forbidden = allowRootFileGeneration
    ? []
    : rootFiles.filter(
        (file) =>
          !allowedRootFiles.has(file),
      );
  const forbiddenRootDirectories = findForbiddenRootDirectories(rootDirectories);
  const forbiddenTrackedPaths = findForbiddenTrackedPaths(
    listTrackedFiles(repoRoot),
  );

  if (
    forbidden.length > 0 ||
    forbiddenRootDirectories.length > 0 ||
    forbiddenTrackedPaths.length > 0
  ) {
    const messages = ["Root file and directory hygiene failed."];
    if (forbidden.length > 0) {
      messages.push(
        "The following files are not allowed at the repository root:",
        ...forbidden.map((file) => `- ${file}`),
        "",
        "Move them into artifacts/, documentation/, backups/, scripts/ or another explicit subfolder.",
        "Set ALLOW_ROOT_FILE_GENERATION=1 only for an explicit one-off request.",
      );
    }
    if (forbiddenRootDirectories.length > 0) {
      messages.push(
        "The following directories are not allowed at the repository root:",
        ...forbiddenRootDirectories.map((directory) => `- ${directory}`),
        "",
        "Use one of the declared canonical, transitional or local-only root directories.",
      );
    }
    if (forbiddenTrackedPaths.length > 0) {
      messages.push(
        "The following local-only paths must not be tracked by Git:",
        ...forbiddenTrackedPaths.map((file) => `- ${file}`),
        "",
        "Keep local-only root directories local and ignored; .artifacts/ is reserved for versioned evidence.",
        "Any exception must be explicitly documented before it is added to the allowlist.",
      );
    }
    console.error(messages.join("\n"));
    process.exit(1);
  }

  console.log(
    `Root file and directory hygiene OK (${rootFiles.length} files and ${rootDirectories.length} directories scanned${
      allowRootFileGeneration ? ", file override enabled" : ""
    }; no unknown directories or local-only tracked paths).`,
  );
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  main();
}
