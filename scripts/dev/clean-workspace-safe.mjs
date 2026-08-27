#!/usr/bin/env node
import { existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");

const CATALOG = [
  {
    path: "apps/web/.next",
    category: "PRESERVE_WARM",
    regenerate: "npm run dev -w apps/web",
    note: "Cache Next utile au démarrage local.",
  },
  {
    path: "apps/web/.next-sourcemap-test",
    category: "UNKNOWN_KEEP",
    regenerate: "Non prouvée dans le dépôt.",
    note: "Aucun producteur explicite n'est prouvé ici.",
  },
  {
    path: "apps/web/node_modules",
    category: "PRESERVE_WARM",
    regenerate: "npm install -w apps/web",
    note: "Dépendances du workspace web.",
  },
  {
    path: "node_modules",
    category: "PRESERVE_WARM",
    regenerate: "npm install",
    note: "Dépendances racine du monorepo.",
  },
  {
    path: "apps/mobile/node_modules",
    category: "PRESERVE_WARM",
    regenerate: "npm install -w apps/mobile",
    note: "Dépendances du workspace mobile, à conserver même si isolées du flux quotidien.",
  },
  {
    path: "artifacts",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon la catégorie",
    note: "Sorties locales CleanMyMap; le dossier ne doit jamais être supprimé globalement.",
  },
  {
    path: "artifacts/audits",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon l'audit",
    note: "Rapports d'audit locaux, à conserver sauf nettoyage ciblé explicite.",
  },
  {
    path: "artifacts/backups",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon le backup",
    note: "Backups locaux; aucune suppression implicite par le nettoyage workspace.",
  },
  {
    path: "artifacts/exports",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon l'export",
    note: "Exports locaux pouvant contenir des données utiles ou sensibles.",
  },
  {
    path: "artifacts/logs",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon le producteur",
    note: "Logs locaux; conserver la provenance et éviter toute suppression globale.",
  },
  {
    path: "artifacts/playwright",
    category: "PRESERVE_PROJECT",
    regenerate: "npm run test:e2e",
    note: "Sorties Playwright centralisées; sous-dossiers report et results sont régénérables séparément.",
  },
  {
    path: "artifacts/playwright/report",
    category: "REGENERABLE_SAFE",
    regenerate: "npm run test:e2e",
    note: "Rapport HTML Playwright régénérable.",
  },
  {
    path: "artifacts/playwright/results",
    category: "REGENERABLE_SAFE",
    regenerate: "npm run test:e2e",
    note: "Résultats, traces et captures Playwright régénérables.",
  },
  {
    path: "artifacts/qa",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon la validation QA",
    note: "Sorties QA locales; conservation par défaut.",
  },
  {
    path: "artifacts/screenshots",
    category: "PRESERVE_PROJECT",
    regenerate: "npm run screenshots:screen ou npm run screenshots",
    note: "Captures locales centralisées; conservation par défaut.",
  },
  {
    path: "backups",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon le backup",
    note: "Emplacement legacy local-only; aucun nouveau producteur ne doit y écrire.",
  },
  {
    path: "scratch",
    category: "PRESERVE_PROJECT",
    regenerate: "Variable selon le script",
    note: "Contient des scripts ponctuels utiles.",
  },
  {
    path: ".vercel",
    category: "PRESERVE_PROJECT",
    regenerate: "vercel link",
    note: "Liaison Vercel locale et configuration de preview.",
  },
  {
    path: "artifacts/supabase/quota-audit",
    category: "REGENERABLE_SAFE",
    regenerate: "npm run backend:supabase:quota-audit -w apps/web",
    note: "Rapport d'audit Supabase archivé.",
  },
];

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    apply: flags.has("--apply"),
    dryRun: !flags.has("--apply"),
    verbose: flags.has("--verbose"),
  };
}

function ensureInsideRepo(targetPath, root = repoRoot) {
  const resolved = resolve(root, targetPath);
  if (resolved === root) {
    throw new Error(`Refusing to target the repository root: ${targetPath}`);
  }

  const relativePath = relative(root, resolved);
  if (relativePath.startsWith("..") || relativePath === "" || relativePath.includes(":")) {
    throw new Error(`Path escapes the repository: ${targetPath}`);
  }

  return resolved;
}

function sizeOfPath(targetPath) {
  if (!existsSync(targetPath)) {
    return 0;
  }

  const stats = lstatSync(targetPath);
  if (stats.isSymbolicLink()) {
    return 0;
  }

  if (stats.isFile()) {
    return stats.size;
  }

  if (!stats.isDirectory()) {
    return 0;
  }

  let total = 0;
  for (const entry of readdirSync(targetPath, { withFileTypes: true })) {
    total += sizeOfPath(resolve(targetPath, entry.name));
  }
  return total;
}

function formatSize(bytes) {
  if (bytes === 0) {
    return "0.00 MB";
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function loadTrackedPaths(root = repoRoot) {
  const gitDirectory = resolve(root, ".git");
  if (!existsSync(gitDirectory)) {
    return new Set();
  }

  try {
    const output = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(
      output
        .split("\0")
        .map((entry) => entry.trim().replaceAll("\\", "/"))
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function isTracked(relativePath, trackedPaths) {
  if (!trackedPaths || trackedPaths.size === 0) {
    return false;
  }

  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (trackedPaths.has(normalized)) {
    return true;
  }

  const prefix = normalized.endsWith("/") ? normalized : `${normalized}/`;
  for (const trackedPath of trackedPaths) {
    if (trackedPath.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

function deleteTarget(targetPath) {
  rmSync(targetPath, { recursive: true, force: true });
}

function runWorkspaceCleanup({
  catalog = CATALOG,
  apply = false,
  verbose = false,
  currentRepoRoot = repoRoot,
  logger = console.log,
} = {}) {
  const trackedPaths = loadTrackedPaths(currentRepoRoot);
  const rows = [];
  let totalExistingBytes = 0;
  let totalDeletableBytes = 0;
  let deletableCount = 0;

  for (const entry of catalog) {
    const resolvedPath = ensureInsideRepo(entry.path, currentRepoRoot);
    const exists = existsSync(resolvedPath);
    const tracked = isTracked(entry.path, trackedPaths);
    const sizeBytes = exists ? sizeOfPath(resolvedPath) : 0;
    const deletable = entry.category === "REGENERABLE_SAFE";
    if (exists) {
      totalExistingBytes += sizeBytes;
    }
    if (deletable && exists) {
      totalDeletableBytes += sizeBytes;
      deletableCount += 1;
    }

    rows.push({
      path: entry.path,
      category: entry.category,
      exists,
      tracked,
      size: formatSize(sizeBytes),
      regenerate: entry.regenerate,
      note: entry.note,
      action: deletable ? (apply ? (exists ? "delete" : "skip-missing") : "dry-run") : "preserve",
    });
  }

  logger(`[clean-workspace-safe] mode=${apply ? "apply" : "dry-run"}`);
  logger(`[clean-workspace-safe] repo=${currentRepoRoot}`);
  logger(`[clean-workspace-safe] total reviewed=${formatSize(totalExistingBytes)}`);
  logger(`[clean-workspace-safe] total deletable=${formatSize(totalDeletableBytes)} across ${deletableCount} target(s)`);
  logger("");

  for (const row of rows) {
    logger(
      [
        row.path.padEnd(38),
        row.category.padEnd(17),
        `exists=${String(row.exists).padEnd(5)}`,
        `tracked=${String(row.tracked).padEnd(5)}`,
        `size=${row.size.padEnd(10)}`,
        `action=${row.action}`,
      ].join(" | "),
    );
    if (verbose) {
      logger(`  regenerate: ${row.regenerate}`);
      logger(`  note: ${row.note}`);
    }
  }

  if (!apply) {
    return { rows, totalExistingBytes, totalDeletableBytes, deletableCount };
  }

  for (const entry of catalog.filter((item) => item.category === "REGENERABLE_SAFE")) {
    const resolvedPath = ensureInsideRepo(entry.path, currentRepoRoot);
    if (!existsSync(resolvedPath)) {
      continue;
    }
    deleteTarget(resolvedPath);
    logger(`[clean-workspace-safe] deleted ${entry.path}`);
  }

  logger("[clean-workspace-safe] done");
  return { rows, totalExistingBytes, totalDeletableBytes, deletableCount };
}

function main() {
  const options = parseArgs(process.argv);
  runWorkspaceCleanup({ apply: options.apply, verbose: options.verbose });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}

export { CATALOG, ensureInsideRepo, formatSize, parseArgs, runWorkspaceCleanup, sizeOfPath };
