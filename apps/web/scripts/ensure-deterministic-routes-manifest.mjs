import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const candidateNextDirs = [resolve(process.cwd(), ".next")];

const mode = process.argv.includes("--prepare") ? "prepare" : "finalize";

function removeStaleDeterministicManifest(pathname) {
  if (!existsSync(pathname)) {
    return false;
  }
  rmSync(pathname, { force: true });
  return true;
}

if (mode === "prepare") {
  let preparedCount = 0;
  for (const nextDir of candidateNextDirs) {
    try {
      mkdirSync(nextDir, { recursive: true });
      const targetPath = resolve(nextDir, "routes-manifest-deterministic.json");
      if (removeStaleDeterministicManifest(targetPath)) {
        preparedCount += 1;
      }
    } catch {
      // Ignore unavailable target directories.
    }
  }
  console.log(`[build] preparation deterministic manifest: ${preparedCount} fichier(s) nettoyes.`);
  process.exit(0);
}

const sourcePath = candidateNextDirs.map((dir) => resolve(dir, "routes-manifest.json")).find((filePath) => existsSync(filePath));
if (!sourcePath) {
  console.warn("[build] routes-manifest.json introuvable, conservation du fallback deterministic.");
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

console.log(`[build] routes-manifest-deterministic.json finalise sur ${copiedCount} chemin(s).`);
