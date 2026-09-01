import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function normalizeRepositoryPath(relativePath) {
  return String(relativePath ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/$/, "");
}

function listFilesystemFiles(root) {
  const files = [];
  const ignoredDirectories = new Set([
    ".git",
    ".next",
    ".vercel",
    ".gitnexus",
    ".playwright-mcp",
    ".codex-remote-attachments",
    "node_modules",
  ]);
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) {
          continue;
        }
        visit(fullPath);
      } else if (entry.isFile()) {
        files.push(normalizeRepositoryPath(path.relative(root, fullPath)));
      }
    }
  };

  visit(root);
  return files.sort();
}

function createView({ files, directories = [], readBinary, mode }) {
  const fileList = [...new Set(files.map(normalizeRepositoryPath))].sort();
  const fileSet = new Set(fileList);
  const directorySet = new Set(directories.map(normalizeRepositoryPath).filter(Boolean));
  for (const file of fileList) {
    const parts = file.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directorySet.add(parts.slice(0, index).join("/"));
    }
  }

  const listFiles = (prefix = "") => {
    const normalizedPrefix = normalizeRepositoryPath(prefix);
    if (!normalizedPrefix) {
      return [...fileList];
    }
    const prefixWithSlash = `${normalizedPrefix}/`;
    return fileList.filter((file) => file.startsWith(prefixWithSlash));
  };

  const exists = (relativePath) => {
    const normalizedPath = normalizeRepositoryPath(relativePath);
    return fileSet.has(normalizedPath) || directorySet.has(normalizedPath);
  };

  const readText = (relativePath) => readBinary(relativePath).toString("utf8");
  const rootFiles = () => fileList.filter((file) => !file.includes("/"));
  const rootDirectories = () => [...new Set([
    ...[...directorySet].filter((directory) => !directory.includes("/")),
    ...fileList.filter((file) => file.includes("/")).map((file) => file.slice(0, file.indexOf("/"))),
  ])].sort();
  const listDirectories = (prefix = "") => {
    const normalizedPrefix = normalizeRepositoryPath(prefix);
    if (!normalizedPrefix) return [...directorySet].sort();
    return [...directorySet].filter((directory) => directory.startsWith(`${normalizedPrefix}/`)).sort();
  };

  return Object.freeze({
    mode,
    exists,
    isFile: (relativePath) => fileSet.has(normalizeRepositoryPath(relativePath)),
    isDirectory: (relativePath) => directorySet.has(normalizeRepositoryPath(relativePath)),
    readBinary,
    readText,
    listFiles,
    listPathsUnder: listFiles,
    listDirectories,
    rootFiles,
    rootDirectories,
  });
}

export function createFilesystemRepositoryView(root = process.cwd()) {
  const repositoryRoot = path.resolve(root);
  const files = listFilesystemFiles(repositoryRoot);
  const directories = [];
  const visitDirectories = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if ([".git", ".next", ".vercel", ".gitnexus", ".playwright-mcp", ".codex-remote-attachments", "node_modules"].includes(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      directories.push(normalizeRepositoryPath(path.relative(repositoryRoot, fullPath)));
      visitDirectories(fullPath);
    }
  };
  visitDirectories(repositoryRoot);
  return createView({
    mode: "filesystem",
    files,
    directories,
    readBinary(relativePath) {
      const normalizedPath = normalizeRepositoryPath(relativePath);
      return fs.readFileSync(path.join(repositoryRoot, ...normalizedPath.split("/")));
    },
  });
}

export function createGitRepositoryView(ref, root = process.cwd()) {
  if (!ref) {
    throw new Error("A Git ref is required for a Git repository view.");
  }

  const repositoryRoot = path.resolve(root);
  const treeOutput = execFileSync("git", ["ls-tree", "--full-tree", "-r", "-z", ref, "--"], {
    cwd: repositoryRoot,
  });
  const objectByPath = new Map();
  for (const record of treeOutput.toString("utf8").split("\0").filter(Boolean)) {
    const separator = record.indexOf("\t");
    const header = record.slice(0, separator).split(" ");
    const relativePath = normalizeRepositoryPath(record.slice(separator + 1));
    if (header[1] === "blob") {
      objectByPath.set(relativePath, header[2]);
    }
  }

  const batchInput = `${[...new Set(objectByPath.values())].join("\n")}\n`;
  const batchOutput = execFileSync("git", ["cat-file", "--batch"], {
    cwd: repositoryRoot,
    input: batchInput,
    maxBuffer: 64 * 1024 * 1024,
  });
  const blobsByObject = new Map();
  let offset = 0;
  while (offset < batchOutput.length) {
    const headerEnd = batchOutput.indexOf(10, offset);
    if (headerEnd < 0) break;
    const header = batchOutput.toString("utf8", offset, headerEnd).split(" ");
    offset = headerEnd + 1;
    if (header[1] !== "blob") continue;
    const size = Number(header[2]);
    const content = Buffer.from(batchOutput.subarray(offset, offset + size));
    blobsByObject.set(header[0], content);
    offset += size + 1;
  }

  const files = [...objectByPath.keys()];

  return createView({
    mode: "git",
    files,
    readBinary(relativePath) {
      const normalizedPath = normalizeRepositoryPath(relativePath);
      const objectId = objectByPath.get(normalizedPath);
      if (!objectId || !blobsByObject.has(objectId)) {
        throw new Error(`Git repository view file is missing: ${normalizedPath}`);
      }
      return blobsByObject.get(objectId);
    },
  });
}

export function createRepositoryView({ root = process.cwd(), ref } = {}) {
  return ref ? createGitRepositoryView(ref, root) : createFilesystemRepositoryView(root);
}

export function parseRepositoryRef(argv = process.argv.slice(2)) {
  const argument = argv.find((value) => value.startsWith("--ref="));
  return argument ? argument.slice("--ref=".length) : null;
}
