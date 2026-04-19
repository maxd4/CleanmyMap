import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const candidateNextDirs = [resolve(process.cwd(), ".next")];

const mode = process.argv.includes("--prepare") ? "prepare" : "finalize";

function ensurePlaceholderManifest(pathname) {
  if (existsSync(pathname)) {
    return false;
  }
  writeFileSync(pathname, "{\n  \"version\": 1,\n  \"basePath\": \"\",\n  \"routes\": []\n}\n", "utf8");
  return true;
}

if (mode === "prepare") {
  let preparedCount = 0;
  for (const nextDir of candidateNextDirs) {
    try {
      mkdirSync(nextDir, { recursive: true });
      const targetPath = resolve(nextDir, "routes-manifest-deterministic.json");
      if (ensurePlaceholderManifest(targetPath)) {
        preparedCount += 1;
      }
    } catch {
      // Ignore unavailable target directories.
    }
  }
  console.log(`[build] preparation deterministic manifest: ${preparedCount} fichier(s) initialises.`);
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
