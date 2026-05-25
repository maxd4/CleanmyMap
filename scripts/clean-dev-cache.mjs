import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const targets = [
  resolve(repoRoot, "apps/web/.next"),
  resolve(repoRoot, "apps/web/.turbo"),
];

for (const target of targets) {
  try {
    await rm(target, { recursive: true, force: true, maxRetries: 2 });
    console.log(`[dev-clean] Supprimé: ${target}`);
  } catch (error) {
    console.warn(`[dev-clean] Impossible de supprimer ${target}:`, error);
  }
}
