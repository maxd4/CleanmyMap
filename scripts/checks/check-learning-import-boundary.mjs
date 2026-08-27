import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const learningRoot = path.join(repositoryRoot, "apps/web/src/lib/learning");
const forbiddenDirectory = path.join(repositoryRoot, "apps/web/src/components/learn");

function listTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(entryPath);
    }
    return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function resolveRelativeImport(importerPath, specifier) {
  const resolved = path.resolve(path.dirname(importerPath), specifier);
  const candidates = [resolved, `${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, "index.ts")];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? resolved;
}

function isForbiddenImport(importerPath, specifier) {
  if (specifier === "@/components/learn" || specifier.startsWith("@/components/learn/")) {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const targetPath = resolveRelativeImport(importerPath, specifier);
  return targetPath === forbiddenDirectory || targetPath.startsWith(`${forbiddenDirectory}${path.sep}`);
}

const importPattern = /(?:from\s*["']|import\s*\(\s*["'])([^"']+)["']/g;
const violations = [];

for (const importerPath of listTypeScriptFiles(learningRoot)) {
  const source = fs.readFileSync(importerPath, "utf8");
  for (const match of source.matchAll(importPattern)) {
    if (isForbiddenImport(importerPath, match[1])) {
      violations.push(`${path.relative(repositoryRoot, importerPath)} -> ${match[1]}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Forbidden lib/learning -> components/learn imports:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("Learning import boundary check passed: lib/learning does not import components/learn.");
}
