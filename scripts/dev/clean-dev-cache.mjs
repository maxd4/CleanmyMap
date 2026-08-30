import { readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");

async function discoverWebGeneratedTargets(root) {
  const webRoot = resolve(root, "apps/web");
  try {
    const entries = await readdir(webRoot, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          (entry.isDirectory() && entry.name.startsWith(".next-codex-")) ||
          (entry.isFile() && entry.name.endsWith(".tsbuildinfo")),
      )
      .map((entry) => resolve(webRoot, entry.name));
  } catch {
    return [];
  }
}

async function buildTargets(root) {
  return [
    resolve(root, "apps/.next"),
    resolve(root, "apps/web/.next"),
    resolve(root, ".turbo"),
    resolve(root, "apps/web/.turbo"),
    ...(await discoverWebGeneratedTargets(root)),
  ];
}

async function cleanDevCache({ root = repoRoot, logger = console.log } = {}) {
  const targets = await buildTargets(root);
  for (const target of targets) {
    try {
      await rm(target, { recursive: true, force: true, maxRetries: 2 });
      logger(`[dev-clean] Supprimé: ${target}`);
    } catch (error) {
      logger(`[dev-clean] Impossible de supprimer ${target}:`, error);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await cleanDevCache();
}

export { buildTargets, cleanDevCache };
