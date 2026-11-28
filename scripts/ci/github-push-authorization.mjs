import { spawnSync } from "node:child_process";
import { gitExecutable } from "./git-executable.mjs";

const REPOSITORY = "maxd4/CleanmyMap";
const TARGET_REF = "refs/heads/main";
const API_ROOT = "https://api.github.com";
const REQUIRED_EFFECTIVE_RULES = Object.freeze(["update", "deletion", "non_fast_forward"]);
const MAX_EFFECTIVE_RULE_PAGES = 20;
const EFFECTIVE_RULES_PER_PAGE = 100;

function authorizationError(code) {
  throw new Error(code);
}

function parseBasicAuthorization(header) {
  const match = header.match(/^\s*Authorization:\s*Basic\s+([A-Za-z0-9+/=]+)\s*$/i);
  if (!match) return null;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0 || !decoded.slice(separator + 1)) return null;
  return { username: decoded.slice(0, separator), token: decoded.slice(separator + 1) };
}

function parseBearerAuthorization(header) {
  const match = header.match(/^\s*Authorization:\s*Bearer\s+(\S+)\s*$/i);
  return match ? { username: "x-access-token", token: match[1] } : null;
}

function runGitCredential(args, { input = "", env = process.env } = {}) {
  return spawnSync(gitExecutable(), args, {
    input,
    encoding: "utf8",
    env: { ...env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
    windowsHide: true,
  });
}

export function readGitHubPushCredential(remoteUrl, runCommand = runGitCredential) {
  let remote;
  try {
    remote = new URL(remoteUrl);
  } catch {
    authorizationError("PUBLISH_AUTH_REMOTE_UNSUPPORTED");
  }
  if (remote.protocol !== "https:" || remote.hostname.toLowerCase() !== "github.com"
    || remote.username || remote.password
    || remote.pathname.replace(/\.git$/i, "").replace(/^\//, "").toLowerCase() !== REPOSITORY.toLowerCase()) {
    authorizationError("PUBLISH_AUTH_REMOTE_UNSUPPORTED");
  }

  const configuredHeader = runCommand(["config", "--get-urlmatch", "http.extraheader", remoteUrl]);
  if (configuredHeader.status === 0 && configuredHeader.stdout.trim()) {
    const header = configuredHeader.stdout.trim();
    const credential = parseBasicAuthorization(header) ?? parseBearerAuthorization(header);
    if (!credential) authorizationError("PUBLISH_AUTH_CREDENTIAL_UNREADABLE");
    return credential;
  }

  const filled = runCommand(["credential", "fill"], {
    input: `protocol=https\nhost=github.com\npath=${REPOSITORY}.git\n\n`,
  });
  if (filled.status !== 0) authorizationError("PUBLISH_AUTH_CREDENTIAL_UNAVAILABLE");
  const fields = Object.fromEntries(filled.stdout.trim().split(/\r?\n/).map((line) => {
    const separator = line.indexOf("=");
    return separator < 0 ? ["", ""] : [line.slice(0, separator), line.slice(separator + 1)];
  }).filter(([key]) => key));
  if (typeof fields.password !== "string" || fields.password.length === 0) {
    authorizationError("PUBLISH_AUTH_CREDENTIAL_UNAVAILABLE");
  }
  return { username: fields.username ?? "", token: fields.password };
}

async function githubGet(path, token, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(`${API_ROOT}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CleanMyMap-publish-main",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    authorizationError("PUBLISH_AUTH_GITHUB_API_UNAVAILABLE");
  }
  if (!response?.ok) authorizationError(`PUBLISH_AUTH_GITHUB_API_REJECTED:${response?.status ?? "unknown"}`);
  try {
    return await response.json();
  } catch {
    authorizationError("PUBLISH_AUTH_GITHUB_API_INVALID_RESPONSE");
  }
}

async function githubGetAll(path, token, fetchImpl) {
  const entries = [];
  for (let page = 1; page <= MAX_EFFECTIVE_RULE_PAGES; page += 1) {
    const result = await githubGet(`${path}?per_page=${EFFECTIVE_RULES_PER_PAGE}&page=${page}`, token, fetchImpl);
    if (!Array.isArray(result)) authorizationError("PUBLISH_AUTH_RULES_UNVERIFIED");
    entries.push(...result);
    if (result.length < EFFECTIVE_RULES_PER_PAGE) return entries;
  }
  authorizationError("PUBLISH_AUTH_RULES_PAGINATION_LIMIT");
}

function hasRequiredRule(rules, type) {
  return Array.isArray(rules) && rules.some((rule) => rule?.type === type);
}

export function validateGitHubPushAuthorization({
  identity,
  repository,
  permission,
  effectiveRules,
  rulesets,
} = {}) {
  if (!identity || typeof identity.login !== "string" || !identity.login
    || !Number.isInteger(identity.id) || identity.id <= 0) {
    authorizationError("PUBLISH_AUTH_IDENTITY_UNVERIFIED");
  }
  if (repository?.full_name?.toLowerCase() !== REPOSITORY.toLowerCase()
    || repository?.default_branch !== "main") {
    authorizationError("PUBLISH_AUTH_REPOSITORY_UNVERIFIED");
  }
  if (!new Set(["admin", "write", "maintain"]).has(permission?.permission)) {
    authorizationError("PUBLISH_AUTH_PUSH_PERMISSION_REQUIRED");
  }
  if (!Array.isArray(effectiveRules) || !Array.isArray(rulesets)) {
    authorizationError("PUBLISH_AUTH_RULES_UNVERIFIED");
  }

  const rulesetById = new Map(rulesets
    .filter((ruleset) => Number.isInteger(ruleset?.id))
    .map((ruleset) => [ruleset.id, ruleset]));
  const effectiveSources = new Map(REQUIRED_EFFECTIVE_RULES.map((type) => [type, new Set()]));
  const effectiveRulesBySource = new Map();
  for (const rule of effectiveRules) {
    if (typeof rule?.type !== "string" || !Number.isInteger(rule.ruleset_id)) {
      authorizationError("PUBLISH_AUTH_EFFECTIVE_RULE_SOURCE_UNVERIFIED");
    }
    const sourceRules = effectiveRulesBySource.get(rule.ruleset_id) ?? new Set();
    sourceRules.add(rule.type);
    effectiveRulesBySource.set(rule.ruleset_id, sourceRules);
    if (effectiveSources.has(rule.type)) effectiveSources.get(rule.type).add(rule.ruleset_id);
  }

  for (const type of REQUIRED_EFFECTIVE_RULES) {
    if (effectiveSources.get(type).size === 0) authorizationError(`PUBLISH_AUTH_REQUIRED_RULE_MISSING:${type}`);
  }

  for (const [id, effectiveTypes] of effectiveRulesBySource) {
    const ruleset = rulesetById.get(id);
    if (!ruleset || ruleset.enforcement !== "active" || ruleset.target !== "branch"
      || !Array.isArray(ruleset.rules)
      || [...effectiveTypes].some((type) => !hasRequiredRule(ruleset.rules, type))) {
      authorizationError(`PUBLISH_AUTH_RULESET_UNVERIFIED:${[...effectiveTypes].join(",")}:${id}`);
    }
    if (effectiveTypes.has("update")) {
      if (ruleset.rules.length !== 1
        || ruleset.rules[0]?.type !== "update"
        || ruleset.current_user_can_bypass !== "always"
        || !Array.isArray(ruleset.bypass_actors)
        || !ruleset.bypass_actors.some((actor) => Number.isInteger(actor?.actor_id)
          && typeof actor.actor_type === "string"
          && actor.bypass_mode === "always")) {
        authorizationError(`PUBLISH_AUTH_UPDATE_BYPASS_UNAUTHORIZED:${id}`);
      }
    } else if (ruleset.current_user_can_bypass !== "never") {
      const protectedTypes = [...effectiveTypes].filter((type) => REQUIRED_EFFECTIVE_RULES.includes(type));
      if (protectedTypes.length > 0) {
        authorizationError(`PUBLISH_AUTH_PROTECTION_BYPASS_AVAILABLE:${protectedTypes.join(",")}:${id}`);
      }
      authorizationError(`PUBLISH_AUTH_UNEXPECTED_BYPASS_AVAILABLE:${id}`);
    }
  }

  return { login: identity.login, userId: identity.id, repository: REPOSITORY, ref: TARGET_REF };
}

export async function verifyGitHubPushAuthorization({
  pushUrl,
  readCredential = readGitHubPushCredential,
  fetchImpl = globalThis.fetch,
} = {}) {
  const credential = readCredential(pushUrl);
  if (!credential || typeof credential.token !== "string" || credential.token.length === 0) {
    authorizationError("PUBLISH_AUTH_CREDENTIAL_UNAVAILABLE");
  }
  const token = credential.token;
  const identity = await githubGet("/user", token, fetchImpl);
  if (credential.username && !new Set(["x-access-token", "oauth2"]).has(credential.username.toLowerCase())
    && credential.username.toLowerCase() !== String(identity?.login ?? "").toLowerCase()) {
    authorizationError("PUBLISH_AUTH_IDENTITY_MISMATCH");
  }

  const repository = await githubGet(`/repos/${REPOSITORY}`, token, fetchImpl);
  if (repository?.full_name?.toLowerCase() !== REPOSITORY.toLowerCase()) {
    authorizationError("PUBLISH_AUTH_REPOSITORY_UNVERIFIED");
  }
  const permission = await githubGet(
    `/repos/${REPOSITORY}/collaborators/${encodeURIComponent(identity.login)}/permission`,
    token,
    fetchImpl,
  );
  const effectiveRules = await githubGetAll(`/repos/${REPOSITORY}/rules/branches/main`, token, fetchImpl);
  if (!Array.isArray(effectiveRules)) authorizationError("PUBLISH_AUTH_RULES_UNVERIFIED");

  const rulesetIds = [...new Set(effectiveRules.map((rule) => rule?.ruleset_id))];
  if (rulesetIds.some((id) => !Number.isInteger(id))) authorizationError("PUBLISH_AUTH_EFFECTIVE_RULE_SOURCE_UNVERIFIED");
  const rulesets = await Promise.all(rulesetIds.map((id) => githubGet(
    `/repos/${REPOSITORY}/rulesets/${id}?includes_parents=true`,
    token,
    fetchImpl,
  )));

  return validateGitHubPushAuthorization({ identity, repository, permission, effectiveRules, rulesets });
}
