import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const candidateNextDirs = [
  resolve(process.cwd(), ".next"),
  resolve(process.cwd(), "..", ".next"),
  resolve(process.cwd(), "..", "..", ".next"),
];

const sourcePath = candidateNextDirs.map((dir) => resolve(dir, "routes-manifest.json")).find((filePath) => existsSync(filePath));

if (!sourcePath) {
  console.warn("[build] routes-manifest.json introuvable, rien a copier.");
  process.exit(0);
}

let copiedCount = 0;
for (const nextDir of candidateNextDirs) {
  const targetPath = resolve(nextDir, "routes-manifest-deterministic.json");
  try {
    mkdirSync(nextDir, { recursive: true });
    copyFileSync(sourcePath, targetPath);
    copiedCount += 1;
  } catch {
    // Ignore unavailable target directories.
  }
}

console.log(`[build] routes-manifest-deterministic.json genere sur ${copiedCount} chemin(s).`);
