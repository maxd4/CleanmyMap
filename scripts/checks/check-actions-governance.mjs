import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const buttonPath = path.join(repositoryRoot, "apps/web/src/components/ui/cmm-button.tsx");
const violations = [];

if (!fs.existsSync(buttonPath)) {
  violations.push("apps/web/src/components/ui/cmm-button.tsx: canonical primitive is missing");
} else {
  const source = fs.readFileSync(buttonPath, "utf8");
  const componentSource = source.slice(
    source.indexOf("export function CmmButton("),
    source.indexOf("// Groupe de boutons"),
  );

  if (source.includes("cmm-interactive")) {
    violations.push("cmm-button.tsx: cmm-interactive must not be used by CmmButton");
  }
  if (source.includes("transition-all")) {
    violations.push("cmm-button.tsx: transition-all is not allowed in the primitive");
  }
  if (/tone\s*\??:\s*[^\n;]*[|]\s*["']muted["']|tone\s*===\s*["']muted["']/.test(source)) {
    violations.push("cmm-button.tsx: muted is not part of the canonical tone contract");
  }

  const directStylePattern = /\b(?:bg|border|rounded|shadow|ring|transition(?:-all)?|duration|px|py|gap|h|min-h|max-h|w|min-w|max-w|translate|scale|blur|opacity)-[\w/[.:%-]+/;
  if (directStylePattern.test(componentSource) || /\bstyle\s*=/.test(componentSource)) {
    violations.push("cmm-button.tsx: direct geometry/effect/focus styles must stay in globals.css");
  }

  for (const required of [
    'cn("cmm-button", className)',
    '"data-cmm-button-tone"',
    '"data-cmm-button-size"',
    '"data-cmm-button-variant"',
    '"aria-busy"',
  ]) {
    if (!source.includes(required)) {
      violations.push(`cmm-button.tsx: missing canonical contract marker ${required}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Actions & Buttons governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Actions & Buttons governance check passed: CmmButton keeps its canonical CSS-only surface contract.");
}
