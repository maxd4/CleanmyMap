import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const violations = [];

const files = {
  primitive: "apps/web/src/components/ui/cmm-badge.tsx",
  styles: "apps/web/src/styles/indicators.css",
  sourceBadge: "apps/web/src/components/ui/page-structure.tsx",
  gamification: "apps/web/src/components/gamification/badge-ui.tsx",
  admin: "apps/web/src/components/admin/admin-dashboard-ui.tsx",
  map: "apps/web/src/components/actions/map/map-geometry-tooltip-content.tsx",
  documentation: "documentation/design-system/INDICATORS_BADGES.md",
};

function absolutePath(relativePath) {
  return path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
}

function read(key) {
  const relativePath = files[key];
  const filePath = absolutePath(relativePath);
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath}: required indicators file is missing`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

const sources = Object.fromEntries(Object.keys(files).map((key) => [key, read(key)]));

function requireText(key, text, message = `missing ${text}`) {
  if (!sources[key].includes(text)) violations.push(`${files[key]}: ${message}`);
}

function forbidText(source, key, text, message) {
  if (source.includes(text)) violations.push(`${files[key]}: ${message}: ${text}`);
}

function extractScope(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end === -1 ? source.length : end);
}

function count(source, marker) {
  return source.split(marker).length - 1;
}

for (const marker of [
  "ReactNode",
  "CmmBadgeTone",
  "CmmBadgeSize",
  "CmmBadgeShape",
  "children: ReactNode",
  "tone?: CmmBadgeTone",
  "size?: CmmBadgeSize",
  "shape?: CmmBadgeShape",
  'className={cn("cmm-badge", className)}',
  "data-badge-tone={tone}",
  "data-badge-size={size}",
  "data-badge-shape={shape}",
  "<span",
]) {
  requireText("primitive", marker, `primitive contract marker is missing: ${marker}`);
}

for (const marker of [
  ".cmm-badge",
  "--cmm-badge-background",
  "--cmm-badge-border",
  "--cmm-badge-text",
  "data-badge-tone",
  "data-badge-size",
  "data-badge-shape",
  ".cmm-badge--on-dark",
  '[data-display-mode="exhaustif"] .cmm-badge',
  '[data-display-mode="minimaliste"] .cmm-badge',
  '[data-display-mode="sobre"] .cmm-badge',
  'html[data-theme="dark"] .cmm-badge',
  "background-image: none",
]) {
  requireText("styles", marker, `canonical badge CSS marker is missing: ${marker}`);
}

for (const marker of [
  "CmmBadge",
  "SourceBadge",
  "role ARIA implicite",
  "shape=\"rounded\"",
  "shape=\"pill\"",
  "CmmFeedback",
  "SystemState",
  "GamificationStatePill → composant métier → CmmBadge",
  "Exhaustif",
  "Minimaliste",
  "Sobre",
]) {
  requireText("documentation", marker, `documentation marker is missing: ${marker}`);
}

const sourceBadgeScope = extractScope(
  sources.sourceBadge,
  "export function SourceBadge",
  "export type ActionCardProps",
);
for (const marker of [
  "CmmBadge",
  "<CmmBadge",
  "tone={tone}",
  "size=\"sm\"",
  "shape=\"rounded\"",
  "className={className}",
]) {
  if (!sourceBadgeScope.includes(marker)) {
    violations.push(`${files.sourceBadge}: SourceBadge contract marker is missing: ${marker}`);
  }
}
forbidText(
  sourceBadgeScope,
  "sourceBadge",
  "inline-flex items-center rounded-xl border",
  "SourceBadge must not reintroduce a local badge recipe",
);

const gamificationScope = extractScope(
  sources.gamification,
  "export function GamificationStatePill",
  "export function GamificationMetricChip",
);
for (const marker of ['vide: "muted"', 'actif: "sky"', 'debloque: "emerald"']) {
  requireText("gamification", marker, `GamificationStatePill tone mapping is missing: ${marker}`);
}
for (const marker of [
  "CmmBadge",
  "<CmmBadge",
  "BADGE_STATE_TONES",
  "shape=\"pill\"",
  "cmm-badge--on-dark",
]) {
  if (!gamificationScope.includes(marker)) {
    violations.push(`${files.gamification}: GamificationStatePill contract marker is missing: ${marker}`);
  }
}
for (const forbidden of [
  "BADGE_STATE_STYLES",
  "rounded-full",
  "border-white/10",
  "bg-cyan-500/10",
  "px-2.5 py-1",
  "tracking-[0.18em]",
]) {
  forbidText(
    gamificationScope,
    "gamification",
    forbidden,
    "GamificationStatePill must not carry a local badge recipe",
  );
}

const adminScope = extractScope(
  sources.admin,
  "export function AdminHeroStrip",
  "export function AdminPillLink",
);
for (const marker of [
  "CmmBadge",
  "<CmmBadge",
  "tone=\"slate\"",
  "size=\"md\"",
  "shape=\"pill\"",
  "cmm-badge--on-dark",
  "{accessLabel}",
]) {
  if (!adminScope.includes(marker)) {
    violations.push(`${files.admin}: AdminHeroStrip badge contract marker is missing: ${marker}`);
  }
}
for (const forbidden of [
  "inline-flex items-center rounded-full border border-white/12 bg-white/10 px-4 py-2",
  "border-white/12 bg-white/10 px-4 py-2",
]) {
  forbidText(
    adminScope,
    "admin",
    forbidden,
    "AdminHeroStrip must not carry a local static badge recipe",
  );
}

const mapScope = extractScope(sources.map, "export function GeometryTooltipContent");
if (count(mapScope, "<CmmBadge") !== 3) {
  violations.push(`${files.map}: geometry tooltip must render exactly three CmmBadge capsules`);
}
for (const marker of [
  "geometryPointsLabel",
  "geometryMetricLabel",
  "geometryConfidenceLabel",
  "shape=\"pill\"",
]) {
  if (!mapScope.includes(marker)) {
    violations.push(`${files.map}: geometry capsule contract marker is missing: ${marker}`);
  }
}
if (!sources.map.includes("@/components/ui/cmm-badge")) {
  violations.push(`${files.map}: geometry tooltip must import CmmBadge from the canonical primitive`);
}
for (const forbidden of [
  "inline-flex items-center gap-1 rounded-full border",
  "inline-flex items-center rounded-full border",
  "border-slate-200 bg-slate-50 px-2 py-0.5",
  "dark:border-slate-700 dark:bg-slate-900",
]) {
  forbidText(
    mapScope,
    "map",
    forbidden,
    "geometry capsules must not carry a local badge recipe",
  );
}

if (violations.length > 0) {
  console.error("Indicators governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Indicators governance check passed: CmmBadge and four representative badge consumers are protected.");
}
