import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { gitExecutable } from "./git-executable.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

const EMPTY_SCOPE = Object.freeze({
  docsOnly: false,
  webCodeRelevant: false,
  mobileCodeRelevant: false,
  buildRelevant: false,
  dependencyGraphRelevant: false,
  dependencyAuditRelevant: false,
  securityToolingRelevant: false,
});

const FULL_SCOPE = Object.freeze({
  docsOnly: false,
  webCodeRelevant: true,
  mobileCodeRelevant: true,
  buildRelevant: true,
  dependencyGraphRelevant: true,
  dependencyAuditRelevant: true,
  securityToolingRelevant: true,
});

const OUTPUT_KEYS = Object.freeze({
  docsOnly: "docs_only",
  webCodeRelevant: "web_code_relevant",
  mobileCodeRelevant: "mobile_code_relevant",
  buildRelevant: "build_relevant",
  dependencyGraphRelevant: "dependency_graph_relevant",
  dependencyAuditRelevant: "dependency_audit_relevant",
  securityToolingRelevant: "security_tooling_relevant",
});

function normalize(value) {
  return String(value ?? "").trim();
}

function isZeroSha(value) {
  return /^0+$/.test(normalize(value));
}

function assertSha(value, label) {
  const normalized = normalize(value);
  if (!SHA_PATTERN.test(normalized)) {
    throw new Error(`Invalid ${label}: '${normalized}'`);
  }
  return normalized;
}

function emptySelection(candidateSha, reason) {
  return Object.freeze({
    kind: "empty",
    candidateSha,
    baseSha: null,
    reason,
  });
}

export function resolveCiScopeSelection({
  eventName,
  validationMode = "DEVELOPMENT",
  eventBefore = "",
  eventSha = "",
  prBaseSha = "",
  prHeadSha = "",
} = {}) {
  const event = normalize(eventName);
  const mode = normalize(validationMode).toUpperCase() || "DEVELOPMENT";

  if (event === "workflow_dispatch") {
    const candidateSha = assertSha(eventSha, "workflow_dispatch candidate SHA");
    if (mode === "FULL") {
      return Object.freeze({
        kind: "full",
        candidateSha,
        baseSha: null,
        reason: "workflow_dispatch FULL is independent of the diff",
      });
    }
    if (mode === "DEVELOPMENT") {
      return emptySelection(candidateSha, "workflow_dispatch DEVELOPMENT has no base SHA");
    }
    throw new Error(`Unsupported workflow_dispatch validation mode: ${mode}`);
  }

  if (event !== "push" && event !== "pull_request") {
    throw new Error(`Unsupported GitHub event: ${event || "<empty>"}`);
  }

  const candidateSha = assertSha(
    event === "pull_request" ? prHeadSha : eventSha,
    `${event} candidate SHA`,
  );
  const rawBaseSha = event === "pull_request" ? prBaseSha : eventBefore;

  // A branch-creation push and an incomplete/manual event can legitimately
  // have no comparable parent. Do not invent a root commit or pass an empty
  // value to git diff; keep DEVELOPMENT explicitly empty instead.
  if (!normalize(rawBaseSha) || isZeroSha(rawBaseSha)) {
    return emptySelection(candidateSha, `${event} has no base SHA`);
  }

  const baseSha = assertSha(rawBaseSha, `${event} base SHA`);
  return Object.freeze({
    kind: "diff",
    candidateSha,
    baseSha,
    reason: `${event} diff scope`,
  });
}

function gitHasCommit(repositoryRoot, sha, label) {
  try {
    execFileSync(gitExecutable(), ["cat-file", "-e", `${sha}^{commit}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
  } catch {
    throw new Error(`Invalid ${label} commit: '${sha}'`);
  }
}

function getChangedFiles(repositoryRoot, baseSha, candidateSha) {
  const output = execFileSync(gitExecutable(), ["diff", "--name-only", baseSha, candidateSha], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function deriveChangedScope(repositoryRoot, changedFiles) {
  const files = [...new Set(changedFiles.map((file) => String(file).replaceAll("\\", "/")))];
  let docsOnly = true;
  let webCodeRelevant = false;
  let mobileCodeRelevant = false;
  const policyArgs = ["scripts/checks/validation-policy.mjs", "--scope", "changed", "--json"];

  for (const file of files) {
    policyArgs.push("--changed-file", file);
    if (!(file.startsWith("documentation/") || file.endsWith(".md"))) {
      docsOnly = false;
    }
    if (
      (file.startsWith("apps/mobile/") && !/^apps\/mobile\/[^/]+\.md$/.test(file)) ||
      file.startsWith(".github/workflows/") ||
      [".nvmrc", ".node-version", "package.json", "package-lock.json"].includes(file) ||
      file.startsWith("scripts/checks/")
    ) {
      mobileCodeRelevant = true;
    }
    if (
      file.startsWith("apps/web/") ||
      file.startsWith(".github/workflows/") ||
      [".nvmrc", ".node-version", "package.json", "package-lock.json"].includes(file) ||
      file.startsWith("scripts/checks/")
    ) {
      webCodeRelevant = true;
    }
  }

  const policy = JSON.parse(execFileSync(process.execPath, policyArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }));
  return {
    docsOnly,
    webCodeRelevant,
    mobileCodeRelevant,
    buildRelevant: Boolean(policy.buildRelevant),
    dependencyGraphRelevant: Boolean(policy.dependencyGraphRelevant),
    dependencyAuditRelevant: Boolean(policy.dependencyAuditRelevant),
    securityToolingRelevant: Boolean(policy.securityToolingRelevant),
  };
}

export function resolveCiScope({
  repositoryRoot = process.cwd(),
  changedFiles = null,
  ...selectionOptions
} = {}) {
  const selection = resolveCiScopeSelection(selectionOptions);
  if (selection.kind === "full") {
    return Object.freeze({ selection, scope: FULL_SCOPE });
  }
  if (selection.kind === "empty") {
    return Object.freeze({ selection, scope: EMPTY_SCOPE });
  }

  gitHasCommit(repositoryRoot, selection.baseSha, "base");
  gitHasCommit(repositoryRoot, selection.candidateSha, "candidate");
  const files = changedFiles ?? getChangedFiles(repositoryRoot, selection.baseSha, selection.candidateSha);
  return Object.freeze({
    selection,
    scope: Object.freeze(deriveChangedScope(repositoryRoot, files)),
  });
}

export function serializeCiScopeOutputs(scope) {
  return Object.entries(OUTPUT_KEYS)
    .map(([key, outputKey]) => `${outputKey}=${scope[key]}`)
    .join("\n") + "\n";
}

function writeOutputs(scope) {
  const output = serializeCiScopeOutputs(scope);
  const outputPath = normalize(process.env.GITHUB_OUTPUT);
  if (outputPath) {
    fs.appendFileSync(outputPath, output, "utf8");
  }
  process.stdout.write(output);
}

if (process.argv[1] && process.argv[1].endsWith("detect-scope.mjs")) {
  try {
    const result = resolveCiScope({
      eventName: process.env.EVENT_NAME,
      validationMode: process.env.VALIDATION_MODE,
      eventBefore: process.env.EVENT_BEFORE,
      eventSha: process.env.EVENT_SHA,
      prBaseSha: process.env.PR_BASE_SHA,
      prHeadSha: process.env.PR_HEAD_SHA,
    });
    gitHasCommit(process.cwd(), result.selection.candidateSha, "candidate");
    process.stdout.write(`Scope selection: ${result.selection.reason}\n`);
    writeOutputs(result.scope);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
