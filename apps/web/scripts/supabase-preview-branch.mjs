#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_MAIN_BRANCHES = new Set(["main", "master", "trunk"]);

function parseArgs(argv) {
  const out = {
    projectRef: "",
    gitBranch: "",
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (arg.startsWith("--project-ref=")) {
      out.projectRef = arg.slice("--project-ref=".length).trim();
      continue;
    }
    if (arg.startsWith("--git-branch=")) {
      out.gitBranch = arg.slice("--git-branch=".length).trim();
      continue;
    }
  }

  return out;
}

function runCommand(command, args, options = {}) {
  if (process.platform === "win32") {
    const quoted = [command, ...args]
      .map((value) => `'${String(value).replace(/'/g, "''")}'`)
      .join(" ");
    return spawnSync("powershell", ["-NoProfile", "-Command", `& ${quoted}`], {
      cwd: options.cwd,
      encoding: "utf8",
    });
  }

  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
  });
}

function getGitBranch(cwd) {
  const result = runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  if (result.status === 0) {
    const branch = (result.stdout || "").trim();
    if (branch.length === 0 || branch === "HEAD") {
      return null;
    }
    return branch;
  }
  return null;
}

function loadLinkedProjectRef(cwd) {
  const linkedProjectPath = resolve(cwd, "supabase", ".temp", "linked-project.json");
  if (!existsSync(linkedProjectPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(readFileSync(linkedProjectPath, "utf8"));
    return typeof raw?.ref === "string" && raw.ref.trim().length > 0 ? raw.ref.trim() : null;
  } catch {
    return null;
  }
}

function loadPreviewBranches(cwd, projectRef) {
  const result = runCommand(
    "npx",
    ["supabase", "branches", "list", "--project-ref", projectRef, "-o", "json"],
    { cwd },
  );

  if (result.status !== 0) {
    const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(`Supabase branches list failed\n${details}`);
  }

  const raw = (result.stdout || "").trim();
  const parsed = raw.length > 0 ? JSON.parse(raw) : [];
  if (!Array.isArray(parsed)) {
    throw new Error("Supabase branches list did not return an array.");
  }

  return parsed;
}

function isActivePreviewBranch(branch) {
  return branch?.preview_project_status === "ACTIVE_HEALTHY";
}

function runSupabaseBranchCommand(cwd, args, dryRun) {
  if (dryRun) {
    console.log(`[backend][dry-run] npx ${args.join(" ")}`);
    return { status: 0, stdout: "", stderr: "" };
  }

  const result = runCommand("npx", args, { cwd });
  if (result.status !== 0) {
    const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(`Supabase branch command failed: ${args.join(" ")}\n${details}`);
  }

  return result;
}

function ensurePreviewBranch({ cwd, projectRef, gitBranch, dryRun }) {
  if (DEFAULT_MAIN_BRANCHES.has(gitBranch)) {
    console.log(`[backend] Supabase preview association not needed on ${gitBranch}.`);
    return;
  }

  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    throw new Error(
      "Missing SUPABASE_ACCESS_TOKEN. Run `supabase login` or export the token before ensuring a preview branch.",
    );
  }

  const branches = loadPreviewBranches(cwd, projectRef);
  const exact = branches.find((branch) => branch.git_branch === gitBranch);
  const sameName = exact || branches.find((branch) => branch.name === gitBranch);

  if (exact && isActivePreviewBranch(exact)) {
    console.log(`[backend] Supabase preview already associated and active for ${gitBranch}.`);
    return;
  }

  if (sameName && sameName.git_branch !== gitBranch) {
    console.log(`[backend] Updating Supabase preview branch ${sameName.name} -> ${gitBranch}.`);
    runSupabaseBranchCommand(
      cwd,
      ["supabase", "branches", "update", sameName.name, "--git-branch", gitBranch, "--project-ref", projectRef],
      dryRun,
    );
    if (!dryRun) {
      console.log(`[backend] Supabase preview branch association updated for ${gitBranch}.`);
    }
  } else if (!sameName) {
    console.log(`[backend] Creating Supabase preview branch for ${gitBranch}.`);
    runSupabaseBranchCommand(
      cwd,
      ["supabase", "branches", "create", gitBranch, "--git-branch", gitBranch, "--project-ref", projectRef],
      dryRun,
    );
    if (!dryRun) {
      console.log(`[backend] Supabase preview branch created for ${gitBranch}.`);
    }
  }

  const refreshedBranches = dryRun ? branches : loadPreviewBranches(cwd, projectRef);
  const refreshed = refreshedBranches.find((branch) => branch.git_branch === gitBranch) || sameName;

  if (refreshed && !isActivePreviewBranch(refreshed)) {
    console.log(`[backend] Unpausing Supabase preview branch ${refreshed.name} for ${gitBranch}.`);
    runSupabaseBranchCommand(
      cwd,
      ["supabase", "branches", "unpause", refreshed.name, "--project-ref", projectRef],
      dryRun,
    );
    if (!dryRun) {
      console.log(`[backend] Supabase preview branch activated for ${gitBranch}.`);
    }
  } else if (refreshed) {
    console.log(`[backend] Supabase preview already active for ${gitBranch}.`);
  }
}

const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();
const projectRef = args.projectRef || loadLinkedProjectRef(cwd);
const gitBranch = args.gitBranch || getGitBranch(cwd);

if (!projectRef) {
  throw new Error(
    "Missing linked Supabase project reference. Run `supabase link` inside apps/web or pass --project-ref=...",
  );
}

if (!gitBranch) {
  throw new Error("Unable to detect the current git branch. Pass --git-branch=...");
}

ensurePreviewBranch({
  cwd,
  projectRef,
  gitBranch,
  dryRun: args.dryRun,
});
