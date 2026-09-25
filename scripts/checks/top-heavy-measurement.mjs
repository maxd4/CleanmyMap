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
  const normalizedText = buffer.toString("utf8").replaceAll("\r\n", "\n");
  return {
    lines: normalizedText.split("\n").length,
    bytes: Buffer.byteLength(normalizedText, "utf8"),
  };
}

export function measureRepositoryFile(view, file) {
  const content = view.readBinary(file);
  const kind = classifyFileKind(file);
  return {
    file,
    ...measureContent(content),
    kind,
    generated: isRegenerableGeneratedFile(file, content),
  };
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

const GENERATED_SOURCE_MARKER = /(?:@generated\b|generated\s+(?:file|source)|do not edit|ne pas modifier)/i;

export function isRegenerableGeneratedFile(file, content = "") {
  if (classifyFileKind(file) !== "generated") return false;

  const normalized = file.replaceAll("\\", "/");
  if (/(?:^|\/)next-env\.d\.ts$/i.test(normalized)) return true;

  const text = Buffer.isBuffer(content) ? content.toString("utf8") : String(content);
  return GENERATED_SOURCE_MARKER.test(text.slice(0, 4096));
}
