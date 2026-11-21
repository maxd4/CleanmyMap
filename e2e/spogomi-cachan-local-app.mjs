import { spawn } from "node:child_process";

const CLERK_BOOT_CONFIG_MESSAGE = "Local Clerk Development configuration was rejected; secret values are suppressed.";
const APP_PORT_MESSAGE = "The local app port could not be opened; process output is suppressed.";
const APP_RUNTIME_MESSAGE = "The local app reported a startup error; process output is suppressed.";

export function classifyLocalAppStartupOutput(output) {
  const text = String(output ?? "");
  if (text.includes("Invalid local Clerk configuration")) {
    return { code: "CLERK_BOOT_CONFIG", message: CLERK_BOOT_CONFIG_MESSAGE };
  }
  if (text.includes("EADDRINUSE") || text.includes("port is already in use")) {
    return { code: "APP_PORT_CONFLICT", message: APP_PORT_MESSAGE };
  }
  if (/Failed to compile|Module not found|Cannot find module/i.test(text)) {
    return { code: "APP_COMPILE_ERROR", message: "The local app could not compile; process output is suppressed." };
  }
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|connection refused/i.test(text)) {
    return { code: "APP_BACKEND_CONNECTION", message: "The local app could not reach a backend; process output is suppressed." };
  }
  if (/\b(?:TypeError|ReferenceError|SyntaxError):/.test(text)) {
    return { code: "APP_RUNTIME_ERROR", message: "The local app raised a runtime error; process output is suppressed." };
  }
  if (/\b(?:Error|error):/.test(text)) {
    return { code: "APP_STARTUP_ERROR", message: APP_RUNTIME_MESSAGE };
  }
  return null;
}

export async function waitForLocalApp(baseUrl, {
  server = null,
  timeoutMs = 90_000,
  pollIntervalMs = 1_000,
  fetchImpl = fetch,
  getStartupOutput = () => "",
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (server?.exitCode != null) {
      const diagnostic = classifyLocalAppStartupOutput(getStartupOutput());
      const detail = diagnostic ? ` ${diagnostic.code}: ${diagnostic.message}` : "";
      throw new Error(`Local application process exited before readiness.${detail}`);
    }

    try {
      const response = await fetchImpl(`${baseUrl}/spogomi`, { redirect: "manual" });
      await response.body?.cancel().catch(() => undefined);
      return;
    } catch {
      // The local server is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const diagnostic = classifyLocalAppStartupOutput(getStartupOutput());
  const startupDetail = diagnostic ? ` ${diagnostic.code}: ${diagnostic.message}` : " Startup output is suppressed.";
  throw new Error(`Application SPOGOMI indisponible sur ${baseUrl}. It did not accept local requests.${startupDetail}`);
}

export function spawnLocalApp(command, args, options) {
  const startupChunks = [];
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk) => {
    startupChunks.push(chunk.toString());
    if (startupChunks.length > 40) startupChunks.shift();
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.getStartupOutput = () => startupChunks.join("");
  return child;
}

function signalProcessTree(child, signal) {
  try {
    if (process.platform === "win32") {
      if (child.exitCode == null) child.kill(signal);
      return;
    }
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

export async function stopLocalApp(child, { gracePeriodMs = 5_000 } = {}) {
  if (!child?.pid) return;
  signalProcessTree(child, "SIGTERM");
  if (child.exitCode != null && child.stdout?.readableEnded && child.stderr?.readableEnded) return;

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      signalProcessTree(child, "SIGKILL");
      resolve();
    }, gracePeriodMs);
    child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
