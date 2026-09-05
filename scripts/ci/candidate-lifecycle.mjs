import fs from "node:fs";
import path from "node:path";

export const CANDIDATE_MARKER = ".cleanmymap-candidate.json";
export const VALIDATION_ROOT = [".artifacts", "validation"];
export const CANDIDATE_FAMILIES = Object.freeze({
  PREPUSH: "prepush-candidate",
  PUBLICATION: "publication-candidate",
});

function assertSafeSegment(value, label) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new Error(`${label} must be a safe single path segment.`);
  }
}

function assertCandidateKey(family, key) {
  if (family === CANDIDATE_FAMILIES.PREPUSH) {
    if (!/^[0-9a-f]{40}$/i.test(key)) {
      throw new Error("prepush-candidate key must be a 40-character commit SHA.");
    }
    return;
  }

  if (family === CANDIDATE_FAMILIES.PUBLICATION) {
    assertSafeSegment(key, "publication-candidate run id");
    return;
  }

  throw new Error(`Unsupported candidate family: ${family}`);
}

export function getCandidateFamilyRoot(repositoryRoot, family) {
  if (!Object.values(CANDIDATE_FAMILIES).includes(family)) {
    throw new Error(`Unsupported candidate family: ${family}`);
  }
  return path.join(repositoryRoot, ...VALIDATION_ROOT, family);
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function readMarker(markerPath) {
  const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  if (marker?.generated !== true || marker?.cleanupRequired !== true) {
    throw new Error(`Invalid candidate marker: ${markerPath}`);
  }
  return marker;
}

function removeOwnedLink(linkedPath, materializedRoot) {
  if (!isWithin(materializedRoot, linkedPath)) {
    return;
  }
  let stat;
  try {
    stat = fs.lstatSync(linkedPath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (!stat.isSymbolicLink()) {
    throw new Error(`Refusing to remove a non-link candidate dependency: ${linkedPath}`);
  }
  fs.unlinkSync(linkedPath);
}

export function createCandidateMaterialization({
  repositoryRoot,
  family = CANDIDATE_FAMILIES.PREPUSH,
  key,
  purpose,
}) {
  const normalizedRepositoryRoot = path.resolve(repositoryRoot);
  const normalizedKey = String(key ?? "");
  assertCandidateKey(family, normalizedKey);

  const familyRoot = getCandidateFamilyRoot(normalizedRepositoryRoot, family);
  const candidateRoot = path.join(familyRoot, normalizedKey);
  fs.mkdirSync(candidateRoot, { recursive: true });
  const materializedRoot = fs.mkdtempSync(path.join(candidateRoot, ".run-"));
  const markerPath = path.join(materializedRoot, CANDIDATE_MARKER);
  const marker = {
    version: 1,
    generated: true,
    cleanupRequired: true,
    family,
    key: normalizedKey,
    purpose: purpose ?? "candidate-validation",
    repositoryRoot: normalizedRepositoryRoot,
    materializedRoot,
    createdAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
  } catch (error) {
    fs.rmSync(materializedRoot, { recursive: true, force: true });
    if (fs.existsSync(candidateRoot) && fs.readdirSync(candidateRoot).length === 0) {
      fs.rmdirSync(candidateRoot);
    }
    if (fs.existsSync(familyRoot) && fs.readdirSync(familyRoot).length === 0) {
      fs.rmdirSync(familyRoot);
    }
    throw error;
  }

  let cleaned = false;
  return {
    family,
    key: normalizedKey,
    familyRoot,
    candidateRoot,
    materializedRoot,
    markerPath,
    cleanup(linkedPaths = []) {
      if (cleaned) return;
      const persistedMarker = readMarker(markerPath);
      if (
        persistedMarker.family !== family ||
        persistedMarker.key !== normalizedKey ||
        persistedMarker.materializedRoot !== materializedRoot ||
        path.resolve(persistedMarker.repositoryRoot) !== normalizedRepositoryRoot
      ) {
        throw new Error(`Candidate marker ownership mismatch: ${markerPath}`);
      }

      for (const linkedPath of [...linkedPaths].reverse()) {
        removeOwnedLink(linkedPath, materializedRoot);
      }
      fs.rmSync(materializedRoot, { recursive: true, force: true });
      if (fs.existsSync(materializedRoot)) {
        throw new Error(`Candidate cleanup failed: ${materializedRoot}`);
      }
      cleaned = true;

      if (fs.existsSync(candidateRoot) && fs.readdirSync(candidateRoot).length === 0) {
        fs.rmdirSync(candidateRoot);
      }
      if (fs.existsSync(familyRoot) && fs.readdirSync(familyRoot).length === 0) {
        fs.rmdirSync(familyRoot);
      }
      const validationRoot = path.dirname(familyRoot);
      if (fs.existsSync(validationRoot) && fs.readdirSync(validationRoot).length === 0) {
        fs.rmdirSync(validationRoot);
      }
    },
  };
}

export function installCandidateSignalCleanup(materialization, exit = process.exit) {
  let handlingSignal = false;
  const handlers = new Map();
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const handler = () => {
      if (handlingSignal) return;
      handlingSignal = true;
      try {
        materialization.cleanup(materialization.linkedPaths ?? []);
      } finally {
        exit(signal === "SIGINT" ? 130 : 143);
      }
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }

  return () => {
    for (const [signal, handler] of handlers) {
      process.removeListener(signal, handler);
    }
  };
}

export function findCandidateResidues(repositoryRoot) {
  const normalizedRepositoryRoot = path.resolve(repositoryRoot);
  const validationRoot = path.join(normalizedRepositoryRoot, ...VALIDATION_ROOT);
  const generated = [];
  const unknown = [];
  const adHoc = [];

  if (!fs.existsSync(validationRoot)) {
    return { validationRoot, generated, unknown, adHoc };
  }

  const knownFamilies = new Set(Object.values(CANDIDATE_FAMILIES));
  for (const entry of fs.readdirSync(validationRoot, { withFileTypes: true })) {
    const entryPath = path.join(validationRoot, entry.name);
    if (!knownFamilies.has(entry.name)) {
      if (/(candidate|sandbox|temp|publication)/i.test(entry.name)) {
        adHoc.push(entryPath);
      }
      continue;
    }
    if (!entry.isDirectory()) {
      unknown.push(entryPath);
      continue;
    }

    for (const keyEntry of fs.readdirSync(entryPath, { withFileTypes: true })) {
      const keyPath = path.join(entryPath, keyEntry.name);
      if (!keyEntry.isDirectory()) {
        unknown.push(keyPath);
        continue;
      }
      for (const runEntry of fs.readdirSync(keyPath, { withFileTypes: true })) {
        const runPath = path.join(keyPath, runEntry.name);
        if (!runEntry.isDirectory()) {
          unknown.push(runPath);
          continue;
        }
        const markerPath = path.join(runPath, CANDIDATE_MARKER);
        if (fs.existsSync(markerPath)) {
          generated.push(runPath);
        } else {
          unknown.push(runPath);
        }
      }
    }
  }

  return { validationRoot, generated, unknown, adHoc };
}
