import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MANIFEST_NAME = "CANDIDATE.manifest.json";
function safeRelative(value) {
  return typeof value === "string" && value.length > 0 && !path.posix.isAbsolute(value)
    && !value.includes("\\") && !value.split("/").some((part) => part === ".." || part === "" || part === ".");
}
function within(root, relative) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...relative.split("/"));
  return target.startsWith(`${base}${path.sep}`);
}

export function validateCandidateManifestFile(repositoryRoot, manifestPath) {
  const errors = [];
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
  catch (error) { return [`${manifestPath}: invalid JSON (${error.message})`]; }
  if (manifest.schemaVersion !== 1) errors.push(`${manifestPath}: schemaVersion must be 1.`);
  if (!["CANDIDATE", "PUBLISHED"].includes(manifest.status)) errors.push(`${manifestPath}: status must be CANDIDATE or PUBLISHED.`);
  const baseDirectory = path.dirname(manifestPath);
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) errors.push(`${manifestPath}: artifacts must be a non-empty array; a manifest alone is not a candidate.`);
  for (const [index, artifact] of (manifest.artifacts ?? []).entries()) {
    const label = `${manifestPath}: artifacts[${index}]`;
    if (!Array.isArray(artifact.targetPaths) || artifact.targetPaths.length === 0 || artifact.targetPaths.some((target) => !safeRelative(target))) {
      errors.push(`${label}: targetPaths must map to one or more safe repository-relative paths.`);
    }
    if (!new Set(["file", "patch", "sql", "test"]).has(artifact.kind)) errors.push(`${label}: unsupported artifact kind.`);
    if (!safeRelative(artifact?.file) || !within(baseDirectory, artifact.file)) { errors.push(`${label}: file must be a safe path inside the candidate directory.`); continue; }
    const fullPath = path.resolve(baseDirectory, ...artifact.file.split("/"));
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) { errors.push(`${label}: declared artifact is absent: ${artifact.file}.`); continue; }
    const actualHash = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
    if (artifact.sha256 !== actualHash) errors.push(`${label}: SHA-256 mismatch for ${artifact.file}.`);
  }
  return errors;
}

export function validateCandidateArtifactManifests(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const specsRoot = path.join(root, "documentation", "specs");
  if (!fs.existsSync(specsRoot)) return [];
  const manifests = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && entry.name === MANIFEST_NAME) manifests.push(full);
    }
  };
  visit(specsRoot);
  return manifests.flatMap((manifestPath) => validateCandidateManifestFile(root, manifestPath));
}
