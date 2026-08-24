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
]);

const temporaryLegacyRootFiles = new Map([
  [
    "backlog-codex-permissions-admin-moderation-actions.md",
    "Backlog clôturé : déplacer vers documentation/plans/history/ après vérification de l'absorption des règles durables.",
  ],
  [
    "resize_homepage.js",
    "Script ponctuel : déplacer vers scripts/media/ ou supprimer après recherche des usages.",
  ],
  [
    "resize_image.ps1",
    "Script ponctuel : déplacer vers scripts/media/ ou supprimer après recherche des usages.",
  ],
  [
    "split.js",
    "Script ponctuel : déplacer vers scripts/maintenance/ ou supprimer après recherche des usages.",
  ],
]);

export const localOnlyTrackedPrefixes = [
  "backups/",
  "scratch/",
  ".codex-remote-attachments/",
];

function listRootFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
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
  const forbidden = allowRootFileGeneration
    ? []
    : rootFiles.filter(
        (file) =>
          !allowedRootFiles.has(file) &&
          !temporaryLegacyRootFiles.has(file),
      );
  const forbiddenTrackedPaths = findForbiddenTrackedPaths(
    listTrackedFiles(repoRoot),
  );

  const legacyPresent = rootFiles.filter((file) =>
    temporaryLegacyRootFiles.has(file),
  );

  if (legacyPresent.length > 0) {
    console.warn("Root file hygiene warning: temporary legacy files remain:");
    for (const file of legacyPresent) {
      console.warn(`- ${file}: ${temporaryLegacyRootFiles.get(file)}`);
    }
  }

  if (forbidden.length > 0 || forbiddenTrackedPaths.length > 0) {
    const messages = ["Root file hygiene failed."];
    if (forbidden.length > 0) {
      messages.push(
        "The following files are not allowed at the repository root:",
        ...forbidden.map((file) => `- ${file}`),
        "",
        "Move them into artifacts/, documentation/, backups/, scripts/ or another explicit subfolder.",
        "Set ALLOW_ROOT_FILE_GENERATION=1 only for an explicit one-off request.",
      );
    }
    if (forbiddenTrackedPaths.length > 0) {
      messages.push(
        "The following local-only files must not be tracked by Git:",
        ...forbiddenTrackedPaths.map((file) => `- ${file}`),
        "",
        "Keep backups/, scratch/ and .codex-remote-attachments/ local and ignored.",
        "Any exception must be explicitly documented before it is added to the allowlist.",
      );
    }
    console.error(messages.join("\n"));
    process.exit(1);
  }

  console.log(
    `Root file hygiene OK (${rootFiles.length} files scanned${
      allowRootFileGeneration ? ", override enabled" : ""
    }; no local-only tracked files).`,
  );
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  main();
}
