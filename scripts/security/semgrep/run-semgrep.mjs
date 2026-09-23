import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const SEMGREP_CONFIG = path.join(REPOSITORY_ROOT, "scripts", "security", "semgrep", "cleanmymap.yml");
export const REQUIRED_SEMGREP_VERSION = "1.177.0";

function findOnPath() {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  for (const command of ["semgrep", "semgrep.exe"]) {
    const result = spawnSync(lookup, [command], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (result.status === 0) {
      const candidate = result.stdout.trim().split(/\r?\n/)[0];
      if (candidate) return candidate;
    }
  }
  return null;
}

export function resolveSemgrep() {
  const configured = process.env.SEMGREP_BIN?.trim();
  return configured || findOnPath();
}

export function runSemgrep(targets, { errorOnFindings = false, excludes = [] } = {}) {
  const executable = resolveSemgrep();
  if (!executable) {
    return {
      status: null,
      stdout: "",
      stderr: "Semgrep est introuvable. Installez semgrep 1.177.0 ou définissez SEMGREP_BIN.",
      error: "HOST_ENVIRONMENT",
    };
  }

  const version = spawnSync(executable, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (version.status !== 0 || version.stdout.trim() !== REQUIRED_SEMGREP_VERSION) {
    return {
      status: null,
      stdout: version.stdout ?? "",
      stderr: `Semgrep ${REQUIRED_SEMGREP_VERSION} est requis (version trouvée : ${version.stdout.trim() || "inconnue"}).`,
      error: "HOST_ENVIRONMENT",
    };
  }

  const args = [
    "--config",
    SEMGREP_CONFIG,
    "--metrics=off",
    "--no-git-ignore",
    "--jobs",
    "4",
    "--json",
    ...(errorOnFindings ? ["--error"] : []),
    ...excludes.flatMap((pattern) => ["--exclude", pattern]),
    ...targets,
  ];
  const result = spawnSync(executable, args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.code ?? null,
  };
}

export function parseSemgrepJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}
