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
import { getRadarGroups } from "./analyze-heavy-files.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT_PATH = "documentation/architecture/monolith-split-plan.md";
const SCAN_ROOTS = ["apps/web/src"];
const HUMAN_BEGIN = "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->";
const HUMAN_END = "<!-- RADAR:HUMAN_DECISIONS:END -->";
const DEFAULT_TOP = 25;
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

function parseJson(view, file) {
  if (!view.isFile(file)) return null;
  try {
    return JSON.parse(view.readText(file));
  } catch {
    return null;
  }
}

function signal(state, detail = "") {
  if (!SIGNAL_STATES.has(state)) throw new Error(`Signal inconnu: ${state}`);
  return { state, detail };
}

function countByFile(entries, pathForEntry) {
  const counts = new Map();
  for (const entry of entries ?? []) {
    const file = pathForEntry(entry);
    if (file) counts.set(file, (counts.get(file) ?? 0) + 1);
  }
  return counts;
}

export function loadCorrelationSignals(view) {
  const complexity = parseJson(view, "scripts/checks/complexity-baseline.json");
  const complexityByFile = countByFile(complexity?.entries, (entry) => {
    if (typeof entry?.path !== "string") return null;
    return entry.path.startsWith("src/") ? `apps/web/${entry.path}` : entry.path;
  });

  const deadCode = parseJson(view, "scripts/checks/dead-code-baseline.json");
  const deadCodeByFile = countByFile(deadCode?.findings, (entry) => entry?.file);

  return { complexity, complexityByFile, deadCode, deadCodeByFile };
}

function signalForRow(row, correlations) {
  const complexityCount = correlations.complexityByFile.get(row.file) ?? 0;
  const deadCodeCount = correlations.deadCodeByFile.get(row.file) ?? 0;
  return {
    size: isAboveReview(row)
      ? signal("PRESENT", isAboveHard(row) ? "HARD" : "REVIEW")
      : signal("NONE"),
    complexity: signal("NOT_MEASURED", complexityCount > 0
      ? `baseline historique: ${complexityCount} entrée(s); quality:complexity non exécuté sur RADAR_REF`
      : "quality:complexity non exécuté sur RADAR_REF"),
    cycle: signal("NOT_MEASURED", "quality:cycles/GitNexus non exécuté par la génération normale"),
    deadCode: signal("NOT_MEASURED", deadCodeCount > 0
      ? `baseline historique: ${deadCodeCount} entrée(s); Knip non exécuté sur RADAR_REF`
      : "Knip non exécuté sur RADAR_REF"),
    duplication: signal("NOT_MEASURED", "jscpd expose ici une métrique globale, sans attribution fiable au fichier"),
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

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
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
  return [row.signals.complexity, row.signals.cycle, row.signals.deadCode, row.signals.duplication, row.signals.testability]
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

${renderHumanSection(humanEntries)}

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
- COMPLEXITY_SIGNAL et DEAD_CODE_SIGNAL ne déduisent jamais un finding
  actuel d'une baseline historique. En génération normale, une entrée de
  baseline produit au plus NOT_MEASURED — baseline historique: N entrée(s) ;
  quality:complexity ou Knip reste propriétaire de la mesure actuelle.
- Une génération deep n'est pas activée par défaut : les contrôles existants
  n'exposent pas tous une mesure attribuable à une ref exacte sans rejouer leur
  environnement complet. Le radar préfère donc NOT_MEASURED à une attribution
  locale inventée.
- cycles/GitNexus, jscpd et coverage sont NOT_MEASURED dans la génération
  normale lorsqu'une sortie actuelle attribuable au fichier n'est pas déjà
  disponible. Le radar ne lance pas ces analyses coûteuses et ne convertit
  pas leurs métriques globales en findings locaux.
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
  const correlations = loadCorrelationSignals(view);
  const radarRows = createRadarRows(rows, correlations).map((row) => ({
    ...row,
    ref: refInfo.resolved,
  }));
  const groups = getRadarGroups(rows);
  return { refInfo, view, rows, radarRows, ...groups };
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
