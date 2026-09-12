import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
export const repoRoot = resolve(scriptDir, "../..");
export const webDir = resolve(repoRoot, "apps/web");
export const devServerScript = resolve(scriptDir, "dev-with-fallback-port.mjs");
const WINDOWS_CTRL_C_EXIT_CODES = new Set([-1073741510, 3221225786]);
const VERCEL_CLI_MISSING_MESSAGE =
  "[launcher] CLI Vercel introuvable dans le PATH. Installe-la avec 'npm install --global vercel', puis relance le launcher.";

export const LOCAL_ROLE_CONFIGS = Object.freeze({
  max: Object.freeze({
    role: "max",
    userId: "dev-max",
    displayName: "Dev Max",
    username: "dev-max",
  }),
  benevole: Object.freeze({
    role: "benevole",
    userId: "dev-benevole",
    displayName: "Dev Benevole",
    username: "dev-benevole",
  }),
});

export function getRoleConfig(role) {
  const config = LOCAL_ROLE_CONFIGS[role];
  if (!config) {
    throw new Error(`[launcher] Rôle local inconnu: ${role}. Utilise max ou benevole.`);
  }
  return config;
}

export function buildRoleEnvironment(role, baseEnv = process.env) {
  const config = getRoleConfig(role);
  return {
    ...baseEnv,
    NODE_ENV: "development",
    CMM_DEV_AUTH_BYPASS: "1",
    CMM_DISABLE_DEV_AUTH_BYPASS: "0",
    CMM_DEV_AUTH_BYPASS_ROLE: config.role,
    CMM_DEV_AUTH_BYPASS_USER_ID: config.userId,
    CMM_DEV_AUTH_BYPASS_DISPLAY_NAME: config.displayName,
    CMM_DEV_AUTH_BYPASS_USERNAME: config.username,
  };
}

export function getVercelEnvPullArgs() {
  return ["env", "pull", ".env.local", "--environment", "development", "--yes"];
}

function getPathEntries(env, pathDelimiter) {
  return (env.PATH ?? "")
    .split(pathDelimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isPathLike(value) {
  return value.includes("/") || value.includes("\\");
}

function getVercelCliCandidates({ env, platform, pathDelimiter }) {
  const configuredPath = env.VERCEL_CLI_PATH?.trim();
  if (configuredPath && isPathLike(configuredPath)) {
    return [configuredPath];
  }

  const commandName = configuredPath || "vercel";
  const names =
    platform === "win32"
      ? [commandName, `${commandName}.cmd`, `${commandName}.exe`, `${commandName}.ps1`]
      : [commandName];

  return getPathEntries(env, pathDelimiter).flatMap((entry) => names.map((name) => join(entry, name)));
}

function getAdjacentVercelScript(candidate, existsImpl) {
  const scriptPath = join(dirname(candidate), "node_modules", "vercel", "dist", "vc.js");
  return existsImpl(scriptPath) ? resolve(scriptPath) : null;
}

export function resolveVercelCliInvocation({
  env = process.env,
  platform = process.platform,
  existsImpl = existsSync,
  nodePath = process.execPath,
  pathDelimiter = delimiter,
} = {}) {
  for (const candidate of getVercelCliCandidates({ env, platform, pathDelimiter })) {
    if (!existsImpl(candidate)) {
      continue;
    }

    const extension = extname(candidate).toLowerCase();
    if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
      return { command: nodePath, args: [candidate] };
    }

    if (platform === "win32" && [".bat", ".cmd", ".ps1", ""].includes(extension)) {
      const scriptPath = getAdjacentVercelScript(candidate, existsImpl);
      if (scriptPath) {
        return { command: nodePath, args: [scriptPath] };
      }
      continue;
    }

    return { command: candidate, args: [] };
  }

  throw new Error(VERCEL_CLI_MISSING_MESSAGE);
}

export function isValidVercelProjectConfig(config) {
  return Boolean(
    config &&
      typeof config === "object" &&
      typeof config.projectId === "string" &&
      config.projectId.trim().length > 0 &&
      typeof config.orgId === "string" &&
      config.orgId.trim().length > 0,
  );
}

function readVercelProjectConfig(projectConfigPath, readFileImpl) {
  try {
    return JSON.parse(readFileImpl(projectConfigPath, "utf8"));
  } catch {
    return null;
  }
}

export function isVercelProjectLinked(
  projectConfigPath,
  { existsImpl = existsSync, readFileImpl = readFileSync } = {},
) {
  if (!existsImpl(projectConfigPath)) {
    return false;
  }
  return isValidVercelProjectConfig(readVercelProjectConfig(projectConfigPath, readFileImpl));
}

export function runVercelEnvPull({
  cwd = webDir,
  env = process.env,
  platform = process.platform,
  existsImpl = existsSync,
  spawnSyncImpl = spawnSync,
  nodePath = process.execPath,
  pathDelimiter = delimiter,
} = {}) {
  const invocation = resolveVercelCliInvocation({ env, platform, existsImpl, nodePath, pathDelimiter });
  const result = spawnSyncImpl(invocation.command, [...invocation.args, ...getVercelEnvPullArgs()], {
    cwd,
    env,
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
    windowsHide: false,
  });

  if (result.error) {
    if (["ENOENT", "EINVAL", "EFTYPE"].includes(result.error.code)) {
      throw new Error(VERCEL_CLI_MISSING_MESSAGE);
    }
    throw new Error(`[launcher] Échec du lancement de Vercel CLI: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`[launcher] vercel env pull a échoué (code=${result.status ?? "inconnu"}).`);
  }
}

export function ensureDevelopmentEnv({
  targetWebDir = webDir,
  existsImpl = existsSync,
  readFileImpl = readFileSync,
  pullImpl = () => runVercelEnvPull({ cwd: targetWebDir }),
} = {}) {
  const envFile = join(targetWebDir, ".env.local");
  if (existsImpl(envFile)) {
    return { envFile, pulled: false };
  }

  const projectConfigPath = join(targetWebDir, ".vercel", "project.json");
  if (!isVercelProjectLinked(projectConfigPath, { existsImpl, readFileImpl })) {
    throw new Error(
      `[launcher] apps/web n'est pas lié à un projet Vercel. Lie le projet puis relance; aucun .env.local n'a été créé.`,
    );
  }

  console.log("[launcher] .env.local absent : récupération de l'environnement Vercel Development.");
  pullImpl();
  if (!existsImpl(envFile)) {
    throw new Error("[launcher] vercel env pull s'est terminé sans créer apps/web/.env.local.");
  }
  return { envFile, pulled: true };
}

export function exitCodeForChild(code, signal) {
  if (signal) {
    return signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1;
  }
  if (WINDOWS_CTRL_C_EXIT_CODES.has(code)) {
    return 130;
  }
  return code ?? 1;
}

export function launchLocalRole(role, args = process.argv.slice(3)) {
  ensureDevelopmentEnv();
  const child = spawn(process.execPath, [devServerScript, "--open-browser", ...args], {
    cwd: repoRoot,
    env: buildRoleEnvironment(role),
    stdio: "inherit",
    windowsHide: false,
  });

  child.once("error", (error) => {
    console.error(`[launcher] Impossible de lancer Next.js: ${error.message}`);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    process.exitCode = exitCodeForChild(code, signal);
  });
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  try {
    const role = process.argv[2];
    getRoleConfig(role);
    launchLocalRole(role);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
