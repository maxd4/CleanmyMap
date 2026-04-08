import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const nextDir = resolve(process.cwd(), ".next");
const sourcePath = resolve(nextDir, "routes-manifest.json");
const targetPath = resolve(nextDir, "routes-manifest-deterministic.json");

if (!existsSync(sourcePath)) {
  console.warn("[build] routes-manifest.json introuvable, rien a copier.");
  process.exit(0);
}

if (!existsSync(targetPath)) {
  copyFileSync(sourcePath, targetPath);
  console.log("[build] routes-manifest-deterministic.json cree.");
} else {
  console.log("[build] routes-manifest-deterministic.json deja present.");
}
