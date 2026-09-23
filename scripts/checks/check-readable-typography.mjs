import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const MAX_DIFF_BUFFER_BYTES = 16 * 1024 * 1024;

// Exceptions are deliberately narrow: previews and technical/export surfaces
// may stay compact, but ordinary labels and instructions may not.
const allowlist = [
  {
    file: "apps/web/src/app/(app)/prints/report/page.tsx",
    rule: "small-text",
    reason: "print/export metadata keeps its compact document layout",
  },
  {
    file: "apps/web/src/components/notifications/notification-list-item.tsx",
    rule: "truncation",
    reason: "notification title/body are intentional compact previews",
  },
  {
    file: "apps/web/src/components/chat/chat-search-panel.tsx",
    rule: "truncation",
    reason: "search result description is an intentional two-line preview",
  },
  {
    file: "apps/web/src/app/(app)/prints/report/page.tsx",
    rule: "body-color",
    reason: "print/export document styles are kept independent from screen surfaces",
  },
  {
    file: "apps/web/src/components/environmental-impact-estimator/environmental-impact-estimator-panel-details-environment.tsx",
    rule: "small-text",
    reason: "environmental estimator detail typography preserves the historical visual contract",
  },
  {
    file: "apps/web/src/components/environmental-impact-estimator/environmental-impact-estimator-panel-details-environment.tsx",
    rule: "body-color",
    reason: "environmental estimator detail typography preserves the historical visual contract",
  },
  {
    file: "apps/web/src/components/environmental-impact-estimator/environmental-impact-estimator-panel-details-infrastructure.tsx",
    rule: "small-text",
    reason: "environmental estimator detail typography preserves the historical visual contract",
  },
  {
    file: "apps/web/src/components/environmental-impact-estimator/environmental-impact-estimator-panel-details-infrastructure.tsx",
    rule: "body-color",
    reason: "environmental estimator detail typography preserves the historical visual contract",
  },
  {
    file: "apps/web/src/components/environmental-impact-estimator/environmental-impact-estimator-panel-details-audit.tsx",
    rule: "small-text",
    reason: "environmental estimator detail typography preserves the historical visual contract",
  },
  {
    file: "apps/web/src/components/environmental-impact-estimator/environmental-impact-estimator-panel-details-audit.tsx",
    rule: "body-color",
    reason: "environmental estimator detail typography preserves the historical visual contract",
  },
];

const smallTextPattern = /text-\[((?:\d+(?:\.\d+)?|\.\d+))(px|rem)\]/g;
const MIN_READABLE_FONT_SIZE_PX = 12;
const ROOT_FONT_SIZE_PX = 16;
const truncationPattern = /\b(?:truncate|line-clamp(?:-[1-9]\d*)?)\b/;
const weakBodyColorPattern =
  /\b(?:cmm-text-(?:secondary|muted)|text-(?:slate|gray|stone)-[4-7]\d{2}(?:\/[5-9]\d)?|text-(?:white|[a-z]+)-\d{2,3}\/(?:[2-7]\d))\b/;
const bodyMeasurePattern =
  /\b(?:cmm-text-body|text-(?:base|lg|xl|2xl)|leading-(?:6|relaxed))\b/;

function isUserSurface(file) {
  return (
    file.startsWith("apps/web/src/app/") ||
    file.startsWith("apps/web/src/components/")
  );
}

function isNavigationSurface(file) {
  return file.startsWith("apps/web/src/components/navigation/");
}

function isAllowlisted(file, rule, line) {
  return allowlist.some(
    (entry) =>
      entry.file === file &&
      entry.rule === rule &&
      (rule === "small-text" ||
        rule === "body-color" ||
        truncationPattern.test(line)),
  );
}

function extractSmallTextSizes(text) {
  const matches = [];
  for (const match of text.matchAll(smallTextPattern)) {
    const value = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(value)) continue;

    const sizeInPixels = unit === "rem" ? value * ROOT_FONT_SIZE_PX : value;
    if (sizeInPixels < MIN_READABLE_FONT_SIZE_PX) {
      matches.push({ value, unit, sizeInPixels });
    }
  }
  return matches;
}

function isWeakBodyColor(text) {
  if (!bodyMeasurePattern.test(text) || !weakBodyColorPattern.test(text)) {
    return false;
  }

  // Captions, small metadata, uppercase labels and tracking-based eyebrows are
  // intentionally excluded; this rule protects ordinary reading copy only.
  return !/\b(?:cmm-text-(?:caption|small)|uppercase|tracking-)\b/.test(text);
}

export function extractAddedLines(diff) {
  const addedLines = [];
  let currentFile = null;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice("+++ b/".length);
      continue;
    }
    if (line.startsWith("diff --git ") || line.startsWith("--- ")) {
      continue;
    }
    if (currentFile && line.startsWith("+") && !line.startsWith("+++")) {
      addedLines.push({ file: currentFile, text: line.slice(1) });
    }
  }

  return addedLines;
}

export function analyzeDiff(diff) {
  const violations = [];
  const allowlisted = [];

  for (const { file, text } of extractAddedLines(diff)) {
    if (!isUserSurface(file) || /\.test\.[jt]sx?$/.test(file)) continue;

    if (extractSmallTextSizes(text).length > 0) {
      if (isAllowlisted(file, "small-text", text)) {
        allowlisted.push({ file, rule: "small-text" });
      } else {
        violations.push({ file, rule: "small-text", text });
      }
    }

    if (isWeakBodyColor(text)) {
      if (isAllowlisted(file, "body-color", text)) {
        allowlisted.push({ file, rule: "body-color" });
      } else {
        violations.push({ file, rule: "body-color", text });
      }
    }

    if (isNavigationSurface(file) && truncationPattern.test(text)) {
      if (isAllowlisted(file, "truncation", text)) {
        allowlisted.push({ file, rule: "truncation" });
      } else {
        violations.push({ file, rule: "truncation", text });
      }
    }

    if (file === "apps/web/src/components/ui/page-header.tsx" && truncationPattern.test(text)) {
      if (isAllowlisted(file, "truncation", text)) {
        allowlisted.push({ file, rule: "truncation" });
      } else {
        violations.push({ file, rule: "truncation", text });
      }
    }
  }

  return { violations, allowlisted };
}

function readDiff({ staged }) {
  const args = ["diff", "--unified=0"];
  if (staged) args.push("--cached");
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: MAX_DIFF_BUFFER_BYTES,
  });
}

function main() {
  const staged = process.argv.includes("--staged");
  const result = analyzeDiff(readDiff({ staged }));

  if (result.violations.length > 0) {
    console.error("Readable typography check failed:");
    for (const violation of result.violations) {
      console.error(`- ${violation.file}: ${violation.rule}: ${violation.text.trim()}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Readable typography check passed (${staged ? "STAGED" : "WORKTREE"}): ${result.allowlisted.length} documented exception(s).`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
