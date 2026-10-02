import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptsDirectory, "../..");
const workflowPath = resolve(repositoryRoot, ".github/workflows/dast-zap-baseline.yml");
const contextPath = resolve(scriptsDirectory, "zap-public.context");

const workflow = readFileSync(workflowPath, "utf8");
const context = readFileSync(contextPath, "utf8");

assert.ok(existsSync(workflowPath), "the dedicated DAST workflow must exist");
assert.ok(existsSync(contextPath), "the bounded ZAP context must exist");

assert.match(workflow, /schedule:\s*\n\s*- cron: ["']30 2 \* \* 1["']/);
assert.match(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /(^|\n)\s*(push|pull_request|pull_request_target):/);
assert.match(workflow, /permissions:\s*\{\}/);
assert.match(workflow, /permissions:\s*\n\s+contents: read/);
assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
assert.match(workflow, /zaproxy\/action-baseline@[0-9a-f]{40}/);
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /target: https:\/\/cleanmymap\.fr/);
assert.match(workflow, /cmd_options: -n scripts\/security\/zap-public\.context -m 1 -s -I/);
assert.match(workflow, /token: ""/);
assert.match(workflow, /allow_issue_writing: false/);
assert.match(workflow, /fail_action: false/);
assert.doesNotMatch(workflow, /secrets\./);
assert.doesNotMatch(workflow, /issues:\s*(write|read)/);
assert.doesNotMatch(workflow, /(?:zap-full-scan|--auto|\s-j(?:\s|$)|\bactive\b)/i);

assert.match(context, /<configuration>[\s\S]*<context>[\s\S]*<inscope>true<\/inscope>/);
const includeMatch = context.match(/<incregexes>([\s\S]*?)<\/incregexes>/);
assert.ok(includeMatch, "the context must declare an inclusion regex");
const excludeMatches = [...context.matchAll(/<excregexes>([^<]*)<\/excregexes>/g)];
assert.equal(excludeMatches.length, 2, "the context must declare one XML entry per exclusion regex");
assert.doesNotMatch(context, /&#10;/, "exclusions must not be concatenated with an XML newline entity");
const include = new RegExp(includeMatch[1]);
const excludes = excludeMatches.map(([, pattern]) => new RegExp(pattern));

for (const publicUrl of [
  "https://cleanmymap.fr",
  "https://cleanmymap.fr/",
  "https://cleanmymap.fr/explorer",
  "https://cleanmymap.fr/en?source=zap",
]) {
  assert.match(publicUrl, include, `expected public URL in ZAP scope: ${publicUrl}`);
}

for (const excludedUrl of [
  "https://cleanmymap.fr/admin",
  "https://cleanmymap.fr/sign-in",
  "https://cleanmymap.fr/api/actions/import",
  "https://cleanmymap.fr/api/webhooks/stripe",
  "https://cleanmymap.fr/uploads/new",
]) {
  assert.ok(
    !include.test(excludedUrl) || excludes.some((pattern) => pattern.test(excludedUrl)),
    `sensitive URL must not be crawled: ${excludedUrl}`,
  );
}

assert.doesNotMatch(context, /\*\s+OUTOFSCOPE/);
assert.match(context, /(?:admin|sign-in|api\/|webhooks?|uploads?)/);
