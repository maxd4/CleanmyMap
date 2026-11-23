#!/usr/bin/env node

import ts from "typescript";

import { createRepositoryView } from "../checks/repository-view.mjs";
import { normalizeQualityScope } from "../checks/quality-scope.mjs";

export const UI_DENSITY_THRESHOLDS = Object.freeze({
  longParagraphChars: 240,
  veryLongParagraphChars: 460,
  longFieldHelpChars: 140,
  veryLongFieldHelpChars: 220,
  explanatoryBlocksBeforeAction: 2,
  secondaryCharsForDensitySignal: 300,
  secondaryToStructuredRatio: 3,
  componentTextVolumeChars: 1_200,
  repeatedDescriptionChars: 48,
});

const STATIC_TEXT_ATTRIBUTES = new Set([
  "buttonText", "cancelLabel", "confirmLabel",
  "description", "emptyText", "errorText", "header", "helperText", "hint", "label",
  "placeholder", "subtitle", "successText", "title",
]);
const FIELD_HELP_ATTRIBUTES = new Set(["helperText", "hint"]);
const STRUCTURED_TEXT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const ACTION_TAGS = new Set(["button", "CmmButton", "Button"]);
const TEXT_BLOCK_TAGS = new Set(["p", "blockquote", "li"]);
const SAFETY_OR_ACCESSIBILITY_TEXT = /\b(sécurit\w*|danger\w*|urgence|avertissement|obligatoire|consentement|mineur\w*|donnée\w* personnelle\w*|mot de passe|accessibilit\w*|erreur|attention)\b/i;
const CAVEAT_PATTERNS = Object.freeze([
  ["NOTE_IMPORTANTE", /\b(?:il est important de|veuillez noter que|notez que)\b/gi],
  ["PRECAUTION_GENERIC", /\b(?:veuillez vous assurer de|pensez à bien|n'oubliez pas de)\b/gi],
  ["TECHNICAL_EXPLANATION", /\b(?:cela fonctionne grâce à|cette donnée est enregistrée dans|le système utilise)\b/gi],
]);
function countInternalTerms(text) {
  return (String(text ?? "").match(/\b(?:API|AuthN|AuthZ|backend|endpoint|persistance|provenance|projection|RPC|JWT|JSON|schema|contrat technique|hypothèse technique)\b/gi) ?? []).length;
}

function normalizedWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function truncate(value, limit = 88) {
  const text = normalizedWhitespace(value);
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

function routeFromPage(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const marker = "apps/web/src/app/";
  if (!normalized.startsWith(marker) || !/\/page\.(?:tsx|jsx)$/.test(normalized)) return null;
  const segments = normalized.slice(marker.length).replace(/\/page\.(?:tsx|jsx)$/, "").split("/")
    .filter((segment) => segment && !/^\(.*\)$/.test(segment) && !segment.startsWith("@"));
  return `/${segments.join("/")}` || "/";
}

function classifySurface(filePath, route, componentName) {
  const source = `${route ?? ""} ${filePath} ${componentName}`.toLowerCase();
  if (/\b(legal|legal|privacy|rgpd|cookies|terms|mentions-legales|conditions)\b/.test(source)) return "legal";
  if (/\b(methodologie|methodology|protocol|method)\b/.test(source)) return "methodological";
  if (/\b(learn|learning|education|guide|academy|tutorial|faq|pedagog)\b/.test(source)) return "pedagogical";
  if (/\b(actions?|participation|join|inscription|signup|account|report|create|attendance|register)\b/.test(source)) return "transactional";
  return "general";
}

function surfaceExpectsLongCopy(surface) {
  return surface === "legal" || surface === "methodological" || surface === "pedagogical";
}

function collectComponentNodes(sourceFile) {
  const components = [];
  const add = (name, node) => {
    if (!/^[A-Z]/.test(name ?? "")) return;
    components.push({ name, node });
  };
  const unwrapFunction = (initializer) => {
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return initializer;
    if (ts.isCallExpression(initializer)) {
      const firstFunction = initializer.arguments.find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
      return firstFunction ?? null;
    }
    return null;
  };
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) add(node.name.text, node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const initializer = unwrapFunction(node.initializer);
      if (initializer) add(node.name.text, initializer);
    }
    if (ts.isClassDeclaration(node) && node.name) {
      const render = node.members.find((member) => ts.isMethodDeclaration(member) && member.name?.getText(sourceFile) === "render");
      if (render) add(node.name.text, render);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return components.filter(({ node }) => {
    let containsJsx = false;
    const findJsx = (child) => {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) containsJsx = true;
      if (!containsJsx) ts.forEachChild(child, findJsx);
    };
    findJsx(node);
    return containsJsx;
  }).sort((left, right) => left.node.getStart(sourceFile) - right.node.getStart(sourceFile) || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

function jsxTagName(node, sourceFile) {
  return (ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName)?.getText(sourceFile) ?? "";
}

function staticAttributeValue(attribute) {
  if (!attribute.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer) || ts.isNoSubstitutionTemplateLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) {
    const expression = attribute.initializer.expression;
    if (expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))) return expression.text;
  }
  return null;
}

function isPotentialVisibleExpression(expression) {
  if (!expression) return false;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression) || ts.isNumericLiteral(expression)) return false;
  if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword || expression.kind === ts.SyntaxKind.NullKeyword) return false;
  return !(ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression) || ts.isJsxFragment(expression) || ts.isObjectLiteralExpression(expression) || ts.isArrowFunction(expression) || ts.isFunctionExpression(expression));
}

function isProtectedCopy(text, tags = [], contextName = "") {
  return SAFETY_OR_ACCESSIBILITY_TEXT.test(text)
    || /alert|error|safety|security|accessib|consent|privacy|legal/i.test(contextName)
    || tags.some((tag) => /alert|error|safety|security|accessib|consent|privacy|legal/i.test(tag));
}

function primaryAction(node, sourceFile) {
  const tag = jsxTagName(node, sourceFile);
  if (tag === "button") return true;
  if (!ACTION_TAGS.has(tag)) return false;
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const attributes = opening.attributes?.properties ?? [];
  return attributes.some((attribute) => ts.isJsxAttribute(attribute)
    && ["tone", "variant", "intent"].includes(attribute.name.getText(sourceFile))
    && /primary|important/i.test(staticAttributeValue(attribute) ?? ""));
}

function visibleAttributeRecord(attribute, sourceFile) {
  if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name) || !STATIC_TEXT_ATTRIBUTES.has(attribute.name.text)) return null;
  const value = staticAttributeValue(attribute);
  if (value !== null) {
    const text = normalizedWhitespace(value);
    return text ? { text, zone: attribute.name.text, start: attribute.getStart(sourceFile), end: attribute.end, dynamic: false } : null;
  }
  const expression = attribute.initializer && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : null;
  if (!isPotentialVisibleExpression(expression)) return null;
  return { text: "", zone: attribute.name.text, start: attribute.getStart(sourceFile), end: attribute.end, dynamic: true, excerpt: truncate(expression.getText(sourceFile)) };
}

function collectParagraph(node, sourceFile, { isMobile, ancestors, contextName }) {
  const tag = jsxTagName(node, sourceFile);
  if (!TEXT_BLOCK_TAGS.has(tag) && !(isMobile && tag === "Text")) return null;
  let text = "";
  let dynamic = false;
  const gather = (child) => {
    if (ts.isJsxText(child)) text += ` ${child.text}`;
    else if (ts.isJsxExpression(child)) {
      const expression = child.expression;
      if (expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression) || ts.isNumericLiteral(expression))) text += ` ${expression.text}`;
      else if (isPotentialVisibleExpression(expression)) dynamic = true;
    }
    else if (ts.isJsxElement(child) || ts.isJsxFragment(child)) child.forEachChild(gather);
  };
  node.children?.forEach(gather);
  const normalized = normalizedWhitespace(text);
  return normalized ? {
    text: normalized,
    start: node.getStart(sourceFile),
    end: node.end,
    dynamic,
    protected: isProtectedCopy(normalized, ancestors, contextName),
    zone: tag,
  } : null;
}

function collectComponentEvidence(component, sourceFile, filePath) {
  const records = [];
  const paragraphs = [];
  const dynamicLocations = [];
  const actions = [];
  const isMobile = filePath.startsWith("apps/mobile/");

  const visit = (node, tagStack = []) => {
    if (ts.isJsxText(node)) {
      const text = normalizedWhitespace(node.text);
      if (text) records.push({ text, zone: "visible-text", start: node.getStart(sourceFile), end: node.end, tags: tagStack, dynamic: false });
      return;
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = jsxTagName(node, sourceFile);
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const nextTags = [...tagStack, tag];
      if (primaryAction(node, sourceFile)) actions.push({ start: node.getStart(sourceFile), tag });
      for (const attribute of opening.attributes.properties) {
        const record = visibleAttributeRecord(attribute, sourceFile);
        if (!record) {
          if (ts.isJsxAttribute(attribute) && STATIC_TEXT_ATTRIBUTES.has(attribute.name.getText(sourceFile)) && attribute.initializer && ts.isJsxExpression(attribute.initializer) && isPotentialVisibleExpression(attribute.initializer.expression)) {
            dynamicLocations.push({ line: sourceFile.getLineAndCharacterOfPosition(attribute.getStart(sourceFile)).line + 1, zone: attribute.name.getText(sourceFile), excerpt: truncate(attribute.initializer.expression.getText(sourceFile)) });
          }
          continue;
        }
        record.tags = nextTags;
        record.protected = !record.dynamic && isProtectedCopy(record.text, nextTags, `${filePath} ${component.name}`);
        if (record.dynamic) dynamicLocations.push({ line: sourceFile.getLineAndCharacterOfPosition(record.start).line + 1, zone: record.zone, excerpt: record.excerpt });
        else records.push(record);
        if (FIELD_HELP_ATTRIBUTES.has(record.zone) && !record.dynamic) record.fieldHelp = true;
      }
      if (ts.isJsxElement(node)) {
        const paragraph = collectParagraph(node, sourceFile, { isMobile, ancestors: nextTags, contextName: `${filePath} ${component.name}` });
        if (paragraph) paragraphs.push(paragraph);
        node.children.forEach((child) => visit(child, nextTags));
      }
      return;
    }
    if (ts.isJsxExpression(node)) {
      const expression = node.expression;
      if (expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression) || ts.isNumericLiteral(expression))) {
        records.push({ text: normalizedWhitespace(expression.text), zone: "visible-text", start: node.getStart(sourceFile), end: node.end, tags: tagStack, dynamic: false, protected: isProtectedCopy(expression.text, tagStack, `${filePath} ${component.name}`) });
      } else if (isPotentialVisibleExpression(expression)) dynamicLocations.push({
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        zone: "conditional-or-dynamic-child",
        excerpt: truncate(expression.getText(sourceFile)),
      });
      return;
    }
    ts.forEachChild(node, (child) => visit(child, tagStack));
  };
  visit(component.node);

  const staticRecords = records.filter((record) => !record.dynamic);
  const allText = staticRecords.map((record) => record.text);
  const totalChars = allText.reduce((sum, text) => sum + text.length, 0);
  const reviewableRecords = staticRecords.filter((record) => !record.protected);
  const reviewableChars = reviewableRecords.reduce((sum, record) => sum + record.text.length, 0);
  const titleChars = reviewableRecords.filter((record) => record.tags.some((tag) => STRUCTURED_TEXT_TAGS.has(tag))).reduce((sum, record) => sum + record.text.length, 0);
  const actionChars = reviewableRecords.filter((record) => record.tags.some((tag) => ACTION_TAGS.has(tag) || tag === "button")).reduce((sum, record) => sum + record.text.length, 0);
  const dataChars = reviewableRecords.filter((record) => record.tags.some((tag) => ["output", "data", "meter", "progress"].includes(tag))).reduce((sum, record) => sum + record.text.length, 0);
  const structuredChars = titleChars + actionChars + dataChars;
  const secondaryChars = Math.max(0, reviewableChars - structuredChars);
  const secondaryRatio = structuredChars > 0 ? Number((secondaryChars / structuredChars).toFixed(2)) : null;
  const line = (position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;
  const fieldHelp = staticRecords.filter((record) => record.fieldHelp && !record.protected);
  const duplicateDescriptions = new Map();
  for (const record of reviewableRecords.filter((item) => ["description", "subtitle", "helperText", "hint"].includes(item.zone) && item.text.length >= UI_DENSITY_THRESHOLDS.repeatedDescriptionChars)) {
    const key = record.text.toLowerCase().replace(/[\p{P}\s]+/gu, " ").trim();
    duplicateDescriptions.set(key, (duplicateDescriptions.get(key) ?? 0) + 1);
  }
  const caveats = CAVEAT_PATTERNS.flatMap(([code, pattern]) => {
    const matches = reviewableRecords.map((record) => record.text).join(" ").match(pattern) ?? [];
    return matches.length > 1 ? [{ code, occurrences: matches.length }] : [];
  });
  const internalTermCount = countInternalTerms(reviewableRecords.map((record) => record.text).join(" "));
  const firstAction = actions.sort((left, right) => left.start - right.start)[0];
  const blocksBeforeAction = firstAction
    ? reviewableRecords.filter((record) => record.end < firstAction.start && record.zone === "visible-text" && record.text.length >= 40).length
    : 0;

  return {
    file: filePath,
    route: routeFromPage(filePath),
    component: component.name,
    surface: classifySurface(filePath, routeFromPage(filePath), component.name),
    lines: { start: line(component.node.getStart(sourceFile)), end: line(component.node.end) },
    metrics: {
      staticVisibleCharacters: totalChars,
      reviewableStaticCharacters: reviewableChars,
      staticTextBlocks: staticRecords.length,
      byZone: Object.fromEntries([...new Set(staticRecords.map((record) => record.zone))].sort().map((zone) => [zone, { blocks: staticRecords.filter((record) => record.zone === zone).length, characters: staticRecords.filter((record) => record.zone === zone).reduce((sum, record) => sum + record.text.length, 0) }])),
      titleCharacters: titleChars,
      dataCharacters: dataChars,
      actionCharacters: actionChars,
      secondaryCharacters: secondaryChars,
      secondaryToStructuredRatio: secondaryRatio,
      longFieldHelpCount: fieldHelp.filter((record) => record.text.length >= UI_DENSITY_THRESHOLDS.longFieldHelpChars).length,
      dynamicOrConditionalLocations: dynamicLocations.length,
      paragraphsWithDynamicContent: paragraphs.filter((paragraph) => paragraph.dynamic).length,
    },
    paragraphs: paragraphs.map((paragraph) => ({
      line: line(paragraph.start),
      characters: paragraph.text.length,
      dynamicContent: paragraph.dynamic,
      protectedContent: paragraph.protected,
      excerpt: truncate(paragraph.text),
    })),
    dynamicLocations: dynamicLocations.sort((left, right) => left.line - right.line || compareText(left.zone, right.zone)),
    privateAnalysis: {
      internalTermCount,
      repeatedDescriptions: [...duplicateDescriptions.entries()].filter(([, count]) => count > 1).map(([text, occurrences]) => ({ excerpt: truncate(text), occurrences })),
      repeatedCaveats: caveats,
      explanatoryBlocksBeforeFirstPrimaryAction: blocksBeforeAction,
      hasPrimaryActionCandidate: Boolean(firstAction),
    },
    staticText: staticRecords.map((record) => ({ line: line(record.start), zone: record.zone, text: record.text, tags: record.tags })),
  };
}

function addSignal(signals, priority, code, reason, excerpt, line = null) {
  signals.push({ priority, code, reason, excerpt: truncate(excerpt), line });
}

function signalsForComponent(component) {
  const signals = [];
  const { metrics, privateAnalysis, paragraphs, surface } = component;
  const expectsLongCopy = surfaceExpectsLongCopy(surface);
  const longParagraphs = paragraphs.filter((paragraph) => !paragraph.dynamicContent && !paragraph.protectedContent && paragraph.characters >= UI_DENSITY_THRESHOLDS.longParagraphChars);
  for (const paragraph of longParagraphs) {
    if (paragraph.characters >= UI_DENSITY_THRESHOLDS.veryLongParagraphChars && !expectsLongCopy) {
      addSignal(signals, "P1_REVIEW", "VERY_LONG_PARAGRAPH", `Bloc statique de ${paragraph.characters} caractères à relire.`, paragraph.excerpt, paragraph.line);
    } else if (!expectsLongCopy) {
      addSignal(signals, "P2_REVIEW", "LONG_PARAGRAPH", `Bloc statique de ${paragraph.characters} caractères à relire.`, paragraph.excerpt, paragraph.line);
    }
  }
  const oversizedHelp = metrics.longFieldHelpCount > 0;
  if (oversizedHelp) {
    const help = component.staticText.find((entry) => ["helperText", "hint"].includes(entry.zone) && entry.text.length >= UI_DENSITY_THRESHOLDS.longFieldHelpChars);
    addSignal(signals, (help?.text.length ?? 0) >= UI_DENSITY_THRESHOLDS.veryLongFieldHelpChars ? "P1_REVIEW" : "P2_REVIEW", "LONG_FIELD_HELP", `${metrics.longFieldHelpCount} aide(s) statique(s) dépassent ${UI_DENSITY_THRESHOLDS.longFieldHelpChars} caractères.`, help?.text, help?.line ?? null);
  }
  if (!expectsLongCopy && privateAnalysis.hasPrimaryActionCandidate && privateAnalysis.explanatoryBlocksBeforeFirstPrimaryAction >= UI_DENSITY_THRESHOLDS.explanatoryBlocksBeforeAction) {
    addSignal(signals, "P2_REVIEW", "EXPLANATION_BEFORE_ACTION", `${privateAnalysis.explanatoryBlocksBeforeFirstPrimaryAction} blocs de texte précèdent le premier candidat d’action principale.`, component.staticText.find((entry) => entry.zone === "visible-text")?.text);
  }
  if (privateAnalysis.repeatedDescriptions.length > 0) addSignal(signals, "P2_REVIEW", "REPEATED_DESCRIPTION", "Une description ou aide statique est répétée dans le même composant.", privateAnalysis.repeatedDescriptions[0].excerpt);
  if (!expectsLongCopy && privateAnalysis.repeatedCaveats.length > 0) addSignal(signals, "P2_REVIEW", "REPEATED_GENERIC_CAVEAT", "Une précaution générique apparaît plusieurs fois dans le même composant.", privateAnalysis.repeatedCaveats[0].code);
  if (privateAnalysis.internalTermCount > 0) addSignal(signals, privateAnalysis.internalTermCount >= 3 ? "P1_REVIEW" : "P2_REVIEW", "INTERNAL_TERM_VISIBLE", `${privateAnalysis.internalTermCount} occurrence(s) de termes internes dans les textes statiques.`, component.staticText.find((entry) => countInternalTerms(entry.text) > 0)?.text);
  if (!expectsLongCopy && metrics.secondaryCharacters >= UI_DENSITY_THRESHOLDS.secondaryCharsForDensitySignal && (metrics.secondaryToStructuredRatio ?? 0) >= UI_DENSITY_THRESHOLDS.secondaryToStructuredRatio) {
    addSignal(signals, "P2_REVIEW", "SECONDARY_TEXT_DENSITY", `Le volume secondaire représente ${metrics.secondaryToStructuredRatio}:1 par rapport aux titres, données et actions statiques.`, `${metrics.secondaryCharacters} caractères secondaires`);
  }
  if (!expectsLongCopy && metrics.reviewableStaticCharacters >= UI_DENSITY_THRESHOLDS.componentTextVolumeChars) {
    addSignal(signals, "P3_REVIEW", "HIGH_STATIC_TEXT_VOLUME", `${metrics.reviewableStaticCharacters} caractères statiques non protégés mesurés dans le composant.`, `${metrics.staticTextBlocks} blocs mesurés`);
  }
  const actionLine = component.staticText.find((entry) => ACTION_TAGS.has(entry.tags.at(-1)) || entry.tags.at(-1) === "button")?.line ?? null;
  return signals.sort((left, right) => compareText(left.priority, right.priority) || (left.line ?? 0) - (right.line ?? 0) || compareText(left.code, right.code)).map((signal) => ({ ...signal, component: component.component, file: component.file, route: component.route, surface, line: signal.line ?? actionLine }));
}

function analyzeFile(view, filePath) {
  const sourceText = view.readText(filePath);
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, filePath.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX);
  if (sourceFile.parseDiagnostics.length > 0) {
    return { file: filePath, status: "NOT_MEASURED", reason: "TYPESCRIPT_PARSE_ERROR", diagnosticCount: sourceFile.parseDiagnostics.length };
  }
  const components = collectComponentNodes(sourceFile).map((component) => collectComponentEvidence(component, sourceFile, filePath));
  return { file: filePath, status: components.length > 0 ? "MEASURED" : "NO_COMPONENT_FOUND", components };
}

function isUiSourcePath(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  if (!/\.(?:tsx|jsx)$/.test(normalized) || /\.(?:test|spec|stories)\.(?:tsx|jsx)$/.test(normalized)) return false;
  return !/(?:^|\/)(?:__tests__|__fixtures__|fixtures|generated|\.next)(?:\/|$)/.test(normalized);
}

export function summarizeUiDensityReport(report) {
  const files = report.files ?? [];
  const components = files.flatMap((file) => file.components ?? []);
  return {
    filesInScope: files.length,
    filesMeasured: files.filter((file) => file.status === "MEASURED" || file.status === "NO_COMPONENT_FOUND").length,
    filesNotMeasured: files.filter((file) => file.status === "NOT_MEASURED").length,
    componentsMeasured: components.length,
    staticTextCharacters: components.reduce((sum, component) => sum + component.metrics.staticVisibleCharacters, 0),
    dynamicOrConditionalLocations: components.reduce((sum, component) => sum + component.metrics.dynamicOrConditionalLocations, 0),
    signals: components.reduce((sum, component) => sum + component.signals.length, 0),
    byPriority: Object.fromEntries(["P1_REVIEW", "P2_REVIEW", "P3_REVIEW"].map((priority) => [priority, components.reduce((sum, component) => sum + component.signals.filter((signal) => signal.priority === priority).length, 0)])),
    bySurface: Object.fromEntries(["transactional", "pedagogical", "methodological", "legal", "general"].map((surface) => [surface, components.filter((component) => component.surface === surface).length])),
  };
}

export function buildUiDensityNotMeasured({ auditedSha, scope = "all", error } = {}) {
  return {
    schemaVersion: 1,
    kind: "quality-ui-density",
    status: "PASS",
    blocking: false,
    measurementStatus: "MEASUREMENT_FAILED",
    scope: normalizeQualityScope(scope),
    auditedHead: auditedSha,
    readProvenance: "COMMITTED_SNAPSHOT",
    blockingGateEffect: "NONE",
    methodology: {
      engine: "TypeScript JSX AST static source inspection",
      visualDensityProof: "NOT_MEASURED",
      interpretation: "Measurement unavailable; this auxiliary audit does not affect historical gates.",
    },
    summary: {
      filesInScope: 0,
      filesMeasured: 0,
      filesNotMeasured: 1,
      componentsMeasured: 0,
      staticTextCharacters: 0,
      dynamicOrConditionalLocations: 0,
      signals: 0,
      byPriority: { P1_REVIEW: 0, P2_REVIEW: 0, P3_REVIEW: 0 },
      bySurface: { transactional: 0, pedagogical: 0, methodological: 0, legal: 0, general: 0 },
    },
    files: [],
    diagnostics: [{ file: "(source scan)", reason: "MEASUREMENT_FAILED", message: error?.message ?? String(error ?? "Measurement failed") }],
  };
}

export function formatUiDensityReport(report) {
  const lines = [
    "# UI density — revue de texte statique",
    "",
    `- Scope : **${report.scope}**`,
    `- Provenance : **${report.readProvenance}** (${report.auditedHead})`,
    `- Mesure : **${report.measurementStatus}**`,
    `- Fichiers mesurés/non mesurés : **${report.summary.filesMeasured}/${report.summary.filesNotMeasured}**`,
    `- Composants mesurés : **${report.summary.componentsMeasured}**`,
    `- Signaux : P1 ${report.summary.byPriority.P1_REVIEW}, P2 ${report.summary.byPriority.P2_REVIEW}, P3 ${report.summary.byPriority.P3_REVIEW}`,
    `- Contenus dynamiques ou conditionnels non mesurés : **${report.summary.dynamicOrConditionalLocations}**`,
    "",
    "> Ces mesures sont des proxys du texte statique dans le source, pas une mesure du rendu visuel. Les chaînes dynamiques, traductions, conditions et styles peuvent changer le contenu réellement affiché.",
    "",
    "## Répartition par surface",
    "",
    ...Object.entries(report.summary.bySurface).map(([surface, count]) => `- ${surface}: ${count} composants`),
    "",
    "## Signaux à relire",
    "",
  ];
  const signals = (report.files ?? []).flatMap((file) => file.components ?? []).flatMap((component) => component.signals);
  if (signals.length === 0) lines.push("Aucun signal heuristique produit.");
  else for (const signal of signals.sort((left, right) => left.priority < right.priority ? -1 : left.priority > right.priority ? 1 : left.file < right.file ? -1 : left.file > right.file ? 1 : (left.line ?? 0) - (right.line ?? 0) || (left.code < right.code ? -1 : left.code > right.code ? 1 : 0))) {
    lines.push(`- **${signal.priority} ${signal.code}** — ${signal.file}:${signal.line ?? "?"}${signal.route ? ` · route ${signal.route}` : ""} · ${signal.component} · ${signal.surface} — ${signal.reason}${signal.excerpt ? ` — “${signal.excerpt}”` : ""}`);
  }
  lines.push("", "## Limites de mesure", "", ...report.diagnostics.map((diagnostic) => `- ${diagnostic.file}: ${diagnostic.reason}${diagnostic.diagnosticCount ? ` (${diagnostic.diagnosticCount} erreurs de parse)` : ""}`));
  return `${lines.join("\n")}\n`;
}

export function buildUiDensityReport({ root = process.cwd(), auditedSha, scope = "all", repositoryViewFactory = createRepositoryView } = {}) {
  const activeScope = normalizeQualityScope(scope);
  if (!auditedSha) throw new Error("ui-density requires an audited Git SHA.");
  const view = repositoryViewFactory({ root, ref: auditedSha });
  const roots = activeScope === "web" ? ["apps/web/src"] : activeScope === "mobile" ? ["apps/mobile"] : ["apps/web/src", "apps/mobile"];
  const filePaths = roots.flatMap((directory) => view.listFiles(directory)).filter(isUiSourcePath).sort();
  const analyzed = filePaths.map((filePath) => analyzeFile(view, filePath));
  const components = analyzed.flatMap((file) => file.components ?? []).map((component) => ({ ...component, signals: [] }));
  for (const component of components) component.signals = signalsForComponent(component);
  const files = analyzed.map((file) => ({
    file: file.file,
    status: file.status,
    ...(file.reason ? { reason: file.reason, diagnosticCount: file.diagnosticCount } : {}),
    components: components.filter((component) => component.file === file.file).map(({ staticText, ...component }) => component),
  }));
  const report = {
    schemaVersion: 1,
    kind: "quality-ui-density",
    status: "PASS",
    blocking: false,
    measurementStatus: "MEASURED",
    scope: activeScope,
    auditedHead: auditedSha,
    readProvenance: "COMMITTED_SNAPSHOT",
    blockingGateEffect: "NONE",
    methodology: {
      engine: "TypeScript JSX AST static source inspection",
      visualDensityProof: "NOT_MEASURED",
      surfaceCategories: ["transactional", "pedagogical", "methodological", "legal", "general"],
      thresholds: UI_DENSITY_THRESHOLDS,
      exclusions: ["test/spec/story files", "fixtures", "generated source"],
      interpretation: "Heuristics rank human review candidates only; they do not prove that source text renders, is simultaneously visible, or occupies a particular visual area.",
      protectedContent: "Long text with safety, accessibility, legal, error, or alert cues remains measured but is exempt from long-paragraph review signals.",
      surfacePolicy: "Long paragraphs, explanatory-before-action and volume/density signals are not emitted for legal, methodological or pedagogical surfaces; their metrics remain available by surface.",
    },
    summary: null,
    files,
    diagnostics: analyzed.filter((file) => file.status === "NOT_MEASURED").map(({ file, reason, diagnosticCount }) => ({ file, reason, diagnosticCount })),
  };
  report.summary = summarizeUiDensityReport(report);
  report.measurementStatus = report.diagnostics.length > 0 ? "MEASURED_WITH_LIMITS" : "MEASURED";
  return report;
}
