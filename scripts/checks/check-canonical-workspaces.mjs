import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MOBILE_WORKSPACE = "apps/mobile";
const MOBILE_SENTINELS = [
  "apps/mobile/package.json",
  "apps/mobile/AGENTS.md",
];

function parseArguments(argv) {
  const options = { staged: false, ref: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--staged") {
      options.staged = true;
      continue;
    }
    if (argument === "--ref") {
      options.ref = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument.startsWith("--ref=")) {
      options.ref = argument.slice("--ref=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (options.staged === Boolean(options.ref) || (!options.staged && !options.ref)) {
    throw new Error("exactly one of --staged or --ref=<commit> is required");
  }
  return options;
}

function runGit(repositoryRoot, argumentsList, input = undefined) {
  return execFileSync("git", argumentsList, {
    cwd: repositoryRoot,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    input,
    encoding: "utf8",
  });
}

function workspacePatterns(packageJson) {
  if (Array.isArray(packageJson.workspaces)) return packageJson.workspaces;
  if (Array.isArray(packageJson.workspaces?.packages)) return packageJson.workspaces.packages;
  return [];
}

function declaresMobileWorkspace(packageJson) {
  return workspacePatterns(packageJson).some((pattern) => {
    const normalized = String(pattern).replaceAll("\\", "/").replace(/\/$/, "");
    return normalized === MOBILE_WORKSPACE || normalized === "apps/*" || normalized === "apps/**";
  });
}

function validateTree(readFile) {
  const rootPackageText = readFile("package.json");
  if (rootPackageText === null) {
    throw new Error("canonical workspace check cannot read root package.json");
  }

  let rootPackage;
  try {
    rootPackage = JSON.parse(rootPackageText);
  } catch (error) {
    throw new Error(`canonical workspace check cannot parse root package.json: ${error.message}`);
  }

  if (!declaresMobileWorkspace(rootPackage)) return [];

  return MOBILE_SENTINELS.filter((sentinel) => readFile(sentinel) === null);
}

function readWorkingTreeFile(repositoryRoot, relativePath) {
  const absolutePath = path.join(repositoryRoot, ...relativePath.split("/"));
  try {
    return fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function stagedTree(repositoryRoot) {
  try {
    return runGit(repositoryRoot, ["write-tree"]).trim();
  } catch (error) {
    throw new Error(`canonical workspace check cannot materialize the staged index: ${error.message}`);
  }
}

function readStagedFile(repositoryRoot, tree, relativePath) {
  try {
    return runGit(repositoryRoot, ["show", `${tree}:${relativePath}`]);
  } catch (error) {
    if (/does not exist|exists on disk, but not in/i.test(error.message)) return null;
    throw error;
  }
}

function checkStaged(repositoryRoot) {
  const tree = stagedTree(repositoryRoot);
  return validateTree((relativePath) => readStagedFile(repositoryRoot, tree, relativePath));
}

function checkRef(repositoryRoot, ref) {
  const staticCandidateRoot = process.env.CMM_STATIC_CANDIDATE_ROOT;
  if (staticCandidateRoot) {
    return validateTree((relativePath) => readWorkingTreeFile(staticCandidateRoot, relativePath));
  }

  return validateTree((relativePath) => {
    try {
      return runGit(repositoryRoot, ["show", `${ref}:${relativePath}`]);
    } catch (error) {
      if (/does not exist|exists on disk, but not in/i.test(error.message)) return null;
      throw error;
    }
  });
}

export function validateCanonicalWorkspaceTree({ readFile }) {
  return validateTree(readFile);
}

export function validateStagedCanonicalWorkspaces(repositoryRoot) {
  return checkStaged(repositoryRoot);
}

export function validateRefCanonicalWorkspaces(repositoryRoot, ref) {
  return checkRef(repositoryRoot, ref);
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const repositoryRoot = process.cwd();
  const missing = options.staged
    ? checkStaged(repositoryRoot)
    : checkRef(repositoryRoot, options.ref);

  if (missing.length > 0) {
    throw new Error(`CANONICAL_WORKSPACE_MISSING: ${missing.join(", ")}`);
  }

  console.log(`canonical workspace sentinels verified (${options.staged ? "STAGED" : `PUSH_CANDIDATE ${options.ref}`})`);
}

try {
  main();
} catch (error) {
  console.error(`CANONICAL_WORKSPACE_CHECK_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
