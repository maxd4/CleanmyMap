import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const webPackagePath = path.join(repoRoot, "apps", "web", "package.json");
const webPackage = JSON.parse(fs.readFileSync(webPackagePath, "utf8"));

function readMajor(specifier) {
  const match = String(specifier ?? "").match(/\d+/);
  if (!match) {
    throw new Error(`Unable to resolve a major version from: ${specifier}`);
  }
  return Number(match[0]);
}

const nextMajor = readMajor(webPackage.dependencies?.next);
const typescriptMajor = readMajor(webPackage.devDependencies?.typescript);

const activeDocs = [
  "AGENTS.md",
  "README.md",
  "documentation/README.md",
  "documentation/architecture/README.md",
  "documentation/architecture/ARCHITECTURE.md",
  "documentation/architecture/system-overview.md",
  "documentation/architecture/data-governance.md",
  "documentation/product/README.md",
  "documentation/design-system/README.md",
  "documentation/security/README.md",
  "documentation/development/TESTING.md",
  "apps/web/README.md",
  ".codex/skills/cleanmymap-repo/SKILL.md",
  ".agents/skills/cleanmymap-repo/SKILL.md",
];

const forbiddenPatterns = [
  {
    regex: /\bNext\.js\s+15\b/gi,
    message: `stale Next.js major; current manifest major is ${nextMajor}`,
  },
  {
    regex: /\bTypeScript\s+5\b/gi,
    message: `stale TypeScript major; current manifest major is ${typescriptMajor}`,
  },
  {
    regex: /TypeScript-5-/gi,
    message: `stale TypeScript badge; current manifest major is ${typescriptMajor}`,
  },
  {
    regex: /2025-01-XX/g,
    message: "placeholder date must not remain in active documentation",
  },
  {
    regex: /documentation\/repo-docs\/ops\/INCIDENT_RUNBOOK_SHORT\.md/g,
    message:
      "stale incident runbook path; use documentation/operations/INCIDENT_RUNBOOK_SHORT.md",
  },
  {
    regex: /(^|[^/])src\/report_generator\.py/gm,
    message:
      "stale Python runtime path; maintenance Python lives under maintenance/python/",
  },
];

const findings = [];

for (const relativePath of activeDocs) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    findings.push({
      file: relativePath,
      line: 0,
      message: "active documentation file is missing",
    });
    continue;
  }

  const content = fs.readFileSync(absolutePath, "utf8");

  for (const rule of forbiddenPatterns) {
    rule.regex.lastIndex = 0;
    for (const match of content.matchAll(rule.regex)) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        file: relativePath,
        line,
        message: rule.message,
      });
    }
  }

  if (relativePath === "README.md") {
    if (!content.includes(`Next.js-${nextMajor}-`)) {
      findings.push({
        file: relativePath,
        line: 0,
        message: `README badge must reflect Next.js ${nextMajor}`,
      });
    }
    if (!content.includes(`TypeScript-${typescriptMajor}-`)) {
      findings.push({
        file: relativePath,
        line: 0,
        message: `README badge must reflect TypeScript ${typescriptMajor}`,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Stack/documentation drift check failed:");
  for (const finding of findings) {
    const location = finding.line > 0 ? `:${finding.line}` : "";
    console.error(`- ${finding.file}${location}: ${finding.message}`);
  }
  process.exit(1);
}

console.log(
  `Stack/documentation drift check passed (Next.js ${nextMajor}, TypeScript ${typescriptMajor}).`,
);
