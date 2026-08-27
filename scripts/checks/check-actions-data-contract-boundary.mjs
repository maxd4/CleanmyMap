import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const dataContractPath = path.join(
  repositoryRoot,
  "apps/web/src/lib/actions/data-contract.ts",
);
const actionsRoot = path.join(repositoryRoot, "apps/web/src/lib/actions");
const forbiddenReexports = [
  "impact-calculators",
  "geometry/geometry-presentation",
  "operational-context",
  "/pollution/",
];

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }
    return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

const violations = [];
const dataContractSource = fs.readFileSync(dataContractPath, "utf8");

if (/\bexport\s+\*/.test(dataContractSource)) {
  violations.push("data-contract.ts must not contain export *");
}

for (const forbiddenModule of forbiddenReexports) {
  if (dataContractSource.includes(forbiddenModule)) {
    violations.push(`data-contract.ts must not re-export ${forbiddenModule}`);
  }
}

for (const sourcePath of collectSourceFiles(actionsRoot)) {
  if (path.basename(sourcePath) === "data-contract.test.ts") {
    continue;
  }
  const source = fs.readFileSync(sourcePath, "utf8");
  source.split(/\r?\n/).forEach((line, index) => {
    if (
      /(?:from\s*["'][^"']*data-contract|import\s*\(\s*["'][^"']*data-contract)/.test(
        line,
      )
    ) {
      violations.push(
        `${path.relative(repositoryRoot, sourcePath)}:${index + 1} imports the public data-contract facade`,
      );
    }
  });
}

if (violations.length > 0) {
  console.error("Actions data-contract boundary check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    "Actions data-contract boundary check passed: narrow facade and direct internal imports are enforced.",
  );
}
