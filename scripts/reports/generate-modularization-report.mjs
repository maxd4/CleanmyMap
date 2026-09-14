#!/usr/bin/env node
/**
 * Génère un rapport factuel de modularisation.
 *
 * Le générateur fournit un canevas de décision et de validation. Il ne déduit
 * ni architecture cible ni critère de réussite à partir de la taille du fichier.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER = "<à renseigner>";

export function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    return {
      exists: true,
      size: Buffer.byteLength(content, "utf8"),
      lines: content.split(/\r?\n/).length,
      imports: (content.match(/^import /gm) || []).length,
      exports: (content.match(/^export /gm) || []).length,
    };
  } catch {
    return { exists: false };
  }
}

function parseOptions(args) {
  const [target, ...optionArgs] = args;
  const options = { target };

  for (const option of optionArgs) {
    const match = option.match(/^--([a-z-]+)=(.*)$/s);
    if (!match) throw new Error(`Option invalide: ${option}`);
    options[match[1]] = match[2];
  }

  return options;
}

function field(name, value = PLACEHOLDER) {
  return `${name}: ${value || PLACEHOLDER}`;
}

export function buildReport({
  target,
  baseRef = PLACEHOLDER,
  finalRef = PLACEHOLDER,
  kind = PLACEHOLDER,
  architectureDecision = PLACEHOLDER,
  structuralProblem = PLACEHOLDER,
  extractedResponsibilities = PLACEHOLDER,
  publicContractsPreserved = PLACEHOLDER,
  beforeLines = PLACEHOLDER,
  beforeBytes = PLACEHOLDER,
  afterLines = PLACEHOLDER,
  afterBytes = PLACEHOLDER,
  targetedTests = PLACEHOLDER,
  typecheck = PLACEHOLDER,
  lint = PLACEHOLDER,
  heavyFiles = PLACEHOLDER,
  remainingDebt = PLACEHOLDER,
}) {
  return `# Rapport de modularisation

${field("TARGET", target)}
${field("BASE_REF", baseRef)}
${field("FINAL_REF", finalRef)}
${field("KIND", kind)}

${field("ARCHITECTURE_DECISION", architectureDecision)}
${field("STRUCTURAL_PROBLEM", structuralProblem)}
${field("EXTRACTED_RESPONSIBILITIES", extractedResponsibilities)}
${field("PUBLIC_CONTRACTS_PRESERVED", publicContractsPreserved)}

${field("BEFORE_LINES", beforeLines)}
${field("BEFORE_BYTES", beforeBytes)}
${field("AFTER_LINES", afterLines)}
${field("AFTER_BYTES", afterBytes)}

${field("TARGETED_TESTS", targetedTests)}
${field("TYPECHECK", typecheck)}
${field("LINT", lint)}
${field("HEAVY_FILES", heavyFiles)}

${field("REMAINING_DEBT", remainingDebt)}
`;
}

export function main(args = process.argv.slice(2)) {
  if (args.length === 0) {
    console.error("Usage: node scripts/reports/generate-modularization-report.mjs <fichier> [--base-ref=<sha>] [--final-ref=<sha>] [--kind=<kind>]");
    process.exitCode = 1;
    return;
  }

  let options;
  try {
    options = parseOptions(args);
  } catch (error) {
    console.error(`Erreur: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const fileInfo = analyzeFile(options.target);
  if (!fileInfo.exists) {
    console.error(`Fichier non trouvé: ${options.target}`);
    process.exitCode = 1;
    return;
  }

  const report = buildReport({
    target: options.target,
    baseRef: options["base-ref"],
    finalRef: options["final-ref"],
    kind: options.kind,
    architectureDecision: options["architecture-decision"],
    structuralProblem: options["structural-problem"],
    extractedResponsibilities: options["extracted-responsibilities"],
    publicContractsPreserved: options["public-contracts-preserved"],
    beforeLines: options["before-lines"],
    beforeBytes: options["before-bytes"],
    afterLines: options["after-lines"],
    afterBytes: options["after-bytes"],
    targetedTests: options["targeted-tests"],
    typecheck: options.typecheck,
    lint: options.lint,
    heavyFiles: options["heavy-files"],
    remainingDebt: options["remaining-debt"],
  });

  const reportDate = new Date().toISOString().split("T")[0];
  const reportPath = join(
    process.cwd(),
    "documentation",
    "sessions",
    "history",
    `modularization-${reportDate}-${basename(options.target)}.md`,
  );

  try {
    writeFileSync(reportPath, report, "utf8");
    console.log(`Rapport généré: ${reportPath}`);
  } catch (error) {
    console.error(`Erreur lors de la génération du rapport: ${error.message}`);
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) main();
