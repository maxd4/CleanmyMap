import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const reportModelRoot = path.join(repositoryRoot, "apps/web/src/lib/reports/report-model");
const indexPath = path.join(reportModelRoot, "index.ts");
const removedLegacyPaths = [
  path.join(repositoryRoot, "apps/web/src/components/reports/web-document/analytics"),
  path.join(repositoryRoot, "apps/web/src/components/reports/web-document/types.ts"),
];
const expectedPublicIndex = `export { computeReportModel } from "./compute-report-model";

export type {
  ReportModel,
  ReportModelInput,
  ReportModerationAvailability,
} from "./types";
`;

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, "");
}

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
for (const legacyPath of removedLegacyPaths) {
  if (fs.existsSync(legacyPath)) {
    violations.push(
      `${path.relative(repositoryRoot, legacyPath)} is a removed Report Model legacy path and must not return`,
    );
  }
}

const indexSource = fs.readFileSync(indexPath, "utf8");
if (normalizeWhitespace(indexSource) !== normalizeWhitespace(expectedPublicIndex)) {
  violations.push(
    "report-model/index.ts must expose exactly computeReportModel and the three public report types",
  );
}
if (/\bexport\s+\*/.test(indexSource)) {
  violations.push("report-model/index.ts must not contain export *");
}

for (const sourcePath of collectSourceFiles(reportModelRoot)) {
  if (sourcePath === indexPath || /(?:index|public-api)\.test\.(?:ts|tsx)$/.test(sourcePath)) {
    continue;
  }
  const source = fs.readFileSync(sourcePath, "utf8");
  source.split(/\r?\n/).forEach((line, index) => {
    if (
      /(?:from\s*["'](?:@\/lib\/reports\/report-model(?:\/index)?["']|\.\/?\.\/?index["'])|import\s*\(\s*["'](?:@\/lib\/reports\/report-model(?:\/index)?["']|\.\/?\.\/?index["']))/.test(
        line,
      )
    ) {
      violations.push(
        `${path.relative(repositoryRoot, sourcePath)}:${index + 1} imports the report-model facade or index internally`,
      );
    }
  });
}

if (violations.length > 0) {
  console.error("Report model boundary check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    "Report model boundary check passed: explicit public API and direct internal imports are enforced.",
  );
}
