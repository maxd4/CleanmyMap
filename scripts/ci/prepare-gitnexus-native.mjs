import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveValidationCommand } from "./validation-process.mjs";

const GITNEXUS_VERSION = "1.6.12";
const LADYBUG_VERSION = "0.18.3";
const TREE_SITTER_VERSION = "0.21.1";

export const GITNEXUS_NATIVE_ALLOWLIST = Object.freeze([
  Object.freeze({
    name: "@ladybugdb/core",
    version: LADYBUG_VERSION,
    lifecycle: "install",
    script: "node install.js",
  }),
  Object.freeze({
    name: "tree-sitter",
    version: TREE_SITTER_VERSION,
    lifecycle: "install",
    script: "node-gyp-build",
  }),
  Object.freeze({
    name: "gitnexus",
    version: GITNEXUS_VERSION,
    lifecycle: "postinstall",
    script: "node scripts/build-tree-sitter-grammars.cjs",
  }),
]);

function packageDirectory(globalRoot, packageName) {
  return packageName.startsWith("@")
    ? path.join(globalRoot, ...packageName.split("/"))
    : path.join(globalRoot, packageName);
}

function readPackage(globalRoot, packageName) {
  const directory = packageDirectory(globalRoot, packageName);
  const packagePath = path.join(directory, "package.json");

  if (!fs.existsSync(packagePath)) {
    throw new Error(`Missing verified GitNexus dependency: ${packageName}`);
  }

  return {
    directory,
    package: JSON.parse(fs.readFileSync(packagePath, "utf8")),
  };
}

function resolveGitNexusDependency(globalRoot, gitnexusDirectory, entry) {
  const candidateRoots = [path.join(gitnexusDirectory, "node_modules"), globalRoot];
  const dependencyRoot = candidateRoots.find((root) =>
    fs.existsSync(path.join(packageDirectory(root, entry.name), "package.json")),
  );

  if (!dependencyRoot) {
    throw new Error(`Missing verified GitNexus dependency: ${entry.name}`);
  }

  return assertVerifiedPackage(dependencyRoot, entry);
}

function assertVerifiedPackage(globalRoot, entry) {
  const resolved = readPackage(globalRoot, entry.name);
  const actualScript = resolved.package.scripts?.[entry.lifecycle];

  if (resolved.package.name !== entry.name || resolved.package.version !== entry.version) {
    throw new Error(
      `Unverified GitNexus native dependency ${entry.name}: expected ${entry.name}@${entry.version}, found ${resolved.package.name}@${resolved.package.version}`,
    );
  }

  if (actualScript !== entry.script) {
    throw new Error(
      `Unverified ${entry.name}@${entry.version} ${entry.lifecycle} script: expected ${JSON.stringify(entry.script)}, found ${JSON.stringify(actualScript)}`,
    );
  }

  if (resolved.package.scripts?.[`pre${entry.lifecycle}`] || resolved.package.scripts?.[`post${entry.lifecycle}`]) {
    throw new Error(`Unexpected lifecycle wrapper around ${entry.name}@${entry.version} ${entry.lifecycle}`);
  }

  return resolved;
}

function runNodeScript(directory, relativeScript) {
  execFileSync(process.execPath, [path.join(directory, relativeScript)], {
    cwd: directory,
    stdio: "inherit",
  });
}

function runNpmScript(directory, scriptName) {
  if (process.platform === "win32") {
    const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    if (!fs.existsSync(npmCli)) {
      throw new Error(`Bundled npm CLI not found: ${npmCli}`);
    }
    execFileSync(process.execPath, [npmCli, "run", scriptName, "--prefix", directory], {
      cwd: directory,
      stdio: "inherit",
    });
    return;
  }

  const command = resolveValidationCommand(
    { executable: "npm", args: ["run", scriptName, "--prefix", directory] },
    process.platform,
    process.execPath,
  );
  execFileSync(command.executable, command.args, {
    cwd: directory,
    stdio: "inherit",
  });
}

export function prepareGitNexusNative(globalRoot) {
  const normalizedRoot = path.resolve(globalRoot);
  const gitnexus = assertVerifiedPackage(normalizedRoot, GITNEXUS_NATIVE_ALLOWLIST[2]);

  if (gitnexus.package.dependencies?.["@ladybugdb/core"] !== LADYBUG_VERSION) {
    throw new Error("GitNexus dependency contract changed for @ladybugdb/core");
  }
  if (gitnexus.package.dependencies?.["tree-sitter"] !== TREE_SITTER_VERSION) {
    throw new Error("GitNexus dependency contract changed for tree-sitter");
  }

  // npm may hoist dependencies to the supplied npm root or keep them private
  // under GitNexus. Prefer the private tree, then the same npm root that was
  // used for this installation; never search an unrelated global directory.
  const ladybug = resolveGitNexusDependency(normalizedRoot, gitnexus.directory, GITNEXUS_NATIVE_ALLOWLIST[0]);
  const treeSitter = resolveGitNexusDependency(normalizedRoot, gitnexus.directory, GITNEXUS_NATIVE_ALLOWLIST[1]);

  console.log(`Preparing ${ladybug.package.name}@${ladybug.package.version} install script`);
  runNpmScript(ladybug.directory, "install");
  console.log(`Preparing ${treeSitter.package.name}@${treeSitter.package.version} install script`);
  runNpmScript(treeSitter.directory, "install");
  console.log(`Preparing ${gitnexus.package.name}@${gitnexus.package.version} postinstall script`);
  runNodeScript(gitnexus.directory, "scripts/build-tree-sitter-grammars.cjs");
}

function parseGlobalRoot(argv) {
  const flagIndex = argv.indexOf("--global-root");
  if (flagIndex === -1 || !argv[flagIndex + 1] || argv.length !== flagIndex + 2) {
    throw new Error("Usage: node scripts/ci/prepare-gitnexus-native.mjs --global-root <npm-root>");
  }
  return argv[flagIndex + 1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    prepareGitNexusNative(parseGlobalRoot(process.argv.slice(2)));
  } catch (error) {
    console.error(`GitNexus native preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
