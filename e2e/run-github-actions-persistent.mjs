import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_CI_E2E_PROJECTS } from "../scripts/ci/e2e-project-catalog.mjs";

export const CLERK_DEV_BACKEND_ENV = "CMM_E2E_CLERK_DEV_BACKEND_TOKEN";
export const CLERK_DEV_PUBLISHABLE_ENV = "CMM_E2E_CLERK_DEV_PUBLISHABLE_KEY";

const root = process.cwd();
const supabaseDirectory = path.join(root, "apps", "web");
const webEnvFile = path.join(root, "apps", "web", ".env.local");

export function assertClerkDevelopmentSecrets(env = process.env) {
  const backendToken = env[CLERK_DEV_BACKEND_ENV]?.trim();
  const publishableKey = env[CLERK_DEV_PUBLISHABLE_ENV]?.trim();
  const missing = [
    !backendToken && CLERK_DEV_BACKEND_ENV,
    !publishableKey && CLERK_DEV_PUBLISHABLE_ENV,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Clerk Development credentials: ${missing.join(", ")}.`,
    );
  }

  if (!backendToken.startsWith("sk_test_") || !publishableKey.startsWith("pk_test_")) {
    throw new Error("Only Clerk Development credentials are accepted by the persistent E2E lane.");
  }

  if (/\r|\n/.test(backendToken) || /\r|\n/.test(publishableKey)) {
    throw new Error("Clerk Development credentials must be single-line values.");
  }
}

function executable(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable(command), args, {
      cwd: options.cwd ?? root,
      env: options.env ?? process.env,
      stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    if (child.stdout) child.stdout.on("data", (chunk) => { stdout += chunk; });
    if (child.stderr) child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function parseJsonOutput(output) {
  const start = output.indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(output.slice(start));
  } catch {
    return null;
  }
}

function assertLocalSupabaseStatus(status) {
  if (!status?.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
    throw new Error("Ephemeral Supabase status is missing required local credentials.");
  }

  let hostname;
  try {
    hostname = new URL(status.API_URL).hostname;
  } catch {
    throw new Error("Ephemeral Supabase status returned an invalid API URL.");
  }

  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error("Refusing persistent E2E against a non-local Supabase URL.");
  }
}

async function readLocalSupabaseStatus() {
  const result = await runCommand(
    "npx",
    ["supabase", "status", "--workdir", supabaseDirectory, "--output", "json"],
    { cwd: root },
  );
  if (result.code !== 0) {
    throw new Error("Ephemeral Supabase status is unavailable on the CI runner.");
  }
  const status = parseJsonOutput(result.stdout);
  assertLocalSupabaseStatus(status);
  return status;
}

async function writeWebEnvironment() {
  await mkdir(path.dirname(webEnvFile), { recursive: true });
  const backendToken = process.env[CLERK_DEV_BACKEND_ENV].trim();
  const publishableKey = process.env[CLERK_DEV_PUBLISHABLE_ENV].trim();
  const content = [
    "NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000",
    "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
    `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${publishableKey}`,
    `CLERK_SECRET_KEY=${backendToken}`,
    "CLERK_DOMAIN=",
    "CLERK_IS_SATELLITE=0",
    "CLERK_SATELLITE_AUTO_SYNC=1",
    "NEXT_PUBLIC_CLERK_PROXY_URL=",
    "CMM_DISABLE_DEV_AUTH_BYPASS=1",
  ].join("\n") + "\n";
  await writeFile(webEnvFile, content, { encoding: "utf8", flag: "wx" });
}

const ALLOWED_CI_PROJECTS = new Set(ALL_CI_E2E_PROJECTS);

function resolvePersistentProjects(raw = process.env.PLAYWRIGHT_PROJECTS) {
  const requested = String(raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (requested.length === 0) return [...ALL_CI_E2E_PROJECTS];
  const invalid = requested.filter((name) => !ALLOWED_CI_PROJECTS.has(name));
  if (invalid.length > 0) {
    throw new Error(`Unsupported Playwright project(s): ${invalid.join(", ")}`);
  }
  return requested;
}

function resolveUnmappedE2eFiles(raw = process.env.UNMAPPED_E2E_FILES) {
  return String(raw ?? "")
    .split(",")
    .map((value) => value.trim().replaceAll("\\", "/"))
    .filter(Boolean);
}

export function collectExecutedSpecFilesFromReport(report) {
  const executed = new Set();
  function hasExecutedResult(spec) {
    if (!Array.isArray(spec?.tests)) return false;
    return spec.tests.some(
      (test) =>
        Array.isArray(test?.results) &&
        test.results.some(
          (result) =>
            result &&
            typeof result === "object" &&
            typeof result.status === "string" &&
            result.status !== "skipped",
        ),
    );
  }
  function walkSuite(suite) {
    if (!suite || typeof suite !== "object") return;
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        if (
          typeof spec?.file === "string" &&
          spec.file.trim() &&
          hasExecutedResult(spec)
        ) {
          executed.add(spec.file.trim().replaceAll("\\", "/"));
        }
      }
    }
    if (Array.isArray(suite.suites)) {
      for (const child of suite.suites) walkSuite(child);
    }
  }
  if (Array.isArray(report?.suites)) {
    for (const suite of report.suites) walkSuite(suite);
  }
  return executed;
}

export async function assertUnmappedSpecsDiscovered(projects, env) {
  const unmapped = resolveUnmappedE2eFiles(env.UNMAPPED_E2E_FILES);
  if (unmapped.length === 0) return;

  const listResult = await runCommand(
    "npx",
    [
      "playwright",
      "test",
      "--list",
      ...projects.map((project) => `--project=${project}`),
    ],
    {
      cwd: root,
      env: { ...env, PLAYWRIGHT_SKIP_WEBSERVER: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (listResult.code !== 0) {
    throw new Error(
      `Failed to list Playwright tests for uncatalogued spec check: ${listResult.stderr || listResult.stdout}`,
    );
  }
  const normalizedOutput = listResult.stdout.replaceAll("\\", "/");
  const missing = unmapped.filter((filePath) => {
    const relativeToE2e = filePath.replace(/^e2e\//, "");
    return !normalizedOutput.includes(relativeToE2e);
  });
  if (missing.length > 0) {
    throw new Error(
      `Uncatalogued E2E file(s) not discovered by Playwright --list (${projects.join(", ")}): ${missing.join(", ")}. Register them in scripts/ci/e2e-project-catalog.mjs and playwright.config.ts.`,
    );
  }
}

export async function assertUnmappedSpecsExecutedInReport(
  unmappedFiles,
  resultsPath = path.join(root, "artifacts", "playwright", "results.json"),
) {
  const unmapped = resolveUnmappedE2eFiles(
    Array.isArray(unmappedFiles) ? unmappedFiles.join(",") : unmappedFiles,
  );
  if (unmapped.length === 0) return;
  const raw = await readFile(resultsPath, "utf8");
  const report = JSON.parse(raw);
  const executed = collectExecutedSpecFilesFromReport(report);
  const missing = unmapped.filter((filePath) => {
    const relativeToE2e = filePath.replace(/^e2e\//, "");
    return !executed.has(filePath) && !executed.has(relativeToE2e);
  });
  if (missing.length > 0) {
    throw new Error(
      `Uncatalogued E2E file(s) discovered via --list but not executed in Playwright results.json: ${missing.join(", ")}.`,
    );
  }
}

async function runPersistentE2E() {
  assertClerkDevelopmentSecrets();
  const projects = resolvePersistentProjects();
  await assertUnmappedSpecsDiscovered(projects, process.env);
  await writeWebEnvironment();
  try {
    const local = await readLocalSupabaseStatus();
    const env = {
      ...process.env,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
      DEV_HOST: "127.0.0.1",
      DEV_STRICT_PORT: "1",
      NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
      SUPABASE_URL: local.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
      SUPABASE_ANON_KEY: local.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
      CMM_SUPABASE_TEST_ENVIRONMENT: "ephemeral",
      CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION: "I_UNDERSTAND_EPHEMERAL_ONLY",
      CMM_DISABLE_DEV_AUTH_BYPASS: "1",
    };
    const result = await runCommand(
      "npx",
      [
        "playwright",
        "test",
        ...projects.map((project) => `--project=${project}`),
      ],
      { cwd: root, env, stdio: "inherit" },
    );
    await assertUnmappedSpecsExecutedInReport(process.env.UNMAPPED_E2E_FILES);
    await runCommand(
      "node",
      [
        "scripts/ci/ci-timing-report.mjs",
        "--playwright-json=artifacts/playwright/results.json",
        "--output=artifacts/ci/e2e-timing-summary.json",
        "--append-step-summary",
      ],
      { cwd: root, env, stdio: "inherit" },
    ).catch(() => undefined);
    return result.code ?? 1;
  } finally {
    await rm(webEnvFile, { force: true });
  }
}

async function main() {
  try {
    if (process.argv.includes("require-clerk")) {
      assertClerkDevelopmentSecrets();
      process.stdout.write("Clerk Development credentials verified.\n");
    } else {
      process.exitCode = await runPersistentE2E();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Persistent E2E lane failed.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
