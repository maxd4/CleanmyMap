import path from "node:path";

export const DOCUMENTATION_ROOT = path.resolve(process.cwd(), "..", "..", "documentation");

export function resolveDocumentationPath(canonicalPath: string) {
  const resolved = path.resolve(DOCUMENTATION_ROOT, canonicalPath);
  const relative = path.relative(DOCUMENTATION_ROOT, resolved);
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}
