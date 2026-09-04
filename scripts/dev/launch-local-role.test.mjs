import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildRoleEnvironment,
  ensureDevelopmentEnv,
  getRoleConfig,
  getVercelEnvPullArgs,
  isVercelProjectLinked,
  runVercelEnvPull,
} from "./launch-local-role.mjs";

describe("launch-local-role", () => {
  it("injects coherent MAX and bénévole identities", () => {
    assert.deepEqual(getRoleConfig("max"), {
      role: "max",
      userId: "dev-max",
      displayName: "Dev Max",
      username: "dev-max",
    });
    assert.deepEqual(getRoleConfig("benevole"), {
      role: "benevole",
      userId: "dev-benevole",
      displayName: "Dev Benevole",
      username: "dev-benevole",
    });
    assert.deepEqual(getRoleConfig("admin"), {
      role: "admin",
      userId: "dev-admin",
      displayName: "Dev Admin",
      username: "dev-admin",
    });
    assert.equal(buildRoleEnvironment("max", { KEEP_ME: "1" }).CMM_DEV_AUTH_BYPASS, "1");
    assert.equal(buildRoleEnvironment("max").CMM_DEV_AUTH_BYPASS_ROLE, "max");
    assert.equal(buildRoleEnvironment("benevole").CMM_DEV_AUTH_BYPASS_ROLE, "benevole");
    assert.equal(buildRoleEnvironment("benevole").CMM_DEV_AUTH_BYPASS_USER_ID, "dev-benevole");
    assert.equal(buildRoleEnvironment("admin").CMM_DEV_AUTH_BYPASS_ROLE, "admin");
    assert.equal(buildRoleEnvironment("admin").CMM_DEV_AUTH_BYPASS_USER_ID, "dev-admin");
  });

  it("uses a non-interactive Vercel Development pull without Claude tooling", () => {
    assert.deepEqual(getVercelEnvPullArgs(), ["env", "pull", ".env.local", "development", "--yes"]);

    const calls = [];
    runVercelEnvPull({
      cwd: "C:\\repo\\apps\\web",
      spawnSyncImpl: (command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0 };
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "vercel");
    assert.deepEqual(calls[0].args, getVercelEnvPullArgs());
    assert.ok(!calls[0].args.some((value) => /claude|skills/i.test(value)));
  });

  it("requires a valid linked Vercel project before pulling", () => {
    const files = new Map([["project.json", JSON.stringify({ projectId: "project", orgId: "team" })]]);
    const existsImpl = (path) => files.has(path) || path === "env.local";
    const readFileImpl = () => files.get("project.json");

    assert.equal(isVercelProjectLinked("project.json", { existsImpl, readFileImpl }), true);
    assert.equal(isVercelProjectLinked("missing.json", { existsImpl, readFileImpl }), false);
    assert.throws(
      () => ensureDevelopmentEnv({ targetWebDir: "", existsImpl: () => false, readFileImpl }),
      /n'est pas lié à un projet Vercel/,
    );
  });

  it("pulls only when .env.local is absent and verifies the output", () => {
    const targetWebDir = "apps/web";
    const projectConfigPath = join(targetWebDir, ".vercel", "project.json");
    const envFile = join(targetWebDir, ".env.local");
    const files = new Map([[projectConfigPath, JSON.stringify({ projectId: "project", orgId: "team" })]]);
    let pullCount = 0;
    const existsImpl = (path) => files.has(path);
    const readFileImpl = (path) => files.get(path);
    const result = ensureDevelopmentEnv({
      targetWebDir,
      existsImpl,
      readFileImpl,
      pullImpl: () => {
        pullCount += 1;
        files.set(envFile, "SECRET_NOT_LOGGED");
      },
    });

    assert.equal(pullCount, 1);
    assert.deepEqual(result, { envFile, pulled: true });
  });

  it("keeps both batch launchers thin and free of stale port/env logic", () => {
    for (const [file, role] of [
      [".aLANCER_SITE_LOCAL_ROLE_MAX.bat", "max"],
      [".aLANCER_SITE_LOCAL_ROLE_BENEVOLE.bat", "benevole"],
      [".aLANCER_SITE_LOCAL_ROLE_ADMIN.bat", "admin"],
    ]) {
      const content = readFileSync(file, "utf8");
      assert.match(content, /launch-local-role\.mjs/);
      assert.match(content, new RegExp(`launch-local-role\\.mjs[\" ]+${role}`));
      assert.doesNotMatch(content, /vercel-sync-env\.mjs|timeout\s+\/t|localhost:3000|start\s+http/i);
    }
  });
});
