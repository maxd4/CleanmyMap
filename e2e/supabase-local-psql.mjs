import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const psqlCommand = process.platform === "win32" ? "psql.exe" : "/usr/bin/psql";

let cachedDbUrlPromise = null;

function trustedEnvironment() {
  if (process.platform === "win32") {
    return { ...process.env };
  }
  return {
    ...process.env,
    PATH: ["/usr/bin", "/bin", process.env.PATH].filter(Boolean).join(":"),
  };
}

export async function resolveLocalEphemeralDbUrl() {
  if (cachedDbUrlPromise) {
    return cachedDbUrlPromise;
  }
  cachedDbUrlPromise = (async () => {
    let result;
    try {
      result = await execFileAsync(
        supabaseCommand,
        ["supabase", "status", "--workdir", "apps/web", "--output", "json"],
        { cwd: root, shell: process.platform === "win32", maxBuffer: 2 * 1024 * 1024 },
      );
    } catch (error) {
      cachedDbUrlPromise = null;
      const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
      throw new Error(`DB_SEMANTICS_NOT_EXECUTED: ephemeral Supabase status is unavailable.\n${detail}`);
    }
    const start = result.stdout.indexOf("{");
    if (start < 0) {
      cachedDbUrlPromise = null;
      throw new Error("DB_SEMANTICS_NOT_EXECUTED: Supabase status did not return JSON.");
    }
    let status;
    try {
      status = JSON.parse(result.stdout.slice(start));
    } catch (error) {
      cachedDbUrlPromise = null;
      throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Supabase status JSON is invalid. ${error.message}`);
    }
    const apiUrl = new URL(status.API_URL ?? "");
    const dbUrl = new URL(status.DB_URL ?? "");
    assert.ok(
      (apiUrl.hostname === "127.0.0.1" || apiUrl.hostname === "localhost") &&
        (dbUrl.hostname === "127.0.0.1" || dbUrl.hostname === "localhost"),
      "Refusing a PostgreSQL proof against a non-local destination",
    );
    return dbUrl.toString();
  })();
  return cachedDbUrlPromise;
}

export async function runLocalPsqlQuery(
  sql,
  { signal: callerSignal, timeoutMs = 30_000, errorLabel = "local PostgreSQL query failed", rawError = false } = {},
) {
  const dbUrl = await resolveLocalEphemeralDbUrl();
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(callerSignal.reason);
  if (callerSignal?.aborted) {
    controller.abort(callerSignal.reason);
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(
        psqlCommand,
        ["-X", "-x", "-v", "ON_ERROR_STOP=1", "-f", "-", dbUrl],
        {
          cwd: root,
          env: trustedEnvironment(),
          signal: controller.signal,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", (error) => {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      });
      child.on("close", (code, signal) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }
        const error = new Error(
          signal
            ? `psql aborted by signal ${signal}`
            : `psql exited with code ${code}`,
        );
        error.code = code;
        error.signal = signal;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      });
      child.stdin.end(sql);
    });
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    if (rawError) {
      throw new Error(detail);
    }
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: ${errorLabel}.\n${detail}`);
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
