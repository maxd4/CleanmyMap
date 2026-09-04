import fs from "node:fs";
import path from "node:path";

export const MOTION_PATHS = {
  motionCss: "apps/web/src/styles/motion.css",
  displayModesCss: "apps/web/src/styles/display-modes.css",
  pageTransition: "apps/web/src/components/ui/page-transition.tsx",
  punchySlogan: "apps/web/src/components/ui/punchy-slogan.tsx",
  pageStructure: "apps/web/src/components/ui/page-structure.tsx",
  documentation: "documentation/design-system/MOTION_TRANSITIONS.md",
  readme: "documentation/design-system/README.md",
  package: "package.json",
};

function absolutePath(repositoryRoot, relativePath) {
  return path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
}

function requireText(source, filePath, marker, violations) {
  if (!source.includes(marker)) {
    violations.push(`${filePath}: missing Motion governance marker ${marker}`);
  }
}

function readRequired(repositoryRoot, relativePath, violations) {
  const filePath = absolutePath(repositoryRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath}: required Motion file is missing`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

export function extractScope(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end === -1 ? source.length : end);
}

export function auditMotionCss(source, filePath = MOTION_PATHS.motionCss) {
  const violations = [];
  for (const marker of [
    ".cmm-hover-lift",
    ".cmm-active-press",
    ".cmm-icon-nudge-x",
    "@media (prefers-reduced-motion: reduce)",
    "transition: none !important",
    "transform: none !important",
  ]) {
    requireText(source, filePath, marker, violations);
  }
  return violations;
}

export function auditDisplayModesCss(source, filePath = MOTION_PATHS.displayModesCss) {
  const violations = [];
  for (const marker of [
    '[data-display-mode="minimaliste"] .cmm-hover-lift:hover',
    '[data-display-mode="minimaliste"] .group:hover .cmm-icon-nudge-x',
    '[data-display-mode="sobre"] .cmm-hover-lift',
    '[data-display-mode="sobre"] .cmm-icon-nudge-x',
    '[data-display-mode="sobre"] .cmm-sober-animate',
    "transition: none !important",
    "transform: none !important",
  ]) {
    requireText(source, filePath, marker, violations);
  }
  return violations;
}

function auditConsumer(source, filePath) {
  const violations = [];
  for (const marker of [
    "useReducedMotion",
    "useSitePreferences",
    "displayMode",
    "minimaliste",
    "sobre",
  ]) {
    requireText(source, filePath, marker, violations);
  }
  return violations;
}

export function auditPageTransition(source, filePath = MOTION_PATHS.pageTransition) {
  const violations = auditConsumer(source, filePath);
  for (const marker of ["animate=", "exit=", "blur(10px)", "duration: 0.2", "duration: 0"]) {
    requireText(source, filePath, marker, violations);
  }
  return violations;
}

export function auditPunchySlogan(source, filePath = MOTION_PATHS.punchySlogan) {
  const violations = auditConsumer(source, filePath);
  for (const marker of ["isSober", "isMinimal", "duration: 0.2"]) {
    requireText(source, filePath, marker, violations);
  }
  if (/isSober\s*=.*shouldReduceMotion/.test(source)) {
    violations.push(`${filePath}: shouldReduceMotion must not be assimilated to isSober`);
  }
  return violations;
}

export function auditActionCard(source, filePath = MOTION_PATHS.pageStructure) {
  const violations = [];
  const actionCard = extractScope(source, "export function ActionCard", "export type CTAGroupProps");
  if (!actionCard) {
    violations.push(`${filePath}: ActionCard scope is missing`);
    return violations;
  }

  for (const marker of [
    "cmm-hover-lift",
    'size="lg"',
    'size="sm"',
    "cmm-icon-nudge-x",
  ]) {
    requireText(actionCard, filePath, marker, violations);
  }

  if (actionCard.includes("transition-all duration-300 hover:-translate-y-0.5")) {
    violations.push(`${filePath}: ActionCard keeps the forbidden local lift recipe`);
  }
  if (actionCard.includes("group-hover:translate-x-1")) {
    violations.push(`${filePath}: ActionCard keeps the forbidden local icon nudge recipe`);
  }
  return violations;
}

export function auditMotionRepository(repositoryRoot) {
  const violations = [];
  const sources = Object.fromEntries(
    Object.entries(MOTION_PATHS).map(([name, relativePath]) => [
      name,
      readRequired(repositoryRoot, relativePath, violations),
    ]),
  );

  violations.push(...auditMotionCss(sources.motionCss));
  violations.push(...auditDisplayModesCss(sources.displayModesCss));
  violations.push(...auditPageTransition(sources.pageTransition));
  violations.push(...auditPunchySlogan(sources.punchySlogan));
  violations.push(...auditActionCard(sources.pageStructure));

  for (const marker of ["MOTION_TRANSITIONS.md", "CmmIcon", "check:motion"]) {
    requireText(sources.readme, MOTION_PATHS.readme, marker, violations);
  }
  for (const marker of ["**Statut : `CURRENT`**", "prefers-reduced-motion", "useReducedMotion", "motion.css", "display-modes.css", "Maps", "legacy Motion"]) {
    requireText(sources.documentation, MOTION_PATHS.documentation, marker, violations);
  }
  requireText(sources.package, MOTION_PATHS.package, '"check:motion": "node scripts/checks/check-motion-governance.mjs"', violations);

  return violations;
}

if (import.meta.main) {
  const repositoryRoot = path.resolve(import.meta.dirname, "../..");
  const violations = auditMotionRepository(repositoryRoot);
  if (violations.length > 0) {
    console.error("Motion governance check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log("Motion governance check passed: canonical consumers, helpers, modes, and documentation are protected.");
  }
}
