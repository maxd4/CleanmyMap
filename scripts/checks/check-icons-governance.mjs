import fs from "node:fs";
import path from "node:path";

export const CMM_ICON_PATH = "apps/web/src/components/ui/cmm-icon.tsx";
export const ICON_DOCUMENTATION_PATH = "documentation/design-system/ICONS.md";

export const CANONICAL_CONSUMERS = new Map([
  [
    "apps/web/src/components/ui/cmm-disclosure.tsx",
    [
      "CmmIcon",
      "<CmmIcon",
      "icon={ChevronDown}",
      "size=\"lg\"",
      "className=\"cmm-disclosure__icon\"",
    ],
  ],
  [
    "apps/web/src/components/ui/page-structure.tsx",
    [
      "CmmIcon",
      "<CmmIcon icon={Icon} size=\"lg\"",
      "icon={ArrowRight}",
      "size=\"sm\"",
    ],
  ],
  [
    "apps/web/src/app/error/429/page.tsx",
    ["CmmIcon", "icon={Gauge}", "size=\"xl\""],
  ],
]);

function normalizeRepositoryPath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function requireText(source, filePath, marker, violations) {
  if (!source.includes(marker)) violations.push(`${filePath}: missing icon contract marker ${marker}`);
}

function extractScope(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end === -1 ? source.length : end);
}

function extractObjectBody(source, declaration) {
  const start = source.search(new RegExp(`const\\s+${declaration}\\b[^=]*=\\s*\\{`));
  if (start === -1) return "";

  const openingBrace = source.indexOf("{", start);
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }

  return "";
}

const CANONICAL_SIZE_CLASSES = new Map([
  ["xs", "h-3.5 w-3.5"],
  ["sm", "h-4 w-4"],
  ["md", "h-5 w-5"],
  ["lg", "h-6 w-6"],
  ["xl", "h-7 w-7"],
]);

function readSizeClasses(source) {
  const body = extractObjectBody(source, "sizeClasses");
  return new Map(
    [...body.matchAll(/^\s*([a-z]+)\s*:\s*["']([^"']+)["']\s*,?/gim)].map(
      ([, size, classes]) => [size, classes],
    ),
  );
}

function sameMap(left, right) {
  if (left.size !== right.size) return false;
  for (const [key, value] of right) {
    if (left.get(key) !== value) return false;
  }
  return true;
}

export function auditCmmIconSource(source, filePath = CMM_ICON_PATH) {
  const violations = [];
  const propsScope = extractScope(source, "export interface CmmIconProps", "}");

  for (const marker of [
    "icon: LucideIcon",
    "size?: CmmIconSize",
    "className?: string",
    "label?: string",
    'export type CmmIconSize = "xs" | "sm" | "md" | "lg" | "xl"',
    'xs: "h-3.5 w-3.5"',
    'sm: "h-4 w-4"',
    'md: "h-5 w-5"',
    'lg: "h-6 w-6"',
    'xl: "h-7 w-7"',
    'size = "md"',
    "data-cmm-icon-size={size}",
    'className={cn("shrink-0", sizeClasses[size], className)}',
    "focusable=\"false\"",
    "aria-hidden={isDecorative ? true : undefined}",
    'role={isDecorative ? undefined : "img"}',
    "aria-label={label}",
  ]) {
    requireText(source, filePath, marker, violations);
  }

  const sizeType = source.match(/export type\s+CmmIconSize\s*=\s*([^;]+);/);
  if (sizeType?.[1].replace(/\s+/g, " ").trim() !== '"xs" | "sm" | "md" | "lg" | "xl"') {
    violations.push(`${filePath}: CmmIconSize must be exactly xs | sm | md | lg | xl`);
  }

  if (!sameMap(readSizeClasses(source), CANONICAL_SIZE_CLASSES)) {
    violations.push(`${filePath}: CmmIcon sizeClasses must contain only the canonical sizes`);
  }

  if (source.includes('"use client"')) {
    violations.push(`${filePath}: CmmIcon must remain Server-compatible without use client`);
  }

  for (const forbidden of [
    /\btone\??\s*:/,
    /\bcolor\??\s*:/,
    /\bstrokeWidth\??\s*:/,
    /\bsize\??\s*:\s*(?:number|\d+(?:\.\d+)?)/,
    /\bsize\s*=\s*(?:\d|["']\d|\{\s*\d)/,
    /\b(?:animation|transition|animate|motion)\b/,
  ]) {
    if (forbidden.test(propsScope) || forbidden.test(source)) {
      violations.push(`${filePath}: forbidden CmmIcon API or motion recipe detected: ${forbidden}`);
    }
  }

  return violations;
}

export function auditCanonicalConsumer(filePath, source) {
  const normalizedPath = normalizeRepositoryPath(filePath);
  const violations = [];
  const requiredMarkers = CANONICAL_CONSUMERS.get(normalizedPath) ?? [];

  for (const marker of requiredMarkers) requireText(source, normalizedPath, marker, violations);

  if (normalizedPath.endsWith("cmm-disclosure.tsx") && /<ChevronDown\b/.test(source)) {
    violations.push(`${normalizedPath}: Disclosure must not render ChevronDown directly`);
  }
  if (normalizedPath.endsWith("page-structure.tsx")) {
    const actionCardScope = extractScope(source, "export function ActionCard", "export type CTAGroupProps");
    if (/<Icon\b/.test(actionCardScope) || /<ArrowRight\b/.test(actionCardScope)) {
      violations.push(`${normalizedPath}: ActionCard must render icons through CmmIcon`);
    }
  }
  if (normalizedPath.endsWith("error/429/page.tsx") && /<Gauge\b/.test(source)) {
    violations.push(`${normalizedPath}: /error/429 must render Gauge through CmmIcon`);
  }

  return violations;
}

function absolutePath(repositoryRoot, relativePath) {
  return path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
}

function readRequired(repositoryRoot, relativePath, violations) {
  const filePath = absolutePath(repositoryRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath}: required Icons file is missing`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

export function auditIconsRepository(repositoryRoot) {
  const violations = [];
  const iconSource = readRequired(repositoryRoot, CMM_ICON_PATH, violations);
  const documentation = readRequired(repositoryRoot, ICON_DOCUMENTATION_PATH, violations);
  const readmePath = "documentation/design-system/README.md";
  const readme = readRequired(repositoryRoot, readmePath, violations);

  violations.push(...auditCmmIconSource(iconSource));

  for (const [filePath] of CANONICAL_CONSUMERS) {
    const source = readRequired(repositoryRoot, filePath, violations);
    violations.push(...auditCanonicalConsumer(filePath, source));
  }

  for (const marker of ["CmmIcon", "ICONS.md", "check:icons"]) {
    requireText(readme, readmePath, marker, violations);
  }
  for (const marker of [
    "lucide-react",
    "CmmIcon",
    "currentColor",
    "aria-hidden",
    "role=\"img\"",
    "strokeWidth",
    "RubriqueCard",
    "Print/Export",
  ]) {
    requireText(documentation, ICON_DOCUMENTATION_PATH, marker, violations);
  }

  return violations;
}

if (import.meta.main) {
  const repositoryRoot = path.resolve(import.meta.dirname, "../..");
  const violations = auditIconsRepository(repositoryRoot);
  if (violations.length > 0) {
    console.error("Icons governance check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log("Icons governance check passed: CmmIcon and its three canonical consumers are protected.");
  }
}
