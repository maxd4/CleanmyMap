import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const supabaseDirectory = path.join(root, "apps", "web", "supabase");
const gateBOnly = process.argv.includes("--gate-b-only");
const dockerBin = path.join(
  process.env.LOCALAPPDATA ?? "",
  "Programs",
  "DockerDesktop",
  "resources",
  "bin",
);

function withDockerOnPath() {
  const separator = process.platform === "win32" ? ";" : ":";
  const currentPath = process.env.Path ?? process.env.PATH ?? "";
  if (currentPath.split(separator).some((entry) => entry.toLowerCase() === dockerBin.toLowerCase())) {
    return currentPath;
  }
  return `${dockerBin}${separator}${currentPath}`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const commandLine = [command, ...args]
      .map((value) => (/^[A-Za-z0-9_./:-]+$/.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`))
      .join(" ");
    const child = spawn(
      isWindows ? (process.env.ComSpec ?? "cmd.exe") : command,
      isWindows ? ["/d", "/s", "/c", commandLine] : args,
      {
        cwd: options.cwd ?? root,
        env: options.env ?? process.env,
        stdio: options.stdio ?? "pipe",
        windowsHide: true,
        shell: false,
      },
    );
    let stdout = "";
    let stderr = "";
    if (child.stdout) child.stdout.on("data", (chunk) => { stdout += chunk; });
    if (child.stderr) child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function parseStatusJson(output) {
  const start = output.indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(output.slice(start));
  } catch {
    return null;
  }
}

function isLocalSupabaseStatus(status) {
  if (!status?.API_URL) return false;
  try {
    const hostname = new URL(status.API_URL).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

async function dockerIsReady(env) {
  const result = await run("docker", ["info", "--format", "{{.ServerVersion}}"], { env });
  return result.code === 0;
}

async function waitForDocker(env, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await dockerIsReady(env)) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Docker Desktop did not become ready within the local E2E startup window.");
}

async function localContainerCount(env) {
  const result = await run("docker", ["ps", "-q"], { env });
  if (result.code !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
}

const cliEnv = { ...process.env, Path: withDockerOnPath() };
let dockerStartedByRunner = false;
let supabaseStartedByRunner = false;
let dockerWasEmptyBefore = false;
let exitCode = 1;

try {
  const dockerReadyBefore = await dockerIsReady(cliEnv);
  if (!dockerReadyBefore) {
    const startDocker = await run("docker", ["desktop", "start"], { env: cliEnv });
    if (startDocker.code !== 0) {
      throw new Error("Docker Desktop could not be started by the local E2E runner.");
    }
    dockerStartedByRunner = true;
    await waitForDocker(cliEnv);
  }

  const containerCount = await localContainerCount(cliEnv);
  dockerWasEmptyBefore = containerCount === 0;

  const existingStatus = await run("npx.cmd", ["supabase", "status", "--output", "json"], {
    cwd: supabaseDirectory,
    env: cliEnv,
  });
  let local = existingStatus.code === 0 ? parseStatusJson(existingStatus.stdout) : null;

  if (!isLocalSupabaseStatus(local)) {
    const startSupabase = await run("npx.cmd", ["supabase", "start"], {
      cwd: supabaseDirectory,
      env: cliEnv,
    });
    if (startSupabase.code !== 0) {
      throw new Error("Supabase local could not be started for campaign 2.");
    }
    supabaseStartedByRunner = true;
    const statusAfterStart = await run("npx.cmd", ["supabase", "status", "--output", "json"], {
      cwd: supabaseDirectory,
      env: cliEnv,
    });
    local = parseStatusJson(statusAfterStart.stdout);
  }

  if (!isLocalSupabaseStatus(local) || !local.ANON_KEY || !local.SERVICE_ROLE_KEY) {
    throw new Error("Campaign 2 requires a local Supabase status with local credentials.");
  }

  const env = {
    ...cliEnv,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    PLAYWRIGHT_BASE_URL: "http://localhost:3000",
    DEV_HOST: "localhost",
    DEV_STRICT_PORT: "1",
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    CMM_DISABLE_DEV_AUTH_BYPASS: "1",
  };

  const result = await run(
    "npx.cmd",
    [
      "playwright",
      "test",
      "e2e/signalement-campaign-2.spec.ts",
      "--project=signalement campaign 2",
      ...(gateBOnly ? ["--grep=Gate B"] : []),
    ],
    { cwd: root, env, stdio: "inherit" },
  );
  exitCode = result.code ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local campaign 2 runner failed.");
} finally {
  if (supabaseStartedByRunner) {
    const stopSupabase = await run("npx.cmd", ["supabase", "stop"], {
      cwd: supabaseDirectory,
      env: cliEnv,
    });
    if (stopSupabase.code !== 0) {
      console.error("Supabase local cleanup failed; Docker was left running for safety.");
      exitCode = 1;
    }
  }

  if (dockerStartedByRunner && dockerWasEmptyBefore) {
    const stopDocker = await run("docker", ["desktop", "stop"], { env: cliEnv });
    if (stopDocker.code !== 0) {
      console.error("Docker Desktop cleanup failed after the local E2E run.");
      exitCode = 1;
    }
  }
}

process.exitCode = exitCode;
