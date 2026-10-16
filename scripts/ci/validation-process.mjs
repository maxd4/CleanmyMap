import fs from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";

function existingFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function npmBinCandidates(execPath, platform) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const nodeDirectory = pathApi.dirname(execPath);
  const candidates = [pathApi.join(nodeDirectory, "node_modules", "npm", "bin")];
  if (platform !== "win32") {
    candidates.push(
      pathApi.join(nodeDirectory, "..", "lib", "node_modules", "npm", "bin"),
      pathApi.join(nodeDirectory, "..", "share", "nodejs", "npm", "bin"),
    );
  }
  return candidates;
}

export function resolveValidationCommand(
  command,
  platform = process.platform,
  execPath = process.execPath,
  fileExists = existingFile,
) {
  if (command.executable !== "npm" && command.executable !== "npx") return command;

  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const cliName = command.executable === "npm" ? "npm-cli.js" : "npx-cli.js";
  const cliPath = npmBinCandidates(execPath, platform)
    .map((npmBin) => pathApi.join(npmBin, cliName))
    .find(fileExists);
  if (!cliPath) {
    throw new Error(`HOST_ENVIRONMENT: ${command.executable} CLI was not found beside Node for ${platform}. PATH is intentionally not used.`);
  }
  return { executable: execPath, args: [cliPath, ...(command.args ?? [])] };
}

export function resolveWindowsSystemExecutable(
  executableName,
  { platform = process.platform, env = process.env, fileExists = existingFile } = {},
) {
  if (platform !== "win32") return null;
  const systemRoot = typeof env.SystemRoot === "string" ? env.SystemRoot.trim() : "";
  if (!systemRoot || !path.win32.isAbsolute(systemRoot)) return null;
  const executablePath = path.win32.join(systemRoot, "System32", executableName);
  return fileExists(executablePath) ? executablePath : null;
}

function terminateProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    const taskkill = resolveWindowsSystemExecutable("taskkill.exe");
    if (!taskkill) throw new Error("HOST_ENVIRONMENT: Windows taskkill was not found in the trusted system directory.");
    try {
      execFileSync(taskkill, ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // The process may have exited between the timeout and taskkill.
    }
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The process may have exited between the timeout and cleanup.
    }
  }
  const forceKill = setTimeout(() => {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // The process tree is already gone.
      }
    }
  }, 250);
  forceKill.unref?.();
}

function extractFailureFiles(output) {
  const candidates = output.match(/(?:[A-Za-z]:[\\/])?(?:apps|scripts|maintenance|documentation)[\\/][^\s:'"`]+/g) ?? [];
  return [...new Set(candidates.map((file) => file.replaceAll("\\", "/")))];
}

/** Run one check with a real process-tree timeout and deterministic cleanup. */
export function runCommandWithTimeout({
  command,
  cwd = process.cwd(),
  timeoutMs,
  heartbeatMs,
  env = process.env,
  onStdout,
  onStderr,
  onHeartbeat,
} = {}) {
  const detached = process.platform !== "win32";
  const child = spawn(command.executable, command.args ?? [], {
    cwd,
    env,
    detached,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let interrupted = false;
  let settled = false;
  let timeoutHandle;
  let heartbeatHandle;
  const startedAt = performance.now();

  const collect = (stream, chunk) => {
    const text = chunk.toString();
    output += text;
    if (stream === "stdout") {
      stdout += text;
      if (onStdout) onStdout(text);
      else process.stdout.write(text);
    } else {
      stderr += text;
      if (onStderr) onStderr(text);
      else process.stdout.write(text);
    }
  };
  child.stdout?.on("data", (chunk) => collect("stdout", chunk));
  child.stderr?.on("data", (chunk) => collect("stderr", chunk));

  return new Promise((resolve) => {
    const removeSignalHandlers = () => {
      process.removeListener("SIGINT", handleInterrupt);
      process.removeListener("SIGTERM", handleInterrupt);
    };
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      clearInterval(heartbeatHandle);
      removeSignalHandlers();
      resolve({
        ...result,
        output,
        stdout,
        stderr,
        elapsedSeconds: (performance.now() - startedAt) / 1000,
        timedOut,
        interrupted,
        failureFiles: extractFailureFiles(output),
      });
    };
    const handleInterrupt = () => {
      if (settled) return;
      interrupted = true;
      terminateProcessTree(child.pid);
    };

    child.once("error", (error) => {
      finish({ status: interrupted ? "INTERRUPTED" : "FAIL", exitCode: null, error });
    });
    child.once("close", (exitCode, signal) => {
      if (timedOut) {
        finish({ status: "TIME_BUDGET_EXCEEDED", exitCode: null, signal });
      } else if (interrupted) {
        finish({ status: "INTERRUPTED", exitCode: null, signal });
      } else {
        finish({ status: exitCode === 0 ? "PASS" : "FAIL", exitCode: exitCode ?? 1, signal });
      }
    });

    process.once("SIGINT", handleInterrupt);
    process.once("SIGTERM", handleInterrupt);

    if (Number.isFinite(heartbeatMs) && heartbeatMs > 0 && onHeartbeat) {
      heartbeatHandle = setInterval(() => {
        onHeartbeat((performance.now() - startedAt) / 1000);
      }, heartbeatMs);
    }

    if (Number.isFinite(timeoutMs)) {
      timeoutHandle = setTimeout(() => {
        if (settled) return;
        timedOut = true;
        terminateProcessTree(child.pid);
      }, Math.max(1, timeoutMs));
    }
  });
}
