import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const violations = [];

const files = {
  globals: "apps/web/src/app/globals.css",
  systemState: "apps/web/src/components/ui/system-state.tsx",
  skeleton: "apps/web/src/components/ui/cmm-skeleton.tsx",
  feedback: "apps/web/src/components/ui/cmm-feedback.tsx",
  mapFeed: "apps/web/src/components/actions/map-feed/actions-map-feed.tsx",
  mediaProofs: "apps/web/src/components/actions/signalement-media/signalement-media-proofs.tsx",
  reportDelivery: "apps/web/src/components/reports/web-document/reports-web-document-delivery.tsx",
  chatSearch: "apps/web/src/components/chat/chat-search-panel.tsx",
};

function read(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
  if (!fs.existsSync(absolutePath)) {
    violations.push(`${relativePath}: required canonical file is missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

function requireText(key, text, message = `missing ${text}`) {
  if (!source[key].includes(text)) violations.push(`${files[key]}: ${message}`);
}

function forbidText(key, text, message) {
  if (source[key].includes(text)) violations.push(`${files[key]}: ${message}: ${text}`);
}

for (const variant of ["error", "warning", "empty", "loading", "forbidden", "offline"]) {
  requireText("globals", `data-state-variant="${variant}"`, `missing SystemState variant ${variant}`);
}

for (const tone of ["info", "success", "warning", "error"]) {
  requireText("globals", `data-feedback-tone="${tone}"`, `missing CmmFeedback tone ${tone}`);
}

for (const marker of [
  ".cmm-system-state-shell",
  ".cmm-system-state-content",
  ".cmm-feedback",
  ".cmm-skeleton",
  "cmm-skeleton-shimmer",
  "cmm-skeleton-pulse",
  '[data-display-mode="minimaliste"] .cmm-skeleton',
  '[data-display-mode="sobre"] .cmm-skeleton',
  "@media (prefers-reduced-motion: reduce)",
]) {
  requireText("globals", marker, `missing canonical state/feedback CSS marker ${marker}`);
}

for (const [key, forbidden] of [
  ["systemState", "SYSTEM_STATE_STYLES"],
  ["systemState", "linear-gradient"],
  ["systemState", "backdrop-blur"],
  ["systemState", "shadow-"],
  ["skeleton", "cmm-shimmer"],
  ["skeleton", "animate-pulse"],
  ["skeleton", "bg-slate"],
  ["feedback", "linear-gradient"],
  ["feedback", "backdrop-blur"],
  ["feedback", "shadow-"],
]) {
  forbidText(key, forbidden, "visual recipe must remain in globals.css");
}

const consumerContracts = [
  ["mapFeed", ["@/components/ui/cmm-feedback", "@/components/ui/cmm-skeleton", "<CmmFeedback tone=\"error\""], "map feed states must use canonical primitives"],
  ["mediaProofs", ["@/components/ui/cmm-feedback", "@/components/ui/cmm-skeleton", "<CmmFeedback", "<CmmSkeleton"], "media proof states must use canonical primitives"],
  ["reportDelivery", ["@/components/ui/cmm-feedback", "@/components/ui/system-state", "<SystemStateLayout variant=\"empty\"", "<CmmFeedback"], "report delivery states must use canonical primitives"],
  ["chatSearch", ["@/components/ui/cmm-feedback", "@/components/ui/cmm-skeleton", "<CmmFeedback", "<CmmSkeleton"], "chat search states must use canonical primitives"],
];

for (const [key, required, message] of consumerContracts) {
  for (const marker of required) requireText(key, marker, message);
}

const legacyStateRecipes = [
  ["mapFeed", "bg-[rgba(255,241,245,0.95)]", "map error feedback palette must use CmmFeedback"],
  ["mediaProofs", "LoaderCircle", "media loading must use CmmSkeleton"],
  ["mediaProofs", "animate-spin", "media loading must not use a local spinner animation"],
  ["mediaProofs", "text-rose-700", "media error feedback palette must use CmmFeedback"],
  ["reportDelivery", "exportStatus.tone}", "export status feedback palette must use CmmFeedback"],
  ["reportDelivery", "exportStatus.iconTone}", "export status icon palette must use the primitive"],
  ["reportDelivery", "animate-spin", "report status must not use a local spinner animation"],
  ["reportDelivery", "border-red-200 bg-red-50 text-red-800", "report message palette must use CmmFeedback"],
  ["reportDelivery", "border-amber-200 bg-amber-50", "report warning palette must use CmmFeedback"],
  ["chatSearch", "Loader2", "chat loading must use CmmSkeleton"],
  ["chatSearch", "animate-spin", "chat loading must not use a local spinner animation"],
  ["chatSearch", "text-xs text-rose-700", "chat error palette must use CmmFeedback"],
];

for (const [key, forbidden, message] of legacyStateRecipes) {
  forbidText(key, forbidden, message);
}

if (violations.length > 0) {
  console.error("States & Feedback governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("States & Feedback governance check passed: canonical primitives and four migrated consumers are protected.");
}
