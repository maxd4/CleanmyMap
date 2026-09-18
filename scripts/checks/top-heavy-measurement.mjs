import path from "node:path";

export const HEAVY_FILE_EXTENSIONS = new Set([".ts", ".tsx"]);

function isIgnoredPath(file) {
  return /(?:^|\/)(?:\.git|node_modules|\.next|dist|build|coverage|maintenance)(?:\/|$)/.test(file);
}

export function isMeasuredFile(file) {
  return HEAVY_FILE_EXTENSIONS.has(path.posix.extname(file)) && !isIgnoredPath(file);
}

export function measureContent(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return {
    lines: buffer.toString("utf8").split(/\r?\n/).length,
    bytes: buffer.length,
  };
}

export function measureRepositoryFile(view, file) {
  return { file, ...measureContent(view.readBinary(file)) };
}

export function collectMeasuredRows(view, scanRoots) {
  return [...new Set(scanRoots.flatMap((root) => view.listFiles(root)))]
    .filter(isMeasuredFile)
    .map((file) => measureRepositoryFile(view, file));
}

export function classifyFileKind(file) {
  const normalized = file.replaceAll("\\", "/");
  const fileName = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (/(?:^|\/)(?:generated|__generated__)(?:\/|$)|(?:^|\/)next-env\.d\.ts$|\.generated\./i.test(normalized)) {
    return "generated";
  }
  if (/(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:test|spec)(?:\.[^.]+)*\.(?:ts|tsx)$/i.test(normalized)) {
    return "test";
  }
  if (
    /(?:^|\/)(?:data|config|constants|types)(?:\/|$)/i.test(normalized) ||
    /(?:^|[-_.])(?:data|config|constants|types)(?:[-_.]|$)/i.test(fileName)
  ) {
    return "data/config";
  }
  return "runtime";
}
