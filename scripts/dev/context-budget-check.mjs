import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const RULES = [
  { path: "AGENTS.md", maxLines: 240, required: true },
  { path: "documentation/sessions/project_context.md", maxLines: 180, required: true },
  { path: "documentation/sessions/history/latest-session.md", maxLines: 140, required: true },
  { path: "documentation/sessions/context/economie_token_prompt_template.md", maxLines: 80, required: true },
];

function lineCount(content) {
  const normalized = content.trimEnd();
  if (!normalized.trim()) {
    return 0;
  }
  return normalized.split(/\r?\n/).length;
}

function checkRule(rule) {
  const absolutePath = join(ROOT, rule.path);
  if (!existsSync(absolutePath)) {
    return {
      path: rule.path,
      ok: !rule.required,
      message: rule.required ? "missing required file" : "optional file missing",
    };
  }

  const content = readFileSync(absolutePath, "utf8");
  const lines = lineCount(content);
  const ok = lines <= rule.maxLines;
  return {
    path: rule.path,
    ok,
    lines,
    maxLines: rule.maxLines,
    message: ok
      ? `ok (${lines}/${rule.maxLines} lines)`
      : `over budget (${lines}/${rule.maxLines} lines)`,
  };
}

function checkBootstrapScope() {
  const bootstrapPath = join(ROOT, "scripts", "dev", "session_bootstrap.mjs");
  if (!existsSync(bootstrapPath)) {
    return {
      ok: false,
      message: "scripts/dev/session_bootstrap.mjs missing",
    };
  }
  const content = readFileSync(bootstrapPath, "utf8");
  const forbidden = [
    "documentation/sessions/context/",
    "documentation/sessions/assets/",
    "documentation/sessions/templates/",
  ];
  const found = forbidden.filter((needle) => content.includes(needle));
  const historyLoads = [...content.matchAll(/documentation\/sessions\/history\/([^`"']+)/g)]
    .map((match) => match[1])
    .filter((relativePath) => relativePath !== "latest-session.md");
  if (/\breadFile(?:Sync)?\b/.test(content)) {
    found.push("bootstrap reads file content");
  }
  if (historyLoads.length > 0) {
    found.push(`non-canonical session history: ${historyLoads.join(", ")}`);
  }

  return found.length === 0
    ? { ok: true, message: "bootstrap scope ok (no heavyweight session resources)" }
    : {
        ok: false,
        message: `bootstrap must only verify canonical sources: ${found.join(", ")}`,
      };
}

function main() {
  const results = RULES.map(checkRule);
  const bootstrapScope = checkBootstrapScope();
  let failed = false;

  console.log("Context budget check:");
  for (const result of results) {
    const prefix = result.ok ? "OK" : "FAIL";
    console.log(`- [${prefix}] ${result.path}: ${result.message}`);
    if (!result.ok) {
      failed = true;
    }
  }

  const bootstrapPrefix = bootstrapScope.ok ? "OK" : "FAIL";
  console.log(`- [${bootstrapPrefix}] bootstrap scope: ${bootstrapScope.message}`);
  if (!bootstrapScope.ok) {
    failed = true;
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }
  console.log("Context budget is within limits.");
}

main();
