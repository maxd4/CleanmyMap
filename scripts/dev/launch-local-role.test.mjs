import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildRoleEnvironment,
  ensureDevelopmentEnv,
  exitCodeForChild,
  getRoleConfig,
  getVercelEnvPullArgs,
  resolveVercelCliInvocation,
  isVercelProjectLinked,
  runVercelEnvPull,
} from "./launch-local-role.mjs";

describe("launch-local-role", () => {
  it("maps voluntary child termination without changing unexpected codes", () => {
    assert.equal(exitCodeForChild(null, "SIGINT"), 130);
    assert.equal(exitCodeForChild(null, "SIGTERM"), 143);
    assert.equal(exitCodeForChild(-1073741510, null), 130);
    assert.equal(exitCodeForChild(17, null), 17);
  });

  it("injects coherent identities for every canonical bypass role", () => {
    for (const role of ["benevole", "coordinateur", "scientifique", "entreprise", "elu", "admin", "max"]) {
      assert.deepEqual(getRoleConfig(role), {
        role,
        userId: `dev-${role}`,
        displayName: role === "elu" ? "Dev Élu" : `Dev ${role[0].toUpperCase()}${role.slice(1)}`,
        username: `dev-${role}`,
      });
      assert.equal(buildRoleEnvironment(role).CMM_DEV_AUTH_BYPASS_ROLE, role);
    }
    assert.throws(
      () => getRoleConfig("invalid"),
      /Rôle local inconnu: invalid\. Utilise benevole, coordinateur, scientifique, entreprise, elu, admin ou max\./,
    );
    assert.equal(buildRoleEnvironment("max", { KEEP_ME: "1" }).CMM_DEV_AUTH_BYPASS, "1");
    assert.equal(buildRoleEnvironment("benevole").CMM_DEV_AUTH_BYPASS_USER_ID, "dev-benevole");
  });

  it("keeps the manual launcher on the fallback-port protocol and announces the selected URL", () => {
    const launcher = readFileSync("scripts/dev/launch-local-role.mjs", "utf8");
    const fallbackPortServer = readFileSync("scripts/dev/dev-with-fallback-port.mjs", "utf8");

    assert.match(launcher, /dev-with-fallback-port\.mjs/);
    assert.match(launcher, /--open-browser/);
    assert.match(fallbackPortServer, /Démarrage sur http:\/\/\$\{host\}:\$\{chosenPort\}/);
    assert.match(fallbackPortServer, /openUrlInBrowserImpl\(url\)/);
    assert.doesNotMatch(launcher, /DEV_STRICT_PORT\s*:/);
  });

  it("uses a non-interactive Vercel Development pull without Claude tooling", () => {
    assert.deepEqual(getVercelEnvPullArgs(), ["env", "pull", ".env.local", "--environment", "development", "--yes"]);

    const calls = [];
    runVercelEnvPull({
      cwd: "C:\\repo\\apps\\web",
      env: { PATH: "C:\\npm" },
      platform: "win32",
      existsImpl: (path) => path === "C:\\npm\\vercel.cmd" || path === "C:\\npm\\node_modules\\vercel\\dist\\vc.js",
      spawnSyncImpl: (command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0 };
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, process.execPath);
    assert.deepEqual(calls[0].args, ["C:\\npm\\node_modules\\vercel\\dist\\vc.js", ...getVercelEnvPullArgs()]);
    assert.equal(calls[0].options.shell, false);
    assert.deepEqual(calls[0].options.env, { PATH: "C:\\npm" });
    assert.ok(!calls[0].args.some((value) => /claude|skills/i.test(value)));
  });

  it("fails clearly before spawning when Vercel CLI is absent from PATH", () => {
    assert.throws(
      () =>
        runVercelEnvPull({
          env: { PATH: "" },
          platform: "win32",
        }),
      /CLI Vercel introuvable dans le PATH.*npm install --global vercel.*relance le launcher/,
    );
  });

  it("resolves a Vercel CLI script from an npm Windows shim without a shell", () => {
    assert.deepEqual(
      resolveVercelCliInvocation({
        env: { PATH: "C:\\npm" },
        platform: "win32",
        existsImpl: (path) => path === "C:\\npm\\vercel.cmd" || path === "C:\\npm\\node_modules\\vercel\\dist\\vc.js",
        nodePath: "C:\\node\\node.exe",
      }),
      { command: "C:\\node\\node.exe", args: ["C:\\npm\\node_modules\\vercel\\dist\\vc.js"] },
    );
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

});
