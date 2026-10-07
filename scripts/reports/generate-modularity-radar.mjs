#!/usr/bin/env node
/**
 * Génère le radar canonique de modularisation.
 *
 * Ce rapport orchestre des sources existantes. Il ne recalcule pas la
 * politique top-heavy et ne fusionne pas les gates de qualité en un score.
 * Les décisions et leurs justifications sont conservées dans le document
 * entre les marqueurs RADAR:HUMAN_DECISIONS.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  createRepositoryView,
  parseRepositoryRef,
} from "../checks/repository-view.mjs";
import {
  collectMeasuredRows,
} from "../checks/top-heavy-measurement.mjs";
import {
  FILE_KIND_POLICY,
  isAboveHard,
  isAboveReview,
  isExcludedGeneratedRow,
} from "../checks/top-heavy-policy.mjs";
import { getComplexityTarget } from "../checks/complexity-policy.mjs";
import { getRadarGroups } from "./analyze-heavy-files.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT_PATH = "documentation/architecture/monolith-split-plan.md";
const SCAN_ROOTS = ["apps/web/src"];
const HUMAN_BEGIN = "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->";
const HUMAN_END = "<!-- RADAR:HUMAN_DECISIONS:END -->";
const DEFAULT_TOP = 25;
const QUALITY_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles"]);
const SIGNAL_STATES = new Set(["NONE", "PRESENT", "NOT_APPLICABLE", "NOT_MEASURED"]);
const HUMAN_FIELDS = Object.freeze([
  "RESPONSIBILITIES",
  "PUBLIC_CONTRACTS",
  "SIDE_EFFECTS",
  "MAIN_CONSUMERS",
  "TEST_BOUNDARY",
  "COUPLING",
  "NATURAL_EXTRACTION_BOUNDARY",
  "ARCHITECTURE_DECISION",
  "RATIONALE",
  "PRIORITY",
  "DEPENDENCY_OR_BLOCKER",
  "NEXT_TRIGGER",
]);

function git(args, root = REPOSITORY_ROOT) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

export function resolveRadarRef(ref, root = REPOSITORY_ROOT) {
  if (!ref) throw new Error("REF Git obligatoire : utiliser --ref=<sha|HEAD>.");
  const resolved = git(["rev-parse", "--verify", `${ref}^{commit}`], root);
  const head = git(["rev-parse", "HEAD"], root);
  return {
    requested: ref,
    resolved,
    head,
    status: resolved === head ? "CURRENT_AT_GENERATION" : "HISTORICAL_SNAPSHOT",
  };
}

function signal(state, detail = "") {
  if (!SIGNAL_STATES.has(state)) throw new Error(`Signal inconnu: ${state}`);
  return { state, detail };
}

function normalizeFile(file) {
  const normalized = String(file ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (normalized.startsWith("apps/web/") || normalized.startsWith("apps/mobile/") || normalized.startsWith("scripts/")) return normalized;
  if (normalized.startsWith("src/")) return `apps/web/${normalized}`;
  return normalized;
}

function addFileCount(counts, file, amount = 1) {
  const normalized = normalizeFile(file);
  if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + amount);
}

function createEmptyCorrelationSignals(detail) {
  return {
    measured: false,
    detail,
    complexityByFile: new Map(),
    deadCodeByFile: new Map(),
    cycleByFile: new Map(),
    duplicationByFile: new Map(),
  };
}

function createMeasuredCorrelationSignals({ complexityByFile = new Map(), deadCodeByFile = new Map(), cycleByFile = new Map(), duplicationByFile = new Map() }) {
  return {
    measured: true,
    detail: "mesures actuelles des cinq gates quality:...",
    complexityByFile,
    deadCodeByFile,
    cycleByFile,
    duplicationByFile,
  };
}

function occurrenceFiles(occurrence) {
  return [occurrence?.occurrenceA?.path, occurrence?.occurrenceB?.path]
    .map(normalizeFile)
    .filter(Boolean);
}

function addCurrentComplexityFindings(metrics, complexityByFile) {
  for (const metric of metrics ?? []) {
    const target = getComplexityTarget(metric.metric, metric.category);
    if (target !== null && metric.value > target) addFileCount(complexityByFile, metric.path);
  }
}

function addDeadCodeFindings(comparison, deadCodeByFile) {
  for (const finding of [
    ...(comparison?.newFindings ?? []),
    ...(comparison?.historicalActionableFindings ?? []),
  ]) addFileCount(deadCodeByFile, finding.file);
}

function addCycleFindings(cycleObjects, cycleByFile) {
  for (const cycle of cycleObjects ?? []) {
    for (const file of cycle?.files ?? []) addFileCount(cycleByFile, file);
  }
}

function addDuplicationFindings(results, justificationReport, duplicationByFile) {
  const qualified = new Set([
    ...(justificationReport?.classifications?.KEEP_INTENTIONAL ?? []),
    ...(justificationReport?.classifications?.NO_ACTION_NOISE ?? []),
  ]);
  for (const result of results ?? []) {
    for (const occurrence of result.occurrences ?? []) {
      const identity = `${result.scopeName}:${occurrence.fingerprint}`;
      if (qualified.has(identity)) continue;
      for (const file of occurrenceFiles(occurrence)) addFileCount(duplicationByFile, file);
    }
  }
}

export function createCorrelationSignalsFromAuditResults(resultsByAudit) {
  const complexity = resultsByAudit?.complexity;
  const deadCode = resultsByAudit?.["dead-code"];
  const duplication = resultsByAudit?.duplication;
  const cycles = resultsByAudit?.cycles;
  const topHeavy = resultsByAudit?.["top-heavy"];
  if (!topHeavy || !complexity?.result || !deadCode?.comparison || !Array.isArray(duplication?.results) || !Array.isArray(cycles?.cycleObjects)) {
    return createEmptyCorrelationSignals("les rapports courants des cinq gates ne sont pas disponibles");
  }

  const complexityByFile = new Map();
  const deadCodeByFile = new Map();
  const cycleByFile = new Map();
  const duplicationByFile = new Map();
  addCurrentComplexityFindings(complexity.metrics, complexityByFile);
  addDeadCodeFindings(deadCode.comparison, deadCodeByFile);
  addCycleFindings(cycles.cycleObjects, cycleByFile);
  addDuplicationFindings(duplication.results, duplication.justificationReport, duplicationByFile);
  return createMeasuredCorrelationSignals({ complexityByFile, deadCodeByFile, cycleByFile, duplicationByFile });
}

function readFilesystemJson(root, relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(root, ...relativePath.split("/")), "utf8"));
  } catch {
    return null;
  }
}

export function loadQualityAuditArtifacts({ root = REPOSITORY_ROOT, auditedSha }) {
  if (!/^[0-9a-f]{40}$/i.test(auditedSha ?? "")) return createEmptyCorrelationSignals("RADAR_REF incomplet");
  const reports = {};
  for (const audit of QUALITY_AUDITS) {
    const base = `artifacts/quality-audits/${auditedSha}/${audit}`;
    const manifest = readFilesystemJson(root, `${base}/manifest.json`);
    const report = readFilesystemJson(root, `${base}/report.json`);
    if (!manifest || manifest.schemaVersion !== 1 || manifest.audit !== audit || manifest.auditedHead !== auditedSha || manifest.originMain !== auditedSha || manifest.baselineStable !== true || manifest.worktreeClean !== true || !report) {
      return createEmptyCorrelationSignals(`preuve quality incomplète ou non stable pour ${auditedSha}`);
    }
    reports[audit] = report;
  }
  return createCorrelationSignalsFromAuditResults(reports);
}

function signalForRow(row, correlations) {
  const signalFromMap = (map) => correlations.measured
    ? signal(map.has(row.file) ? "PRESENT" : "NONE", map.has(row.file) ? `${map.get(row.file)} finding(s) actuel(s)` : "")
    : signal("NOT_MEASURED", correlations.detail);
  return {
    size: isAboveReview(row)
      ? signal("PRESENT", isAboveHard(row) ? "HARD" : "REVIEW")
      : signal("NONE"),
    complexity: signalFromMap(correlations.complexityByFile),
    cycle: signalFromMap(correlations.cycleByFile),
    deadCode: signalFromMap(correlations.deadCodeByFile),
    duplication: signalFromMap(correlations.duplicationByFile),
    testability: signal("NOT_MEASURED", "quality:coverage n'est pas attribuable ici au fichier candidat"),
  };
}

export function createRadarRows(rows, correlations) {
  return rows.map((row) => ({ ...row, signals: signalForRow(row, correlations) }));
}

function splitTableRow(line) {
  if (!line.startsWith("|") || !line.endsWith("|")) return [];
  return line.slice(1, -1).split("|").map((cell) => cell.trim());
}

export function extractHumanDecisions(markdown) {
  const start = markdown.indexOf(HUMAN_BEGIN);
  const end = markdown.indexOf(HUMAN_END);
  if (start >= 0 && end > start) return markdown.slice(start + HUMAN_BEGIN.length, end).trim();

  const legacyStart = markdown.indexOf("## Décisions déjà prises");
  if (legacyStart < 0) return "_Aucune décision humaine enregistrée._";
  const after = markdown.slice(legacyStart);
  const nextHeading = after.indexOf("\n## ", 4);
  return (nextHeading >= 0 ? after.slice(0, nextHeading) : after).trim();
}

export function parseDecisionSummary(humanBlock) {
  const entries = [];
  for (const line of humanBlock.split(/\r?\n/)) {
    const cells = splitTableRow(line);
    if (cells.length !== 5 || cells[0] === "PATH" || /^-+$/.test(cells[0])) continue;
    const [file, decision, priority, fourth, fifth] = cells;
    if (!file || !decision || !priority || file.startsWith("_") || file.startsWith("###")) continue;
    if (decision === "DECISION" || decision === "ARCHITECTURE_DECISION") continue;
    const isCanonical = cells[3] === "DEPENDENCY_OR_BLOCKER";
    entries.push({
      file: file.replaceAll("`", ""),
      decision,
      priority,
      dependency: isCanonical ? fourth : fifth,
      nextTrigger: isCanonical ? fifth : "",
    });
  }
  return entries;
}

function parseHumanDetailTables(humanBlock) {
  const details = new Map();
  const headings = [...humanBlock.matchAll(/^#### `([^`]+)`\s*$/gm)];
  for (let index = 0; index < headings.length; index += 1) {
    const file = headings[index][1];
    const start = headings[index].index + headings[index][0].length;
    const end = headings[index + 1]?.index ?? humanBlock.length;
    const fields = {};
    for (const line of humanBlock.slice(start, end).split(/\r?\n/)) {
      const cells = splitTableRow(line);
      if (cells.length !== 2 || cells[0] === "Champ" || /^-+$/.test(cells[0])) continue;
      const field = cells[0];
      if (HUMAN_FIELDS.includes(field)) fields[field] = cells[1];
    }
    details.set(file, fields);
  }
  return details;
}

export function parseHumanDecisions(humanBlock) {
  const summaries = parseDecisionSummary(humanBlock);
  const details = parseHumanDetailTables(humanBlock);
  const files = new Set([...summaries.map((entry) => entry.file), ...details.keys()]);
  return [...files].map((file) => {
    const summary = summaries.find((entry) => entry.file === file) ?? {};
    const detail = details.get(file) ?? {};
    return {
      file,
      ARCHITECTURE_DECISION: detail.ARCHITECTURE_DECISION ?? summary.decision ?? "REVIEW_REQUIRED",
      PRIORITY: detail.PRIORITY ?? summary.priority ?? "NONE",
      DEPENDENCY_OR_BLOCKER: detail.DEPENDENCY_OR_BLOCKER ?? summary.dependency ?? "",
      NEXT_TRIGGER: detail.NEXT_TRIGGER ?? summary.nextTrigger ?? "",
      ...Object.fromEntries(HUMAN_FIELDS
        .filter((field) => !["ARCHITECTURE_DECISION", "PRIORITY", "DEPENDENCY_OR_BLOCKER", "NEXT_TRIGGER"].includes(field))
        .map((field) => [field, detail[field] ?? ""])),
    };
  });
}

function formatPolicy() {
  return Object.entries(FILE_KIND_POLICY).map(([kind, policy]) => {
    if (policy.review === null) return `| ${kind} | informatif | informatif | provenance générée + régénérabilité obligatoires |`;
    return `| ${kind} | >${policy.review.lines} lignes ou >${policy.review.bytes / 1024} KiB | >${policy.hard.lines} lignes ou >${policy.hard.bytes / 1024} KiB | ${policy.radarSection === "tests" ? "lisibilité/cohésion des scénarios" : "architecture"} |`;
  }).join("\n");
}

function signalText(value) {
  return value.detail ? `${value.state} — ${value.detail}` : value.state;
}

export function compactSignalText(signals) {
  const present = [
    ["complexity", signals.complexity],
    ["cycle", signals.cycle],
    ["dead-code", signals.deadCode],
    ["duplication", signals.duplication],
    ["testability", signals.testability],
  ].filter(([, value]) => value.state === "PRESENT")
    .map(([name, value]) => `${name}: ${value.detail}`)
    .join("<br>");
  if (present) return present;
  const complementary = [signals.complexity, signals.cycle, signals.deadCode, signals.duplication, signals.testability];
  return complementary.some((value) => value.state === "NOT_MEASURED")
    ? "signaux complémentaires non mesurés"
    : "aucun signal actuel mesuré";
}

function renderRawTable(rows, limit, humanByFile) {
  const selected = rows.slice(0, limit);
  if (selected.length === 0) return "_Aucun fichier dans cette section._";
  const lines = [
    "| PATH | REF | LINES | BYTES | KIND | SIZE_SIGNAL | CORRELATIONS | DECISION |",
    "| --- | --- | ---: | ---: | --- | --- | --- | --- |",
  ];
  for (const row of selected) {
    const decision = humanByFile.get(row.file)?.ARCHITECTURE_DECISION ?? "REVIEW_REQUIRED";
    lines.push(`| \`${row.file}\` | \`${row.ref}\` | ${row.lines} | ${row.bytes} | ${row.kind} | ${signalText(row.signals.size)} | ${compactSignalText(row.signals)} | ${decision} |`);
  }
  return lines.join("\n");
}

function renderPriorities(entries, radarByFile) {
  if (entries.length === 0) return "_Aucune décision humaine enregistrée._";
  return [
    "| PATH | DECISION | SIZE_SIGNAL | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |",
    "| --- | --- | --- | --- | --- | --- |",
    ...entries.map((entry) => {
      const row = radarByFile.get(entry.file);
      const trigger = [entry.DEPENDENCY_OR_BLOCKER, entry.NEXT_TRIGGER].filter(Boolean).join(" ; ") || "—";
      return `| \`${entry.file}\` | ${entry.ARCHITECTURE_DECISION} | ${row ? signalText(row.signals.size) : "NOT_MEASURED"} | ${entry.PRIORITY} | ${row ? compactSignalText(row.signals) : "signaux complémentaires non mesurés"} | ${trigger} |`;
    }),
  ].join("\n");
}

function countStructuralSignals(row) {
  return [row.signals.size, row.signals.complexity, row.signals.cycle, row.signals.deadCode, row.signals.duplication, row.signals.testability]
    .filter((item) => item.state === "PRESENT").length;
}

function renderHumanSection(entries) {
  const summary = [
    "| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |",
    "| --- | --- | --- | --- | --- |",
    ...entries.map((entry) => `| \`${entry.file}\` | ${entry.ARCHITECTURE_DECISION} | ${entry.PRIORITY} | ${entry.DEPENDENCY_OR_BLOCKER || "—"} | ${entry.NEXT_TRIGGER || "—"} |`),
  ];
  const details = entries.flatMap((entry) => [
    `#### \`${entry.file}\``,
    "",
    "| Champ | Valeur |",
    "| --- | --- |",
    ...HUMAN_FIELDS
      .filter((field) => entry[field])
      .map((field) => `| ${field} | ${entry[field]} |`),
    "",
  ]);
  return `${HUMAN_BEGIN}\n${summary.join("\n")}\n\n### Décisions établies — grille détaillée\n\n${details.join("\n").trim()}\n${HUMAN_END}`;
}

function renderPreservedHumanSection(humanBlock) {
  if (humanBlock && humanBlock !== "_Aucune décision humaine enregistrée._") {
    if (/^\| PATH \| ARCHITECTURE_DECISION \| PRIORITY \| DEPENDENCY_OR_BLOCKER \| NEXT_TRIGGER \|$/m.test(humanBlock)) {
      const sanitized = humanBlock.split(/\r?\n/).filter((line) => {
        const cells = splitTableRow(line);
        return cells.length !== 2 || cells[0] === "Champ" || /^-+$/.test(cells[0]) || HUMAN_FIELDS.includes(cells[0]);
      }).join("\n");
      return `${HUMAN_BEGIN}\n${sanitized.trim()}\n${HUMAN_END}`;
    }
    return renderHumanSection(parseHumanDecisions(humanBlock));
  }
  return renderHumanSection([]);
}

export function buildRadarMarkdown({ report, refInfo, humanBlock, top = DEFAULT_TOP, generatedAt = new Date().toISOString() }) {
  const humanEntries = parseHumanDecisions(humanBlock);
  const humanByFile = new Map(humanEntries.map((entry) => [entry.file, entry]));
  const radarByFile = new Map(report.radarRows.map((row) => [row.file, row]));
  const rows = report.rows;
  const architectural = report.architectural.map((row) => report.radarRows.find((candidate) => candidate.file === row.file));
  const tests = report.tests.map((row) => report.radarRows.find((candidate) => candidate.file === row.file));
  const generated = report.generated.map((row) => report.radarRows.find((candidate) => candidate.file === row.file));
  const hard = rows.filter(isAboveHard).filter((row) => !isExcludedGeneratedRow(row)).length;
  const multiSignals = report.radarRows.filter((row) => isAboveReview(row) && countStructuralSignals(row) >= 2).length;
  const decisionCount = (decision) => humanEntries.filter((entry) => entry.ARCHITECTURE_DECISION === decision).length;

  return `# Radar de modularisation et dette structurelle

<!-- RADAR:GENERATED:BEGIN -->
## A. En-tête snapshot

\`RADAR_REF=${refInfo.resolved}\`<br>
\`RADAR_GENERATED_AT=${generatedAt}\`<br>
\`RADAR_STATUS=${refInfo.status}\`

Commandes réellement utilisées :

\`node scripts/reports/generate-modularity-radar.mjs --ref=${refInfo.requested}\`

Le snapshot lit l'arbre Git exact de ${refInfo.resolved}. Le statut
CURRENT_AT_GENERATION décrit l'instant de génération ; un document commité
peut donc rester un snapshot reproductible de cette ref sans prétendre suivre
automatiquement un HEAD ultérieur.

## B. Résumé exécutif

| Mesure factuelle | Valeur |
| --- | ---: |
| Fichiers mesurés | ${rows.length} |
| REVIEW architectural (runtime + data/config) | ${architectural.length} |
| HARD contrôlé | ${hard} |
| Tests volumineux | ${tests.length} |
| Generated informatifs | ${generated.length} |
| PROACTIVE_SPLIT établi | ${decisionCount("PROACTIVE_SPLIT")} |
| DEFERRED_SPLIT établi | ${decisionCount("DEFERRED_SPLIT")} |
| COHESIVE_SINGLE_FILE établi | ${decisionCount("COHESIVE_SINGLE_FILE")} |
| ALREADY_MODULARIZED établi | ${decisionCount("ALREADY_MODULARIZED")} |
| Candidats avec plusieurs signaux structurels attribués | ${multiSignals} |

La taille déclenche une revue, jamais un split mécanique. Les décisions
humaines et les corrélations sont séparées du ratchet quality:top-heavy.

## C. Politique

La politique par KIND est canonique dans
top-heavy-policy.mjs (../../scripts/checks/top-heavy-policy.mjs) et est
consommée par le même moteur que quality:top-heavy. Le générateur ne
redéfinit aucun seuil.

| KIND | REVIEW | HARD | Lecture radar |
| --- | --- | --- | --- |
${formatPolicy()}

Un fichier generated n'est exclu que si sa provenance et sa régénérabilité
sont démontrées. Un test volumineux reste un signal de lisibilité et de
cohésion de scénarios, jamais un monolithe runtime par défaut.

## D. Priorités architecturales

${renderPriorities(humanEntries, radarByFile)}

## E. Décisions établies

${renderPreservedHumanSection(humanBlock)}

## F. Radar brut à auditer

Les tableaux suivants sont mesurés automatiquement. Une ligne sans décision
humaine reste REVIEW_REQUIRED, qui est un état d'audit et non une consigne
de découpage.

### Radar architectural — top ${top}

${renderRawTable(architectural, top, humanByFile)}

### Tests volumineux — top ${top}

${renderRawTable(tests, top, humanByFile)}

### Generated — résumé informatif

${renderRawTable(generated, top, humanByFile)}

## G. Grille d'audit

Chaque candidat audité doit conserver les champs suivants, avec des valeurs
factuelles et traçables :

\`PATH\`, \`REF\`, \`LINES\`, \`BYTES\`, \`KIND\`, \`RESPONSIBILITIES\`,
\`PUBLIC_CONTRACTS\`, \`SIDE_EFFECTS\`, \`MAIN_CONSUMERS\`,
\`TEST_BOUNDARY\`, \`COUPLING\`, \`NATURAL_EXTRACTION_BOUNDARY\`,
\`SIZE_SIGNAL\`, \`COMPLEXITY_SIGNAL\`, \`CYCLE_SIGNAL\`,
\`DEAD_CODE_SIGNAL\`, \`DUPLICATION_SIGNAL\`, \`TESTABILITY_SIGNAL\`,
\`ARCHITECTURE_DECISION\`, \`RATIONALE\`, \`PRIORITY\`,
\`DEPENDENCY_OR_BLOCKER\`, \`NEXT_TRIGGER\`.

Les signaux acceptent uniquement NONE, PRESENT, NOT_APPLICABLE ou
NOT_MEASURED, avec un détail court. NONE signifie que l'outil concerné a
réellement été exécuté sans finding ; NOT_MEASURED signifie qu'aucune mesure
actuelle attribuable à cette ref n'est disponible. Les priorités sont NOW,
AFTER_ACTIVE_CHANGES, LATER ou NONE ; elles ne sont jamais déduites
automatiquement de la taille.

## H. Signaux complémentaires

- SIZE_SIGNAL vient de quality:top-heavy, de classifyFileKind() et
  de la baseline heavy-files ; ce contrôle reste la source de vérité de la
  taille et de ses plafonds.
- En génération standalone, COMPLEXITY_SIGNAL, DEAD_CODE_SIGNAL,
  DUPLICATION_SIGNAL et CYCLE_SIGNAL proviennent uniquement des cinq rapports
  quality-audits dont les manifests prouvent le même RADAR_REF, une baseline
  stable et un worktree propre. Une preuve absente, invalide ou d'une autre ref
  produit NOT_MEASURED ; aucune baseline historique n'est projetée.
- COMPLEXITY_SIGNAL utilise les mesures de fonctions actuelles et le target de
  la policy complexity, y compris lorsque le ratchet legacy autorise encore la
  valeur. Les findings KEEP_JUSTIFIED, KEEP_INTENTIONAL et NO_ACTION_NOISE
  restent visibles dans les rapports bruts mais ne sont pas des signaux
  structurels actionnables.
- L'orchestration audit:quality all construit cette corrélation après les
  cinq gates à partir de leurs résultats en mémoire, sans relancer d'outil.
- Un candidat cumule plusieurs signaux seulement lorsque plusieurs états
  PRESENT sont réellement attribués ; ce compteur n'est pas un score et ne
  remplace aucune gate.

## I. Portée / reproductibilité

La mesure porte sur les fichiers .ts et .tsx suivis sous
apps/web/src, lus depuis la ref exacte affichée en tête. Pour régénérer un
snapshot courant, utiliser --ref=HEAD ; une ref ancienne est signalée
HISTORICAL_SNAPSHOT et ne peut pas être présentée comme courante.

Le bloc entre RADAR:HUMAN_DECISIONS:BEGIN/END conserve uniquement les
interprétations humaines et les décisions d'architecture. REF, LINES, BYTES,
KIND, SIZE_SIGNAL et les signaux automatiques sont toujours régénérés depuis
RADAR_REF ; ils ne sont jamais lus depuis ce bloc. refactor-priorities-plan.md
renvoie vers ce document sans recopier sa liste.
<!-- RADAR:GENERATED:END -->
`;
}

export function createRadarReport({ root = REPOSITORY_ROOT, ref }) {
  const refInfo = resolveRadarRef(ref, root);
  const view = createRepositoryView({ root, ref: refInfo.resolved });
  const rows = collectMeasuredRows(view, SCAN_ROOTS);
  const correlations = loadQualityAuditArtifacts({ root, auditedSha: refInfo.resolved });
  const radarRows = createRadarRows(rows, correlations).map((row) => ({
    ...row,
    ref: refInfo.resolved,
  }));
  const groups = getRadarGroups(rows);
  return { refInfo, view, rows, radarRows, correlations, ...groups };
}

function getOption(args, name) {
  const prefix = `--${name}=`;
  const value = args.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export function main(args = process.argv.slice(2)) {
  try {
    const requestedRef = parseRepositoryRef(args);
    const refInfo = resolveRadarRef(requestedRef);
    const report = createRadarReport({ ref: requestedRef });
    const outputPath = path.resolve(REPOSITORY_ROOT, getOption(args, "output") ?? OUTPUT_PATH);
    const existing = viewDocument(outputPath);
    const humanBlock = extractHumanDecisions(existing);
    const markdown = buildRadarMarkdown({
      report,
      refInfo,
      humanBlock,
      top: Number(getOption(args, "top") ?? DEFAULT_TOP),
    });

    if (args.includes("--write")) {
      if (refInfo.status !== "CURRENT_AT_GENERATION" && !args.includes("--allow-historical")) {
        throw new Error(`Ref ${refInfo.resolved} is ${refInfo.status}; --write exige --ref=HEAD ou --allow-historical.`);
      }
      writeFileSync(outputPath, markdown, "utf8");
      console.log(`Radar généré: ${outputPath}`);
    } else {
      console.log(`Radar de modularisation — REF=${refInfo.resolved} STATUS=${refInfo.status}`);
      console.log(`Mesurés: ${report.rows.length}; architectural: ${report.architectural.length}; tests: ${report.tests.length}; generated: ${report.generated.length}`);
      console.log("Mode lecture seule; utiliser --write pour actualiser le document.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function viewDocument(outputPath) {
  try {
    return readFileSync(outputPath, "utf8");
  } catch {
    return "";
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) main();
