import fs from "node:fs";

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

function listRootFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

const rootFiles = listRootFiles(repoRoot);
const forbidden = allowRootFileGeneration
  ? []
  : rootFiles.filter(
      (file) =>
        !allowedRootFiles.has(file) &&
        !temporaryLegacyRootFiles.has(file),
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

if (forbidden.length > 0) {
  console.error(
    [
      "Root file hygiene failed.",
      "The following files are not allowed at the repository root:",
      ...forbidden.map((file) => `- ${file}`),
      "",
      "Move them into artifacts/, documentation/, backups/, scripts/ or another explicit subfolder.",
      "Set ALLOW_ROOT_FILE_GENERATION=1 only for an explicit one-off request.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  `Root file hygiene OK (${rootFiles.length} files scanned${
    allowRootFileGeneration ? ", override enabled" : ""
  }).`,
);
