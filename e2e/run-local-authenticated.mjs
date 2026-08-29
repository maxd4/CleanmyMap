import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const supabaseDirectory = path.join(root, "apps", "web", "supabase");
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
      stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
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
  if (start < 0) {
    throw new Error("Supabase local status did not return JSON.");
  }
  try {
    return JSON.parse(output.slice(start));
  } catch {
    throw new Error("Supabase local status JSON is invalid.");
  }
}

const cliEnv = { ...process.env, Path: withDockerOnPath() };
const status = await run("npx.cmd", ["supabase", "status", "--output", "json"], {
  cwd: supabaseDirectory,
  env: cliEnv,
});
if (status.code !== 0) {
  throw new Error("Supabase local stack is not available. Start Docker Desktop and run `npx supabase start` from apps/web/supabase.");
}

const local = parseStatusJson(status.stdout);
const apiUrl = new URL(local.API_URL);
if (apiUrl.hostname !== "127.0.0.1" && apiUrl.hostname !== "localhost") {
  throw new Error(`Refusing to run authenticated E2E against non-local Supabase: ${apiUrl.hostname}`);
}
if (!local.ANON_KEY || !local.SERVICE_ROLE_KEY) {
  throw new Error("Supabase local status is missing the required local keys.");
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

const result = await run("npx.cmd", ["playwright", "test", "e2e/authenticated-campaign.spec.ts"], {
  cwd: root,
  env,
  stdio: "inherit",
});
process.exitCode = result.code ?? 1;
