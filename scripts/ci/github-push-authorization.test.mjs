import assert from "node:assert/strict";
import test from "node:test";

import {
  readGitHubPushCredential,
  validateGitHubPushAuthorization,
  verifyGitHubPushAuthorization,
} from "./github-push-authorization.mjs";

const identity = { login: "maxd4", id: 262129128 };
const repository = { full_name: "maxd4/CleanmyMap", default_branch: "main" };
const permission = { permission: "admin", role_name: "admin" };
const effectiveRules = [
  { type: "update", ruleset_id: 25034548 },
  { type: "deletion", ruleset_id: 23565928 },
  { type: "non_fast_forward", ruleset_id: 23565928 },
];

function rulesets(overrides = {}) {
  return [
    {
      id: 25034548,
      target: "branch",
      enforcement: "active",
      rules: [{ type: "update" }],
      bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5, bypass_mode: "always" }],
      current_user_can_bypass: "always",
      ...overrides.update,
    },
    {
      id: 23565928,
      target: "branch",
      enforcement: "active",
      rules: [{ type: "deletion" }, { type: "non_fast_forward" }],
      bypass_actors: [],
      current_user_can_bypass: "never",
      ...overrides.protections,
    },
    ...(overrides.additional ?? []),
  ];
}

function validate(overrides = {}) {
  return validateGitHubPushAuthorization({
    identity: overrides.identity ?? identity,
    repository: overrides.repository ?? repository,
    permission: overrides.permission ?? permission,
    effectiveRules: overrides.effectiveRules ?? effectiveRules,
    rulesets: overrides.rulesets ?? rulesets(),
  });
}

test("authorizes the credential identity only for the effective main update ruleset", () => {
  assert.deepEqual(validate(), {
    login: "maxd4",
    userId: 262129128,
    repository: "maxd4/CleanmyMap",
    ref: "refs/heads/main",
  });
});

test("refuses absent, uncertain, and wrong-rule update authorization", () => {
  assert.throws(() => validate({
    effectiveRules: effectiveRules.filter((rule) => rule.type !== "update"),
  }), /PUBLISH_AUTH_REQUIRED_RULE_MISSING:update/);
  assert.throws(() => validate({ rulesets: rulesets({ update: { current_user_can_bypass: null } }) }), /PUBLISH_AUTH_UPDATE_BYPASS_UNAUTHORIZED/);
  assert.throws(() => validate({ rulesets: rulesets({ update: { rules: [{ type: "deletion" }] } }) }), /PUBLISH_AUTH_RULESET_UNVERIFIED:update/);
  assert.throws(() => validate({ permission: { permission: "read" } }), /PUBLISH_AUTH_PUSH_PERMISSION_REQUIRED/);
  assert.throws(() => validate({ identity: { login: "", id: 0 } }), /PUBLISH_AUTH_IDENTITY_UNVERIFIED/);
});

test("requires active deletion and non-fast-forward rules without a bypass for the publisher", () => {
  assert.throws(() => validate({
    effectiveRules: effectiveRules.filter((rule) => rule.type !== "deletion"),
  }), /PUBLISH_AUTH_REQUIRED_RULE_MISSING:deletion/);
  assert.throws(() => validate({
    rulesets: rulesets({ protections: { current_user_can_bypass: "always" } }),
  }), /PUBLISH_AUTH_PROTECTION_BYPASS_AVAILABLE/);
});

test("rejects an additional effective ruleset that gives the publisher an unrelated bypass", () => {
  const additional = {
    id: 319001,
    target: "branch",
    enforcement: "active",
    rules: [{ type: "required_status_checks" }],
    bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5, bypass_mode: "always" }],
    current_user_can_bypass: "always",
  };
  assert.throws(() => validate({
    effectiveRules: [...effectiveRules, { type: "required_status_checks", ruleset_id: additional.id }],
    rulesets: rulesets({ additional: [additional] }),
  }), /PUBLISH_AUTH_UNEXPECTED_BYPASS_AVAILABLE:319001/);
});

test("uses the Git push credential for identity, permission, effective rules, and ruleset authorization", async () => {
  const requests = [];
  const responses = new Map([
    ["/user", identity],
    ["/repos/maxd4/CleanmyMap", repository],
    ["/repos/maxd4/CleanmyMap/collaborators/maxd4/permission", permission],
    ["/repos/maxd4/CleanmyMap/rules/branches/main?per_page=100&page=1", effectiveRules],
    ["/repos/maxd4/CleanmyMap/rulesets/25034548?includes_parents=true", rulesets()[0]],
    ["/repos/maxd4/CleanmyMap/rulesets/23565928?includes_parents=true", rulesets()[1]],
  ]);
  const result = await verifyGitHubPushAuthorization({
    pushUrl: "https://github.com/maxd4/CleanmyMap.git",
    readCredential: (url) => {
      assert.equal(url, "https://github.com/maxd4/CleanmyMap.git");
      return { username: "maxd4", token: "test-token-never-log" };
    },
    fetchImpl: async (url, init) => {
      requests.push({ url, authorization: init.headers.Authorization });
      const path = new URL(url).pathname + new URL(url).search;
      if (!responses.has(path)) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => responses.get(path) };
    },
  });

  assert.equal(result.login, "maxd4");
  assert.equal(requests.length, 6);
  assert.ok(requests.every((request) => request.authorization === "Bearer test-token-never-log"));
  assert.ok(requests.some((request) => request.url.endsWith("/rules/branches/main?per_page=100&page=1")));
});

test("fetches every effective ruleset source and rejects an additional bypass before authorization", async () => {
  const extraRuleset = {
    id: 319001,
    target: "branch",
    enforcement: "active",
    rules: [{ type: "required_status_checks" }],
    bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5, bypass_mode: "always" }],
    current_user_can_bypass: "always",
  };
  const firstPage = [
    ...effectiveRules,
    ...Array.from({ length: 97 }, () => ({ type: "deletion", ruleset_id: 23565928 })),
  ];
  const secondPage = [{ type: "required_status_checks", ruleset_id: extraRuleset.id }];
  const requests = [];
  const responses = new Map([
    ["/user", identity],
    ["/repos/maxd4/CleanmyMap", repository],
    ["/repos/maxd4/CleanmyMap/collaborators/maxd4/permission", permission],
    ["/repos/maxd4/CleanmyMap/rules/branches/main?per_page=100&page=1", firstPage],
    ["/repos/maxd4/CleanmyMap/rules/branches/main?per_page=100&page=2", secondPage],
    ["/repos/maxd4/CleanmyMap/rulesets/25034548?includes_parents=true", rulesets()[0]],
    ["/repos/maxd4/CleanmyMap/rulesets/23565928?includes_parents=true", rulesets()[1]],
    ["/repos/maxd4/CleanmyMap/rulesets/319001?includes_parents=true", extraRuleset],
  ]);
  await assert.rejects(verifyGitHubPushAuthorization({
    pushUrl: "https://github.com/maxd4/CleanmyMap.git",
    readCredential: () => ({ username: "maxd4", token: "test-token" }),
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      requests.push(path);
      return responses.has(path)
        ? { ok: true, status: 200, json: async () => responses.get(path) }
        : { ok: false, status: 404, json: async () => ({}) };
    },
  }), /PUBLISH_AUTH_UNEXPECTED_BYPASS_AVAILABLE:319001/);
  assert.ok(requests.some((path) => path.endsWith("/rules/branches/main?per_page=100&page=2")));
  assert.ok(requests.some((path) => path.endsWith("/rulesets/319001?includes_parents=true")));
});

test("reads Git's HTTPS authorization header without exposing or substituting its identity", () => {
  const credential = readGitHubPushCredential("https://github.com/maxd4/CleanmyMap.git", (args) => {
    assert.deepEqual(args, ["config", "--get-urlmatch", "http.extraheader", "https://github.com/maxd4/CleanmyMap.git"]);
    return {
      status: 0,
      stdout: `AUTHORIZATION: basic ${Buffer.from("maxd4:push-token-fixture").toString("base64")}\n`,
    };
  });
  assert.deepEqual(credential, { username: "maxd4", token: "push-token-fixture" });
});

test("resolves the configured Git credential helper and fails closed for unsupported remotes", () => {
  let fillInput = "";
  const credential = readGitHubPushCredential("https://github.com/maxd4/CleanmyMap.git", (args, options = {}) => {
    if (args[0] === "config") return { status: 1, stdout: "" };
    fillInput = options.input;
    return { status: 0, stdout: "username=maxd4\npassword=helper-token-fixture\n" };
  });
  assert.deepEqual(credential, { username: "maxd4", token: "helper-token-fixture" });
  assert.match(fillInput, /path=maxd4\/CleanmyMap\.git/);
  assert.throws(
    () => readGitHubPushCredential("https://example.com/maxd4/CleanmyMap.git", () => ({ status: 1, stdout: "" })),
    /PUBLISH_AUTH_REMOTE_UNSUPPORTED/,
  );
});

test("refuses an API identity different from the Git credential username", async () => {
  await assert.rejects(verifyGitHubPushAuthorization({
    pushUrl: "https://github.com/maxd4/CleanmyMap.git",
    readCredential: () => ({ username: "other-user", token: "test-token" }),
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => identity }),
  }), /PUBLISH_AUTH_IDENTITY_MISMATCH/);
});
