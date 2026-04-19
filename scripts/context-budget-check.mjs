import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const RULES = [
  { path: "AGENTS.md", maxLines: 80, required: true },
  { path: "project_context.md", maxLines: 180, required: true },
  { path: "documentation/du/session/latest-session.md", maxLines: 140, required: true },
  { path: "documentation/du/session/session_bootstrap.txt", maxLines: 3, required: true },
  { path: "documentation/du/economie/economie_token_prompt_template.md", maxLines: 80, required: true },
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
  const bootstrapPath = join(ROOT, "scripts", "session_bootstrap.mjs");
  if (!existsSync(bootstrapPath)) {
    return {
      ok: false,
      message: "scripts/session_bootstrap.mjs missing",
    };
  }
  const content = readFileSync(bootstrapPath, "utf8");
  const forbidden = ["documentation/du/archive/prompt_codex.txt", "documentation/du/economie/economie_token.txt"];
  const found = forbidden.filter((needle) => content.includes(needle));
  return found.length === 0
    ? { ok: true, message: "bootstrap scope ok (no heavyweight DU files)" }
    : {
        ok: false,
        message: `bootstrap loads heavyweight files: ${found.join(", ")}`,
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
