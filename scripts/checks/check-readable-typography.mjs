import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

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
];

const smallTextPattern = /text-\[(?:(?:[0-9]|1[01])px|0\.(?:[0-6]\d?|7[0-4]?)rem)\]/;
const truncationPattern = /\b(?:truncate|line-clamp(?:-[1-9]\d*)?)\b/;

function isUserSurface(file) {
  return (
    file.startsWith("apps/web/src/app/") ||
    file.startsWith("apps/web/src/components/navigation/") ||
    file.startsWith("apps/web/src/components/account/") ||
    file.startsWith("apps/web/src/components/chat/") ||
    file.startsWith("apps/web/src/components/admin/")
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
      (rule === "small-text" || truncationPattern.test(line)),
  );
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

    if (smallTextPattern.test(text)) {
      if (isAllowlisted(file, "small-text", text)) {
        allowlisted.push({ file, rule: "small-text" });
      } else {
        violations.push({ file, rule: "small-text", text });
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
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" });
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
