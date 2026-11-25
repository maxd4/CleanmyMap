import { spawn } from "node:child_process";

const CLERK_BOOT_CONFIG_MESSAGE = "Local Clerk Development configuration was rejected; secret values are suppressed.";
const APP_PORT_MESSAGE = "The local app port could not be opened; process output is suppressed.";
const APP_RUNTIME_MESSAGE = "The local app reported a startup error; process output is suppressed.";
const APP_TRANSPORT_MESSAGE = "The local application could not be reached; transport details are suppressed.";

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
  if (/Failed to proxy\b|socket hang up|\bECONNRESET\b/i.test(text)) {
    return { code: "APP_PROXY_SOCKET_ERROR", message: "The local app proxy reset the connection (ECONNRESET); process output is suppressed." };
  }
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|connection refused/i.test(text)) {
    return { code: "APP_BACKEND_CONNECTION", message: "The local app could not reach a backend; process output is suppressed." };
  }
  if (/Missing required environment variable|ENV_MISSING/i.test(text)) {
    return { code: "APP_ENV_CONFIG_ERROR", message: "A required local environment variable is missing; process output is suppressed." };
  }
  if (/\b(?:TypeError|ReferenceError|SyntaxError):/.test(text)) {
    return { code: "APP_RUNTIME_ERROR", message: "The local app raised a runtime error; process output is suppressed." };
  }
  if (/\b(?:Error|error):/.test(text)) {
    return { code: "APP_STARTUP_ERROR", message: APP_RUNTIME_MESSAGE };
  }
  return null;
}

export function classifyLocalAppTransportFailure() {
  return { code: "HTTP_TRANSPORT_ERROR", message: APP_TRANSPORT_MESSAGE };
}

export function classifyLocalAppHttpStatus(status) {
  if (status === 401) return { code: "HTTP_AUTHN_ERROR", message: "The request was not authenticated." };
  if (status === 403) return { code: "HTTP_AUTHZ_ERROR", message: "The request was not authorized." };
  if (status === 422) return { code: "HTTP_VALIDATION_ERROR", message: "The request failed input validation." };
  if (status >= 500) return { code: "HTTP_SERVER_ERROR", message: "The server returned an error; response details are suppressed." };
  if (status >= 400) return { code: "HTTP_CLIENT_ERROR", message: "The request returned an unexpected client error." };
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
  let lastHttpErrorStatus = null;
  let sawTransportFailure = false;

  while (Date.now() < deadline) {
    if (server?.exitCode != null) {
      const diagnostic = classifyLocalAppStartupOutput(getStartupOutput());
      const detail = diagnostic ? ` ${diagnostic.code}: ${diagnostic.message}` : "";
      throw new Error(`Local application process exited before readiness.${detail}`);
    }

    try {
      const response = await fetchImpl(`${baseUrl}/spogomi`, { redirect: "manual" });
      await response.body?.cancel().catch(() => undefined);
      if (response.status < 500) return;
      lastHttpErrorStatus = response.status;
    } catch {
      sawTransportFailure = true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const diagnostic = classifyLocalAppStartupOutput(getStartupOutput());
  const startupDetail = diagnostic ? ` ${diagnostic.code}: ${diagnostic.message}` : " Startup output is suppressed.";
  const readinessDetail = lastHttpErrorStatus !== null
    ? ` APP_READINESS_HTTP_ERROR HTTP ${lastHttpErrorStatus}.`
    : sawTransportFailure ? " APP_TRANSPORT_UNAVAILABLE." : " APP_READINESS_TIMEOUT.";
  throw new Error(`Application SPOGOMI indisponible sur ${baseUrl}.${readinessDetail}${startupDetail}`);
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
