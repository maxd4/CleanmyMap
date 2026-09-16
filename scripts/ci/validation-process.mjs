import { execFileSync, spawn } from "node:child_process";

export function terminateProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
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
export function runCommandWithTimeout({ command, cwd = process.cwd(), timeoutMs, env = process.env } = {}) {
  const detached = process.platform !== "win32";
  const child = spawn(command.executable, command.args ?? [], {
    cwd,
    env,
    detached,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let timedOut = false;
  let settled = false;
  let timeoutHandle;

  const collect = (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);

  return new Promise((resolve) => {
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      resolve({ ...result, output, failureFiles: extractFailureFiles(output) });
    };

    child.once("error", (error) => {
      finish({ status: error.code === "ETIMEDOUT" ? "TIME_BUDGET_EXCEEDED" : "FAIL", exitCode: null, error });
    });
    child.once("close", (exitCode, signal) => {
      if (timedOut) {
        finish({ status: "TIME_BUDGET_EXCEEDED", exitCode: null, signal });
      } else {
        finish({ status: exitCode === 0 ? "PASS" : "FAIL", exitCode: exitCode ?? 1, signal });
      }
    });

    timeoutHandle = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      terminateProcessTree(child.pid);
    }, Math.max(1, timeoutMs));
  });
}
