import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const violations = [];

const files = {
  primitive: "apps/web/src/components/ui/cmm-disclosure.tsx",
  legal: "apps/web/src/app/conditions-generales-utilisation/legal-accordion.tsx",
  map: "apps/web/src/app/(app)/actions/map/_components/map-legend.tsx",
  vision: "apps/web/src/components/actions/action-declaration/form/action-declaration-form.vision-fields.tsx",
  quiz: "apps/web/src/components/admin/quiz-bank-admin-view.tsx",
  documentation: "documentation/design-system/DISCLOSURE_ACCORDIONS.md",
};

function absolutePath(relativePath) {
  return path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
}

function readRequired(key) {
  const relativePath = files[key];
  const filePath = absolutePath(relativePath);
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath}: required disclosure file is missing`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function extractScope(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end === -1 ? source.length : end);
}

function extractOpeningTag(source, start) {
  let quote = null;
  let curlyDepth = 0;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") curlyDepth += 1;
    if (character === "}") curlyDepth = Math.max(0, curlyDepth - 1);
    if (character === ">" && curlyDepth === 0) return source.slice(start, index + 1);
  }

  return source.slice(start);
}

function getDisclosureOpeningTags(source) {
  return [...source.matchAll(/<CmmDisclosure\b/g)].map((match) =>
    extractOpeningTag(source, match.index),
  );
}

function requireText(key, text, message = `missing ${text}`) {
  if (!sources[key].includes(text)) violations.push(`${files[key]}: ${message}`);
}

function forbidText(source, key, text, message) {
  if (source.includes(text)) violations.push(`${files[key]}: ${message}: ${text}`);
}

const sources = Object.fromEntries(Object.keys(files).map((key) => [key, readRequired(key)]));

for (const marker of [
  'import { ChevronDown } from "lucide-react"',
  'data-disclosure-tone={tone}',
  'data-disclosure-size={size}',
  'className={cn("cmm-disclosure", className)}',
  "<details",
  "<summary",
  "onToggle=",
  "id={id}",
  "id?: string",
]) {
  requireText("primitive", marker, `primitive contract marker is missing: ${marker}`);
}

for (const marker of [
  "CmmDisclosure",
  "`<details>/<summary>`",
  "Exhaustif",
  "Minimaliste",
  "Sobre",
  "prefers-reduced-motion",
  "hover",
  "tone",
  "size",
]) {
  requireText("documentation", marker, `documentation marker is missing: ${marker}`);
}

const consumerScopes = {
  legal: extractScope(sources.legal, "export function LegalAccordion"),
  map: extractScope(sources.map, "export function MapLegend"),
  vision: extractScope(sources.vision, "export function ActionDeclarationVisionFields"),
  quiz: extractScope(sources.quiz, "function QuestionCard", "export function QuizBankAdminView"),
};

for (const [key, scope] of Object.entries(consumerScopes)) {
  requireText(key, "@/components/ui/cmm-disclosure", "consumer must use CmmDisclosure");
  requireText(key, "<CmmDisclosure", "consumer must render CmmDisclosure");

  for (const localElement of ["<details", "<summary"]) {
    forbidText(scope, key, localElement, "local disclosure markup is forbidden in the migrated scope");
  }

  for (const redundantRecipe of [
    "ChevronDown",
    "Plus",
    "Minus",
    "group-open:",
    "open:",
    "transition-transform",
    "rotate-180",
    "onMouseEnter",
    "onMouseLeave",
    "preventDefault",
  ]) {
    forbidText(scope, key, redundantRecipe, "local disclosure indicator or interaction recipe is forbidden");
  }

  for (const openingTag of getDisclosureOpeningTags(scope)) {
    const visualClass = /(?:^|[\s"'`])(?:bg|border|rounded|p|px|py|shadow|ring|outline|focus|transition|duration|rotate|animate)-[\w/[.:%-]+/;
    if (visualClass.test(openingTag)) {
      violations.push(`${files[key]}: CmmDisclosure cannot receive a local surface, geometry, focus or motion recipe`);
    }
    if (/\bstyle\s*=/.test(openingTag)) {
      violations.push(`${files[key]}: CmmDisclosure cannot receive inline visual styles`);
    }
  }
}

for (const [key, required] of [
  ["legal", ['tone="slate"', 'size="lg"']],
  ["map", ['tone="sky"']],
  ["vision", ['tone="emerald"']],
  ["quiz", ["id={question.id}", "tone={getQuestionTone(question)}"]],
]) {
  for (const marker of required) requireText(key, marker, `migration contract marker is missing: ${marker}`);
}

if (violations.length > 0) {
  console.error("Disclosure governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Disclosure governance check passed: primitive and four representative consumers are protected.");
}
