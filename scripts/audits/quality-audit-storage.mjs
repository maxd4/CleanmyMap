import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const QUALITY_AUDIT_ROOT = "artifacts/quality-audits";
export const QUALITY_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles", "maintainability", "all"]);
export const QUALITY_AUDIT_RETENTION_LIMIT = 3;
export const QUALITY_PROJECTION_PREFIX = "quality-index";

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ARTIFACT_SUFFIXES = Object.freeze({ report: "report.json", manifest: "manifest.json", summary: "summary.md" });
const PROJECTION_SUFFIXES = Object.freeze({ index: "index.json", summary: "summary.md", bundle: "bundle.zip" });
const ACTIVE_MARKER_PREFIX = ".active-";
const LOCK_DIRECTORY = ".retention.lock";
const LOCK_WAIT_MS = 5_000;
const PROCESS_INSTANCE_ID = randomUUID();

function qualityRoot(root) {
  return path.join(root, QUALITY_AUDIT_ROOT);
}

function assertSha(auditedHead) {
  if (!SHA_PATTERN.test(auditedHead ?? "")) throw new Error(`SHA Git invalide pour les artefacts qualité: ${auditedHead}`);
}

function assertRunId(runId) {
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) throw new Error(`Identifiant d'exécution invalide: ${runId}`);
}

function assertAudit(audit) {
  if (!QUALITY_AUDITS.includes(audit)) throw new Error(`Audit qualité inconnu: ${audit}`);
}

export function artifactFileName({ audit, runId, kind }) {
  assertAudit(audit);
  assertRunId(runId);
  const suffix = ARTIFACT_SUFFIXES[kind];
  if (!suffix) throw new Error(`Type d'artefact inconnu: ${kind}`);
  return `${audit}--${runId}--${suffix}`;
}

export function createAuditPaths({ root, auditedHead, audit, runId } = {}) {
  assertSha(auditedHead);
  assertAudit(audit);
  assertRunId(runId);
  const shaRoot = path.join(root, QUALITY_AUDIT_ROOT, auditedHead);
  return {
    shaRoot,
    runRoot: shaRoot,
    runId,
    auditRoot: shaRoot,
    manifest: path.join(shaRoot, artifactFileName({ audit, runId, kind: "manifest" })),
    report: path.join(shaRoot, artifactFileName({ audit, runId, kind: "report" })),
    summary: path.join(shaRoot, artifactFileName({ audit, runId, kind: "summary" })),
  };
}

export function createQualityProjectionPaths({ root, auditedHead, runId } = {}) {
  assertSha(auditedHead);
  assertRunId(runId);
  const shaRoot = path.join(root, QUALITY_AUDIT_ROOT, auditedHead);
  const fileName = (kind) => `${QUALITY_PROJECTION_PREFIX}--${runId}--${PROJECTION_SUFFIXES[kind]}`;
  return {
    shaRoot,
    runId,
    index: path.join(shaRoot, fileName("index")),
    summary: path.join(shaRoot, fileName("summary")),
    bundle: path.join(shaRoot, fileName("bundle")),
  };
}

export function writeNewFile(filePath, content, fsApi = fs) {
  if (fsApi.existsSync(filePath)) throw new Error(`Fichier déjà présent, refus d'écrasement: ${filePath}`);
  const temporaryPath = `${filePath}.${process.pid}-${randomUUID()}.tmp`;
  try {
    fsApi.writeFileSync(temporaryPath, content, { encoding: "utf8", flag: "wx" });
    if (fsApi.existsSync(filePath)) throw new Error(`Fichier déjà présent, refus d'écrasement: ${filePath}`);
    fsApi.renameSync(temporaryPath, filePath);
  } catch (error) {
    try { fsApi.unlinkSync(temporaryPath); } catch { /* preserve the original failure */ }
    throw error;
  }
}

export function writeAuditArtifactFiles({ paths, report, manifest, summary, fsApi = fs } = {}) {
  fsApi.mkdirSync(paths.shaRoot, { recursive: true });
  for (const filePath of [paths.report, paths.manifest, paths.summary]) {
    if (fsApi.existsSync(filePath)) throw new Error(`Collision d'artefact qualité: ${filePath}`);
  }
  writeNewFile(paths.report, `${JSON.stringify(report, null, 2)}\n`, fsApi);
  try {
    writeNewFile(paths.summary, summary, fsApi);
    writeNewFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, fsApi);
  } catch (error) {
    // Generated files are deliberately retained for diagnosis; no partial
    // success is reported by the caller when the bundle cannot be completed.
    throw error;
  }
}

function activeMarkerPath(root, auditedHead, runId) {
  assertSha(auditedHead);
  assertRunId(runId);
  return path.join(qualityRoot(root), `${ACTIVE_MARKER_PREFIX}${auditedHead}--${runId}.json`);
}

function currentOwner() {
  return { pid: process.pid, hostname: os.hostname(), instanceId: PROCESS_INSTANCE_ID };
}

export async function beginActiveAudit({ root, auditedHead, runId, now = () => new Date().toISOString(), fsApi = fs, lockWaitMs = LOCK_WAIT_MS } = {}) {
  const marker = activeMarkerPath(root, auditedHead, runId);
  const lock = await acquireRetentionLock(root, { fsApi, waitMs: lockWaitMs });
  if (lock.status !== "ACQUIRED") {
    const error = new Error(`Impossible d'enregistrer l'audit actif: verrou de rétention indisponible (${lock.lockPath})`);
    error.code = "RETENTION_LOCK_ACTIVE";
    throw error;
  }
  try {
    fsApi.writeFileSync(marker, `${JSON.stringify({ schemaVersion: 1, kind: "quality-audit-active", auditedHead, runId, startedAt: now(), owner: currentOwner() })}\n`, { encoding: "utf8", flag: "wx" });
    return marker;
  } finally {
    releaseRetentionLock(lock, fsApi);
  }
}

export function endActiveAudit(marker, fsApi = fs) {
  try { fsApi.unlinkSync(marker); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function isSafeShaDirectory(entry) {
  return entry.isDirectory() && !entry.isSymbolicLink() && SHA_PATTERN.test(entry.name);
}

function parseFlatArtifactName(name) {
  for (const audit of QUALITY_AUDITS) {
    const prefix = `${audit}--`;
    if (!name.startsWith(prefix)) continue;
    for (const [kind, suffix] of Object.entries(ARTIFACT_SUFFIXES)) {
      const ending = `--${suffix}`;
      if (!name.endsWith(ending)) continue;
      const runId = name.slice(prefix.length, -ending.length);
      if (RUN_ID_PATTERN.test(runId)) return { audit, runId, kind };
    }
  }
  return null;
}

function expectedLegacyFile(fileName) {
  return fileName === "manifest.json" ? "manifest" : fileName === "report.json" ? "report" : fileName === "summary.md" ? "summary" : null;
}

function readJson(filePath, fsApi) {
  try { return JSON.parse(fsApi.readFileSync(filePath, "utf8")); } catch { return null; }
}

function validManifest(manifest, { auditedHead, audit, runId }) {
  return manifest?.schemaVersion === 1
    && manifest.audit === audit
    && manifest.auditedHead === auditedHead
    && manifest.runId === runId
    && typeof manifest.generatedAt === "string"
    && !Number.isNaN(Date.parse(manifest.generatedAt));
}

function inventoryArtifactPath(inventory, artifact) {
  return path.relative(inventory.path, artifact.sourcePath);
}

function addArtifact(inventory, artifact) {
  const key = `${artifact.projection ?? artifact.audit}:${artifact.runId}:${artifact.kind}`;
  if (inventory.artifactKeys.has(key)) {
    inventory.unknown.push(`duplicate:${key}`);
    return;
  }
  inventory.artifactKeys.add(key);
  inventory.artifacts.push(artifact);
}

function inspectFlatEntry({ root, shaEntry, child, fsApi }) {
  const parsed = parseFlatArtifactName(child.name);
  if (!parsed || !child.isFile() || child.isSymbolicLink()) return null;
  const filePath = path.join(shaEntry.path, child.name);
  const artifact = { ...parsed, sourcePath: filePath, legacy: false };
  if (parsed.kind === "manifest") artifact.manifest = readJson(filePath, fsApi);
  return artifact;
}

function parseFlatProjectionName(name) {
  const prefix = `${QUALITY_PROJECTION_PREFIX}--`;
  if (!name.startsWith(prefix)) return null;
  for (const [kind, suffix] of Object.entries(PROJECTION_SUFFIXES)) {
    const ending = `--${suffix}`;
    if (!name.endsWith(ending)) continue;
    const runId = name.slice(prefix.length, -ending.length);
    if (RUN_ID_PATTERN.test(runId)) return { projection: QUALITY_PROJECTION_PREFIX, runId, kind };
  }
  return null;
}

function inspectFlatProjectionEntry({ shaEntry, child }) {
  const parsed = parseFlatProjectionName(child.name);
  if (!parsed || !child.isFile() || child.isSymbolicLink()) return null;
  return { ...parsed, sourcePath: path.join(shaEntry.path, child.name), legacy: false };
}

function inspectLegacyRun({ shaEntry, runEntry, fsApi, inventory }) {
  if (!runEntry.isDirectory() || runEntry.isSymbolicLink() || !RUN_ID_PATTERN.test(runEntry.name)) {
    inventory.unknown.push(runEntry.name);
    return;
  }
  const runPath = path.join(shaEntry.path, runEntry.name);
  for (const child of fsApi.readdirSync(runPath, { withFileTypes: true })) {
    if (child.isSymbolicLink()) { inventory.unknown.push(`${runEntry.name}/${child.name}`); continue; }
    if (child.isFile()) {
      const kind = expectedLegacyFile(child.name);
      if (!kind) { inventory.unknown.push(`${runEntry.name}/${child.name}`); continue; }
      const filePath = path.join(runPath, child.name);
      addArtifact(inventory, { audit: "all", runId: runEntry.name, kind, sourcePath: filePath, legacy: true, manifest: kind === "manifest" ? readJson(filePath, fsApi) : null });
      continue;
    }
    if (!child.isDirectory() || !QUALITY_AUDITS.includes(child.name)) { inventory.unknown.push(`${runEntry.name}/${child.name}`); continue; }
    const auditPath = path.join(runPath, child.name);
    for (const file of fsApi.readdirSync(auditPath, { withFileTypes: true })) {
      const kind = file.isFile() && !file.isSymbolicLink() ? expectedLegacyFile(file.name) : null;
      if (!kind) { inventory.unknown.push(`${runEntry.name}/${child.name}/${file.name}`); continue; }
      const filePath = path.join(auditPath, file.name);
      addArtifact(inventory, { audit: child.name, runId: runEntry.name, kind, sourcePath: filePath, legacy: true, manifest: kind === "manifest" ? readJson(filePath, fsApi) : null });
    }
  }
}

function inspectShaDirectory(root, entry, fsApi = fs) {
  const shaEntry = { name: entry.name, path: path.join(qualityRoot(root), entry.name) };
  const inventory = { ...shaEntry, artifacts: [], artifactKeys: new Set(), unknown: [] };
  for (const child of fsApi.readdirSync(shaEntry.path, { withFileTypes: true })) {
    const flat = inspectFlatEntry({ root, shaEntry, child, fsApi });
    if (flat) { addArtifact(inventory, flat); continue; }
    const projection = inspectFlatProjectionEntry({ shaEntry, child });
    if (projection) { addArtifact(inventory, projection); continue; }
    if (child.isDirectory() && !child.isSymbolicLink()) inspectLegacyRun({ shaEntry, runEntry: child, fsApi, inventory });
    else inventory.unknown.push(child.name);
  }
  inventory.artifacts = inventory.artifacts.filter((artifact) => {
    if (artifact.kind !== "manifest") return true;
    const valid = validManifest(artifact.manifest, { auditedHead: entry.name, audit: artifact.audit, runId: artifact.runId });
    if (!valid) inventory.unknown.push(`invalid-manifest:${path.relative(shaEntry.path, artifact.sourcePath)}`);
    return valid;
  });
  const manifests = inventory.artifacts.filter((artifact) => artifact.kind === "manifest");
  const manifestKeys = new Set(manifests.map((artifact) => `${artifact.audit}:${artifact.runId}`));
  const aggregateRunIds = new Set(manifests.filter((artifact) => artifact.audit === "all").map((artifact) => artifact.runId));
  for (const artifact of inventory.artifacts) {
    if (artifact.kind === "manifest") continue;
    if (artifact.projection) {
      if (!aggregateRunIds.has(artifact.runId)) {
        inventory.unknown.push(`orphan-projection:${inventoryArtifactPath(inventory, artifact)}`);
      }
      continue;
    }
    if (!manifestKeys.has(`${artifact.audit}:${artifact.runId}`)) {
      inventory.unknown.push(`unattributed-artifact:${inventoryArtifactPath(inventory, artifact)}`);
    }
  }
  for (const key of manifestKeys) {
    for (const kind of Object.keys(ARTIFACT_SUFFIXES)) {
      if (!inventory.artifacts.some((artifact) => `${artifact.audit}:${artifact.runId}` === key && artifact.kind === kind)) {
        inventory.unknown.push(`missing:${key}:${kind}`);
      }
    }
  }
  inventory.generated = inventory.unknown.length === 0 && manifests.length > 0;
  inventory.lastExecuted = manifests.reduce((latest, artifact) => {
    const time = Date.parse(artifact.manifest.generatedAt);
    return time > latest ? time : latest;
  }, 0);
  return inventory;
}

function markerOwnerState(owner) {
  if (!owner || owner.hostname !== os.hostname() || !Number.isInteger(owner.pid) || owner.pid <= 0) return "AMBIGUOUS";
  try {
    process.kill(owner.pid, 0);
    return "ALIVE";
  } catch (error) {
    if (error?.code === "ESRCH" || error?.code === "ENOENT") return "ABSENT";
    return "AMBIGUOUS";
  }
}

function parseActiveMarkerName(name) {
  const suffix = ".json";
  if (!name.startsWith(ACTIVE_MARKER_PREFIX) || !name.endsWith(suffix)) return null;
  const identity = name.slice(ACTIVE_MARKER_PREFIX.length, -suffix.length);
  const auditedHead = identity.slice(0, 40);
  if (!SHA_PATTERN.test(auditedHead)) return null;
  const runId = identity.slice(40, 42) === "--" ? identity.slice(42) : null;
  return { auditedHead: auditedHead.toLowerCase(), runId: runId && RUN_ID_PATTERN.test(runId) ? runId : null };
}

function markerDeclaredIdentity(marker) {
  return {
    auditedHead: typeof marker?.auditedHead === "string" && SHA_PATTERN.test(marker.auditedHead) ? marker.auditedHead.toLowerCase() : null,
    runId: typeof marker?.runId === "string" && RUN_ID_PATTERN.test(marker.runId) ? marker.runId : null,
  };
}

function activeMarkerDiagnostics(entryName, marker) {
  const state = markerOwnerState(marker.owner);
  if (state === "ALIVE") return { activeSha: marker.auditedHead.toLowerCase() };
  if (state === "ABSENT") {
    return { abandoned: true, diagnostic: `${entryName}:ABANDONED_MARKER_RECOVERED` };
  }
  return { activeSha: marker.auditedHead, diagnostic: `${entryName}:ACTIVE_MARKER_AMBIGUOUS_PRESERVED` };
}

function activeShaSet(root, fsApi = fs) {
  const active = new Set();
  const diagnostics = [];
  let entries;
  try { entries = fsApi.readdirSync(qualityRoot(root), { withFileTypes: true }); } catch { return { active, diagnostics }; }
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.startsWith(ACTIVE_MARKER_PREFIX)) continue;
    const markerPath = path.join(qualityRoot(root), entry.name);
    const marker = readJson(markerPath, fsApi);
    const namedIdentity = parseActiveMarkerName(entry.name);
    const declaredIdentity = markerDeclaredIdentity(marker);
    const protectedShas = new Set([namedIdentity?.auditedHead, declaredIdentity.auditedHead].filter(Boolean));
    const identityContradiction = namedIdentity && declaredIdentity.auditedHead
      && (namedIdentity.auditedHead !== declaredIdentity.auditedHead || namedIdentity.runId !== declaredIdentity.runId);
    const valid = marker?.schemaVersion === 1
      && marker.kind === "quality-audit-active"
      && namedIdentity
      && declaredIdentity.auditedHead === namedIdentity.auditedHead
      && declaredIdentity.runId === namedIdentity.runId;
    if (!valid) {
      for (const protectedSha of protectedShas) active.add(protectedSha);
      if (identityContradiction) diagnostics.push(`${entry.name}:ACTIVE_MARKER_IDENTITY_CONTRADICTION_PRESERVED`);
      diagnostics.push(`${entry.name}:${protectedShas.size > 0 ? "ACTIVE_MARKER_AMBIGUOUS_PRESERVED" : "ACTIVE_MARKER_IDENTITY_UNRESOLVED_PRESERVED"}`);
      continue;
    }
    const state = activeMarkerDiagnostics(entry.name, marker);
    if (state.activeSha) active.add(state.activeSha);
    if (state.diagnostic) diagnostics.push(state.diagnostic);
    if (state.abandoned) {
      try { fsApi.unlinkSync(markerPath); } catch (error) {
        diagnostics.push(`${entry.name}:ABANDONED_MARKER_RECOVERY_FAILED:${error?.code ?? error?.message ?? String(error)}`);
      }
    }
  }
  return { active, diagnostics };
}

export async function acquireRetentionLock(root, { fsApi = fs, waitMs = LOCK_WAIT_MS } = {}) {
  const rootPath = qualityRoot(root);
  fsApi.mkdirSync(rootPath, { recursive: true });
  const lockPath = path.join(rootPath, LOCK_DIRECTORY);
  const started = Date.now();
  while (Date.now() - started <= waitMs) {
    try {
      fsApi.mkdirSync(lockPath);
      fsApi.writeFileSync(path.join(lockPath, "owner.json"), `${JSON.stringify({ ...currentOwner(), acquiredAt: new Date().toISOString() })}\n`, "utf8");
      return { lockPath, status: "ACQUIRED" };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  return { lockPath, status: "LOCK_ACTIVE" };
}

export function releaseRetentionLock(lock, fsApi = fs) {
  if (lock?.status !== "ACQUIRED") return;
  try { fsApi.unlinkSync(path.join(lock.lockPath, "owner.json")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  try { fsApi.rmdirSync(lock.lockPath); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}

function artifactTargetPath(inventory, artifact) {
  return path.join(inventory.path, artifactFileName(artifact));
}

function migrateArtifact(inventory, artifact, fsApi = fs) {
  if (!artifact.legacy) return { migrated: false };
  const destination = artifactTargetPath(inventory, artifact);
  const sourceContent = fsApi.readFileSync(artifact.sourcePath);
  if (fsApi.existsSync(destination)) {
    const destinationContent = fsApi.readFileSync(destination);
    if (!sourceContent.equals(destinationContent)) return { migrated: false, diagnostic: `collision:${path.basename(destination)}` };
    fsApi.unlinkSync(artifact.sourcePath);
    return { migrated: true, deduplicated: true };
  }
  writeNewFile(destination, sourceContent.toString("utf8"), fsApi);
  if (!fsApi.readFileSync(destination).equals(sourceContent)) return { migrated: false, diagnostic: `integrity:${path.basename(destination)}` };
  fsApi.unlinkSync(artifact.sourcePath);
  return { migrated: true };
}

function removeEmptyAncestors(filePath, stopPath, fsApi = fs) {
  let current = path.dirname(filePath);
  while (current !== stopPath && current.startsWith(`${stopPath}${path.sep}`)) {
    try { fsApi.rmdirSync(current); } catch { break; }
    current = path.dirname(current);
  }
}

function removeGeneratedSha(inventory, fsApi = fs) {
  if (!inventory.generated || inventory.unknown.length > 0) {
    const error = new Error("Refus de suppression d'un SHA dont le contenu est ambigu");
    error.code = "AMBIGUOUS_CONTENT";
    throw error;
  }
  for (const artifact of inventory.artifacts) {
    if (fsApi.existsSync(artifact.sourcePath)) {
      fsApi.unlinkSync(artifact.sourcePath);
      removeEmptyAncestors(artifact.sourcePath, inventory.path, fsApi);
    }
  }
  if (fsApi.existsSync(inventory.path)) fsApi.rmdirSync(inventory.path);
}

function listShaInventories(root, fsApi = fs) {
  let entries;
  try { entries = fsApi.readdirSync(qualityRoot(root), { withFileTypes: true }); } catch { return []; }
  return entries.filter(isSafeShaDirectory).map((entry) => inspectShaDirectory(root, entry, fsApi));
}

export async function retainQualityAuditArtifacts({ root, now = () => new Date().toISOString(), fsApi = fs, lockWaitMs = LOCK_WAIT_MS } = {}) {
  const lock = await acquireRetentionLock(root, { fsApi, waitMs: lockWaitMs });
  if (lock.status !== "ACQUIRED") return { status: "DEFERRED", diagnostics: ["LOCK_ACTIVE"], retainedSha: [], removedSha: [], migrated: [] };
  const diagnostics = [];
  const migrated = [];
  const removedSha = [];
  try {
    const inventories = listShaInventories(root, fsApi);
    const activeState = activeShaSet(root, fsApi);
    const active = activeState.active;
    diagnostics.push(...activeState.diagnostics);
    const ranked = inventories.filter((inventory) => inventory.generated).sort((left, right) => right.lastExecuted - left.lastExecuted || left.name.localeCompare(right.name));
    const retained = new Set(ranked.slice(0, QUALITY_AUDIT_RETENTION_LIMIT).map((inventory) => inventory.name));
    for (const sha of active) retained.add(sha);

    for (const inventory of inventories) {
      if (!inventory.generated) {
        diagnostics.push(...inventory.unknown.map((reason) => `${inventory.name}:${reason}`));
        diagnostics.push(`${inventory.name}:UNKNOWN_CONTENT_PRESERVED`);
        continue;
      }
      if (active.has(inventory.name)) {
        // An active SHA cannot be deleted, but completed legacy runs in that
        // SHA are independent from the active run and can be migrated safely.
        for (const artifact of inventory.artifacts.filter((candidate) => candidate.legacy)) {
          const result = migrateArtifact(inventory, artifact, fsApi);
          if (result.migrated) migrated.push(`${inventory.name}:${artifact.audit}:${artifact.runId}:${artifact.kind}`);
          if (result.diagnostic) diagnostics.push(`${inventory.name}:${result.diagnostic}`);
        }
        for (const artifact of inventory.artifacts.filter((candidate) => candidate.legacy)) {
          removeEmptyAncestors(artifact.sourcePath, inventory.path, fsApi);
        }
        continue;
      }
      if (retained.has(inventory.name)) {
        for (const artifact of inventory.artifacts) {
          const result = migrateArtifact(inventory, artifact, fsApi);
          if (result.migrated) migrated.push(`${inventory.name}:${artifact.audit}:${artifact.runId}:${artifact.kind}`);
          if (result.diagnostic) diagnostics.push(`${inventory.name}:${result.diagnostic}`);
        }
        for (const artifact of inventory.artifacts.filter((candidate) => candidate.legacy)) {
          removeEmptyAncestors(artifact.sourcePath, inventory.path, fsApi);
        }
        continue;
      }
      try {
        removeGeneratedSha(inventory, fsApi);
        removedSha.push(inventory.name);
      } catch (error) {
        diagnostics.push(`${inventory.name}:DELETE_FAILED:${error?.code ?? error?.message ?? String(error)}`);
      }
    }
    return {
      status: diagnostics.length === 0 ? "PASS" : "INFORMATIVE",
      generatedAt: now(),
      retainedSha: [...retained].sort(),
      removedSha,
      migrated,
      diagnostics,
    };
  } finally {
    releaseRetentionLock(lock, fsApi);
  }
}

export function listFlatQualityArtifacts({ root, auditedSha, fsApi = fs } = {}) {
  assertSha(auditedSha);
  const shaRoot = path.join(root, QUALITY_AUDIT_ROOT, auditedSha);
  let entries;
  try { entries = fsApi.readdirSync(shaRoot, { withFileTypes: true }); } catch { return []; }
  return entries.map((entry) => {
    if (!entry.isFile() || entry.isSymbolicLink()) return null;
    const parsed = parseFlatArtifactName(entry.name);
    return parsed ? { ...parsed, path: path.join(shaRoot, entry.name) } : null;
  }).filter(Boolean);
}

export function listFlatQualityProjectionArtifacts({ root, auditedSha, fsApi = fs } = {}) {
  assertSha(auditedSha);
  const shaRoot = path.join(root, QUALITY_AUDIT_ROOT, auditedSha);
  let entries;
  try { entries = fsApi.readdirSync(shaRoot, { withFileTypes: true }); } catch { return []; }
  return entries.map((entry) => {
    if (!entry.isFile() || entry.isSymbolicLink()) return null;
    const parsed = parseFlatProjectionName(entry.name);
    return parsed ? { ...parsed, path: path.join(shaRoot, entry.name) } : null;
  }).filter(Boolean);
}
