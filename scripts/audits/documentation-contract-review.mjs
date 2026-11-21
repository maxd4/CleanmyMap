const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".sql"]);
const TEST_MARKER = /(?:\.test|\.spec)(?:\.|$)|(?:^|\/)tests?(?:\/|$)|__tests__/i;
const GENERATED_OR_VENDOR = /(?:^|\/)(?:vendor|generated|dist|build|coverage)(?:\/|$)/i;

const DIMENSION_PATTERNS = Object.freeze({
  responsibility: /responsab|owner|source\s+canonique|canonical|contrat/i,
  actors: /acteur|actor|utilisateur|user|requester|owner|r[oô]le|role/i,
  permissions: /permission|autorisation|authn|authz|service_role|rls|grant|acc[eè]s/i,
  inputsOutputs: /entr[eé]e|input|sortie|output|param[eè]tre|payload|retourne|returns/i,
  provenance: /provenance|source|version|r[eé]f[eé]renc|m[eé]thodolog/i,
  units: /unit[eé]|\bkg\b|\bgram(?:me)?s?\b|\bkwh\b|\bco2\b|m[eé]trique/i,
  errors: /erreur|error|refus|reject|exception|fail|failure/i,
  tests: /test|vitest|jest|pgtap|pgTAP|sc[eé]nario|r[eé]gression/i,
});

const KIND_REQUIREMENTS = Object.freeze({
  PRIVILEGED_RPC: ["responsibility", "actors", "permissions", "inputsOutputs", "errors", "tests"],
  AUTHORIZATION: ["responsibility", "actors", "permissions", "inputsOutputs", "errors", "tests"],
  SHARED_SERVICE: ["responsibility", "actors", "inputsOutputs", "errors", "tests"],
  SCIENTIFIC_CALCULATION: ["responsibility", "inputsOutputs", "provenance", "units", "errors", "tests"],
});

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function extensionOf(file) {
  const normalized = normalizePath(file).toLowerCase();
  const dot = normalized.lastIndexOf(".");
  return dot >= 0 ? normalized.slice(dot) : "";
}

function isSourceFile(file) {
  return SOURCE_EXTENSIONS.has(extensionOf(file));
}

export function isSourceFileForContractReview(file) {
  return isSourceFile(file);
}

function isTestOrGenerated(file) {
  const normalized = normalizePath(file);
  return TEST_MARKER.test(normalized) || GENERATED_OR_VENDOR.test(normalized);
}

function extractSymbols(file, text) {
  const symbols = new Set();
  if (extensionOf(file) === ".sql") {
    for (const match of text.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:[\w$]+\.)?["']?([\w$-]+)["']?\s*\(/gi)) {
      symbols.add(match[1]);
    }
  } else {
    const patterns = [
      /\bexport\s+(?:async\s+)?function\s+([\w$]+)/g,
      /\bexport\s+(?:const|let|var|class|interface|type)\s+([\w$]+)/g,
      /\bexport\s*\{([^}]+)\}/g,
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        if (pattern.source.includes("\\{")) {
          for (const name of match[1].split(",")) {
            const symbol = name.trim().split(/\s+as\s+/i)[0];
            if (/^[\w$]+$/.test(symbol)) symbols.add(symbol);
          }
        } else symbols.add(match[1]);
      }
    }
  }
  return [...symbols].sort((left, right) => left.localeCompare(right, "en"));
}

function contractKind(file, text, symbols) {
  if (symbols.length === 0 || !isSourceFile(file) || isTestOrGenerated(file)) return null;
  const normalized = normalizePath(file);
  const privilegedRpc = extensionOf(file) === ".sql"
    ? /(?:security\s+definer|service_role|grant\s+execute)/i.test(text)
    : /\.rpc\s*\(|security\s+definer|service_role|server[- ]only|privileged/i.test(text);
  if (privilegedRpc) return "PRIVILEGED_RPC";
  if (/(?:^|\/)lib\/auth(?:\/|$)/i.test(normalized) && /(?:authorization|authz|authn|effective-auth|role)/i.test(normalized)) return "AUTHORIZATION";
  if (/(?:environmental-impact-estimator|(?:^|\/)lib\/impact(?:\/|$))/i.test(normalized)
    && /scientific|provenance|\bunit\b|\bkg\b|\bco2\b|impact|calculation|estimat/i.test(text)) return "SCIENTIFIC_CALCULATION";
  const sharedOwner = /(?:^|\/)(?:lib|services)(?:\/|$)/i.test(normalized)
    && /(?:service|store|client|contract)(?:\.|-|\/)/i.test(normalized);
  const criticalMarkers = [...text.matchAll(/rpc|ownership|provenance|idempotent|service_role|permission|authorization|unit|scientific|calculation/gi)].length;
  if (sharedOwner && criticalMarkers >= 2) return "SHARED_SERVICE";
  return null;
}

function responsibilityFor(kind) {
  return {
    PRIVILEGED_RPC: "RPC privilégiée et frontière serveur/PostgreSQL",
    AUTHORIZATION: "contrat d'authentification et d'autorisation",
    SHARED_SERVICE: "service partagé et contrat de données/effets",
    SCIENTIFIC_CALCULATION: "calcul scientifique, unités et provenance",
  }[kind];
}

function codeSignals(kind, text) {
  return {
    privileged: kind === "PRIVILEGED_RPC" && /security\s+definer|service_role|\.rpc\s*\(/i.test(text),
    scientific: kind === "SCIENTIFIC_CALCULATION" && /scientific|provenance|unit|\bkg\b|\bco2\b/i.test(text),
  };
}

function referenceTokens(contract) {
  const path = normalizePath(contract.path);
  const withoutSourcePrefix = path.replace(/^apps\/web\/src\//, "");
  const basename = path.slice(path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
  return [path, withoutSourcePrefix, basename].filter((token) => token.length >= 8);
}

function matchesContractDocument(contract, document) {
  const content = document.content;
  return referenceTokens(contract).some((token) => content.includes(token));
}

function dimensionEvidence(content) {
  return Object.fromEntries(Object.entries(DIMENSION_PATTERNS).map(([dimension, pattern]) => [dimension, pattern.test(content)]));
}

function hasPublicPrivilegeContradiction(contract, content) {
  if (contract.kind !== "PRIVILEGED_RPC" || !contract.signals.privileged) return false;
  return /(?:acc[eè]s|permissions?|autorisations?|ex[eé]cut(?:er|able)|execute)\s*[:=]\s*(?:public|client|anon)/i.test(content)
    || /(?:public|client|anon)\s+(?:peut|may|can)\s+(?:appeler|call|execute|ex[eé]cuter)/i.test(content);
}

function reviewReasons(contract, documents) {
  const reasons = [];
  const currentDocuments = documents.filter((document) => document.lifecycle.statuses.includes("CURRENT"));
  const planDocuments = documents.filter((document) => document.lifecycle.statuses.includes("PLAN"));
  if (documents.length === 0) return ["NO_ATTRIBUTABLE_DOCUMENTATION_PROOF"];
  if (currentDocuments.length === 0 && planDocuments.length > 0) reasons.push("PLAN_IS_NOT_CURRENT_CONTRACT");
  for (const document of documents) {
    if (document.internalLinks.invalid.length > 0) reasons.push(`INVALID_DOCUMENT_REFERENCE:${document.path}`);
    if (hasPublicPrivilegeContradiction(contract, document.content)) reasons.push(`CONTRADICTORY_PERMISSION_CLAIM:${document.path}`);
  }
  const usable = currentDocuments.length > 0 ? currentDocuments : planDocuments;
  const evidence = dimensionEvidence(usable.map((document) => document.content).join("\n"));
  for (const dimension of KIND_REQUIREMENTS[contract.kind] ?? []) {
    if (!evidence[dimension]) reasons.push(`MISSING_${dimension.toUpperCase()}`);
  }
  return [...new Set(reasons)];
}

function statusForReview(documents, reasons) {
  if (documents.length === 0) return "NOT_MEASURED";
  return reasons.length === 0 ? "DOCUMENTED" : "REVIEW_REQUIRED";
}

export function discoverCriticalContracts({ files, readFile }) {
  return files
    .map(normalizePath)
    .filter(isSourceFile)
    .sort((left, right) => left.localeCompare(right, "en"))
    .flatMap((file) => {
      const text = String(readFile(file));
      const symbols = extractSymbols(file, text);
      const kind = contractKind(file, text, symbols);
      if (!kind) return [];
      return [{
        path: file,
        kind,
        symbols,
        responsibility: responsibilityFor(kind),
        signals: codeSignals(kind, text),
      }];
    });
}

export function reviewCriticalContracts({ contracts, documents }) {
  return contracts.map((contract) => {
    const examined = documents.filter((document) => matchesContractDocument(contract, document));
    const reasons = reviewReasons(contract, examined);
    const status = statusForReview(examined, reasons);
    return {
      path: contract.path,
      kind: contract.kind,
      symbols: contract.symbols,
      responsibility: contract.responsibility,
      status,
      reasons,
      documentsExamined: examined.map((document) => ({
        path: document.path,
        lifecycle: document.lifecycle,
        invalidReferences: document.internalLinks.invalid,
      })),
      evidence: {
        codePath: contract.path,
        responsibility: contract.responsibility,
        dimensions: Object.fromEntries(Object.entries(DIMENSION_PATTERNS).map(([dimension]) => [dimension, false])),
      },
    };
  }).map((review) => {
    const docs = documents.filter((document) => review.documentsExamined.some((entry) => entry.path === document.path));
    const current = docs.filter((document) => document.lifecycle.statuses.includes("CURRENT"));
    const plan = docs.filter((document) => document.lifecycle.statuses.includes("PLAN"));
    const usable = current.length > 0 ? current : plan;
    const dimensions = dimensionEvidence(usable.map((document) => document.content).join("\n"));
    return { ...review, evidence: { ...review.evidence, dimensions } };
  }).sort((left, right) => left.path.localeCompare(right.path, "en") || left.kind.localeCompare(right.kind, "en"));
}

export function summarizeCriticalContractReviews(reviews) {
  return {
    criticalContracts: reviews.length,
    documentedContracts: reviews.filter((review) => review.status === "DOCUMENTED").length,
    reviewRequiredContracts: reviews.filter((review) => review.status === "REVIEW_REQUIRED").length,
    notMeasuredContracts: reviews.filter((review) => review.status === "NOT_MEASURED").length,
  };
}
