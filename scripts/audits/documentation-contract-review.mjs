import path from "node:path";

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
  RPC_PUBLIC: ["responsibility", "actors", "permissions", "inputsOutputs", "errors", "tests"],
  RPC_AUTHENTICATED: ["responsibility", "actors", "permissions", "inputsOutputs", "errors", "tests"],
  RPC_PRIVILEGE_UNESTABLISHED: ["responsibility", "actors", "permissions", "inputsOutputs", "errors", "tests"],
  RPC_CONSUMER: ["responsibility", "actors", "inputsOutputs", "errors", "tests"],
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

function extractExportedSymbols(text) {
  const symbols = new Set();
  const patterns = [
    /\bexport\s+(?:async\s+)?function\s+([\w$]+)/g,
    /\bexport\s+(?:const|let|var|class|interface|type)\s+([\w$]+)/g,
    /\bexport\s*\{([^}]+)\}/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (pattern.source.includes("\\{")) {
        for (const item of match[1].split(",")) {
          const symbol = item.trim().split(/\s+as\s+/i)[0];
          if (/^[\w$]+$/.test(symbol)) symbols.add(symbol);
        }
      } else symbols.add(match[1]);
    }
  }
  return [...symbols].sort((left, right) => left.localeCompare(right, "en"));
}

function lastSqlIdentifier(value) {
  return String(value ?? "").split(".").at(-1).replaceAll('"', "").toLowerCase();
}

function sqlFunctionDefinitions(text) {
  const pattern = /\bcreate\s+(?:or\s+replace\s+)?function\s+((?:(?:"[\w$-]+"|[\w$-]+)\.)?(?:"[\w$-]+"|[\w$-]+))\s*\(([^)]*)\)/gi;
  const matches = [...text.matchAll(pattern)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const headerEnd = start + match[0].length;
    const nextStart = matches[index + 1]?.index ?? text.length;
    const tail = text.slice(headerEnd, nextStart);
    const tag = tail.match(/\bas\s+(\$[\w]*\$)/i)?.[1];
    let end = nextStart;
    if (tag) {
      const opening = tail.indexOf(tag);
      const closing = tail.indexOf(tag, opening + tag.length);
      if (closing >= 0) end = headerEnd + closing + tag.length;
    } else {
      const statementEnd = tail.search(/;\s*(?:\r?\n|$)/);
      if (statementEnd >= 0) end = headerEnd + statementEnd + 1;
    }
    const qualifiedName = match[1];
    return {
      symbol: lastSqlIdentifier(qualifiedName),
      qualifiedName,
      arguments: match[2],
      start,
      line: 1 + text.slice(0, start).split("\n").length - 1,
      text: text.slice(start, end),
    };
  });
}

function normalizedSqlArguments(value) {
  return String(value ?? "").toLowerCase().replaceAll('"', "").replace(/\s+/g, "").trim();
}

function grantStatements(text) {
  const pattern = /\bgrant\s+execute\s+on\s+function\s+((?:(?:"[\w$-]+"|[\w$-]+)\.)?(?:"[\w$-]+"|[\w$-]+))\s*\(([^)]*)\)\s+to\s+([^;]+);/gi;
  return [...text.matchAll(pattern)].map((match) => ({
    symbol: lastSqlIdentifier(match[1]),
    arguments: match[2],
    roles: match[3].split(",").map((role) => role.trim().replaceAll('"', "").toLowerCase()),
    line: 1 + text.slice(0, match.index ?? 0).split("\n").length - 1,
  }));
}

function privilegeForSqlFunction(definition, definitions, grants, file) {
  const sameName = definitions.filter((candidate) => candidate.symbol === definition.symbol);
  const matchingGrants = grants.filter((grant) => grant.symbol === definition.symbol
    && (sameName.length === 1 || normalizedSqlArguments(grant.arguments) === normalizedSqlArguments(definition.arguments)));
  const declaredRoles = matchingGrants.flatMap((grant) => grant.roles.map((role) => ({ path: file, line: grant.line, type: "GRANT_EXECUTE", role })));
  const explicitSecurityMode = definition.text.match(/\bsecurity\s+(definer|invoker)\b/i)?.[1]?.toUpperCase() ?? null;
  const securityEvidence = explicitSecurityMode
    ? [{ path: file, line: definition.line, type: `SECURITY_${explicitSecurityMode}` }]
    : [];
  return {
    // A migration-local grant is evidence of declared ACL changes, not the final
    // effective ACL after every migration has run. Security mode is separate
    // from caller authorization and cannot establish an exclusive role.
    status: "UNESTABLISHED",
    declaredRoles,
    executionMode: {
      value: explicitSecurityMode ?? "INVOKER",
      provenance: explicitSecurityMode ? "EXPLICIT" : "SQL_DEFAULT",
      evidence: securityEvidence,
    },
    evidence: [...declaredRoles, ...securityEvidence],
  };
}

function privilegeKind(status) {
  return {
    PRIVILEGED: "PRIVILEGED_RPC",
    PUBLIC: "RPC_PUBLIC",
    AUTHENTICATED: "RPC_AUTHENTICATED",
    UNESTABLISHED: "RPC_PRIVILEGE_UNESTABLISHED",
  }[status];
}

function responsibilityFor(kind) {
  return {
    PRIVILEGED_RPC: "RPC privilégiée et frontière serveur/PostgreSQL",
    RPC_PUBLIC: "RPC explicitement accessible au rôle public ou anon",
    RPC_AUTHENTICATED: "RPC explicitement accessible aux utilisateurs authentifiés",
    RPC_PRIVILEGE_UNESTABLISHED: "fonction RPC dont le privilège n'est pas établi par la source",
    RPC_CONSUMER: "consommation RPC sans preuve du privilège effectif",
    AUTHORIZATION: "contrat d'authentification et d'autorisation",
    SHARED_SERVICE: "service partagé et contrat de données/effets",
    SCIENTIFIC_CALCULATION: "calcul scientifique, unités et provenance",
  }[kind];
}

function codeSignals(kind, text, privilege = { status: "UNESTABLISHED" }) {
  return {
    privileged: privilege.status === "PRIVILEGED",
    scientific: kind === "SCIENTIFIC_CALCULATION" && /scientific|provenance|unit|\bkg\b|\bco2\b/i.test(text),
  };
}

function semanticContractKind(file, text) {
  const normalized = normalizePath(file);
  if (/(?:^|\/)lib\/auth(?:\/|$)/i.test(normalized) && /(?:authorization|authz|authn|effective-auth|role)/i.test(normalized)) return "AUTHORIZATION";
  if (/(?:environmental-impact-estimator|(?:^|\/)lib\/impact(?:\/|$))/i.test(normalized)
    && /scientific|provenance|\bunit\b|\bkg\b|\bco2\b|impact|calculation|estimat/i.test(text)) return "SCIENTIFIC_CALCULATION";
  const sharedOwner = /(?:^|\/)(?:lib|services)(?:\/|$)/i.test(normalized)
    && /(?:service|store|client|contract)(?:\.|-|\/)/i.test(normalized);
  const criticalMarkers = [...text.matchAll(/rpc|ownership|provenance|idempotent|service_role|permission|authorization|unit|scientific|calculation/gi)].length;
  if (sharedOwner && criticalMarkers >= 2) return "SHARED_SERVICE";
  return null;
}

function rpcConsumerNames(text) {
  const names = new Set();
  for (const match of text.matchAll(/\.rpc\s*\(\s*(["'`])([^"'`]+)\1/g)) names.add(match[2]);
  return [...names].sort((left, right) => left.localeCompare(right, "en"));
}

function makeContract({ file, kind, symbols, symbol = null, rpcNames = [], privilege = { status: "UNESTABLISHED", evidence: [] }, text }) {
  return {
    path: file,
    kind,
    symbol,
    symbols,
    rpcNames,
    responsibility: responsibilityFor(kind),
    privilege,
    signals: codeSignals(kind, text, privilege),
  };
}

export function discoverCriticalContracts({ files, readFile }) {
  return files
    .map(normalizePath)
    .filter(isSourceFile)
    .filter((file) => !isTestOrGenerated(file))
    .sort((left, right) => left.localeCompare(right, "en"))
    .flatMap((file) => {
      const text = String(readFile(file));
      if (extensionOf(file) === ".sql") {
        const definitions = sqlFunctionDefinitions(text);
        if (definitions.length === 0) return [];
        const grants = grantStatements(text);
        return definitions.map((definition) => {
          const privilege = privilegeForSqlFunction(definition, definitions, grants, file);
          return makeContract({ file, kind: privilegeKind(privilege.status), symbols: [definition.symbol], symbol: definition.symbol, privilege, text: definition.text });
        });
      }

      const symbols = extractExportedSymbols(text);
      if (symbols.length === 0) return [];
      const contracts = [];
      const rpcNames = rpcConsumerNames(text);
      if (rpcNames.length > 0) {
        contracts.push(makeContract({ file, kind: "RPC_CONSUMER", symbols, rpcNames, text }));
      }
      const semanticKind = semanticContractKind(file, text);
      if (semanticKind) contracts.push(makeContract({ file, kind: semanticKind, symbols, text }));
      return contracts;
    })
    .sort((left, right) => left.path.localeCompare(right.path, "en")
      || left.kind.localeCompare(right.kind, "en")
      || String(left.symbol ?? left.rpcNames[0] ?? "").localeCompare(String(right.symbol ?? right.rpcNames[0] ?? ""), "en"));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactToken(line, token) {
  const expression = new RegExp(`(^|[^\\w$./-])${escapeRegExp(token)}(?=$|[^\\w$./-])`);
  return expression.test(line);
}

function isFenceLine(line, fence) {
  const match = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
  if (!match) return { fence, delimiter: false };
  if (!fence) return { fence: { marker: match[1][0], length: match[1].length }, delimiter: true };
  const closes = match[1][0] === fence.marker && match[1].length >= fence.length && /^[ \t]*$/.test(line.slice(match[0].length));
  return { fence: closes ? null : fence, delimiter: true };
}

function normalizeMarkdownTarget(documentPath, target) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) return null;
  const withoutFragment = target.split(/[?#]/, 1)[0];
  if (!withoutFragment) return null;
  return normalizePath(path.posix.normalize(withoutFragment.startsWith("/")
    ? withoutFragment.slice(1)
    : path.posix.join(path.posix.dirname(documentPath), withoutFragment)));
}

function sectionForLine(document, line) {
  const section = (document.sections ?? []).find((candidate) => line >= candidate.startLine && line <= candidate.endLine);
  if (section) return { title: section.title, startLine: section.startLine, endLine: section.endLine };
  return { title: null, startLine: 1, endLine: String(document.content ?? "").split("\n").length };
}

function preciseAttributions(contract, document, uniqueSymbols) {
  const content = String(document.content ?? "");
  const pathTokens = [normalizePath(contract.path), normalizePath(contract.path).replace(/^apps\/web\/src\//, "")];
  const symbols = [...new Set([contract.symbol, ...(contract.symbols ?? []), ...(contract.rpcNames ?? [])].filter(Boolean))]
    .filter((symbol) => symbol.length >= 5 && uniqueSymbols.has(symbol));
  const hasPathCandidate = pathTokens.some((token) => token && content.includes(token));
  const hasSymbolCandidate = symbols.some((symbol) => content.includes(`\`${symbol}\``)
    || new RegExp("\\b(?:symbol|symbole|function|fonction|rpc)\\s*[:=]\\s*(?:`)?" + escapeRegExp(symbol) + "(?:`)?(?![\\w$])", "i").test(content));
  if (!hasPathCandidate && !hasSymbolCandidate) return [];
  const lines = content.split("\n");
  const attributions = [];
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceState = isFenceLine(line, fence);
    fence = fenceState.fence;
    if (fenceState.delimiter || fence) continue;
    for (const token of pathTokens) {
      if (token && exactToken(line, token)) {
        attributions.push({ matchKind: "SOURCE_PATH", value: token, line: index + 1, section: sectionForLine(document, index + 1) });
      }
    }
    for (const symbol of symbols) {
      const quoted = line.includes(`\`${symbol}\``);
      const labelled = new RegExp("\\b(?:symbol|symbole|function|fonction|rpc)\\s*[:=]\\s*(?:`)?" + escapeRegExp(symbol) + "(?:`)?(?![\\w$])", "i").test(line);
      if (quoted || labelled) attributions.push({ matchKind: "SOURCE_SYMBOL", value: symbol, line: index + 1, section: sectionForLine(document, index + 1) });
    }
    for (const match of line.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g)) {
      if (normalizeMarkdownTarget(document.path, match[1].replaceAll("&amp;", "&")) === normalizePath(contract.path)) {
        attributions.push({ matchKind: "SOURCE_LINK", value: match[1], line: index + 1, section: sectionForLine(document, index + 1) });
      }
    }
  }
  return attributions.filter((attribution, index) => attributions.findIndex((candidate) => candidate.matchKind === attribution.matchKind
    && candidate.value === attribution.value && candidate.line === attribution.line) === index);
}

function sectionLines(document, section) {
  return String(document.content ?? "").split("\n").slice(section.startLine - 1, section.endLine);
}

function currentDocument(document) {
  return document.lifecycle.statuses.length === 1 && document.lifecycle.statuses[0] === "CURRENT";
}

function dimensionProofs(documents) {
  const proofs = Object.fromEntries(Object.keys(DIMENSION_PATTERNS).map((dimension) => [dimension, []]));
  for (const { document, attributions } of documents) {
    for (const attribution of attributions) {
      if (Object.values(proofs).every((items) => items.length > 0)) return proofs;
      const lines = sectionLines(document, attribution.section);
      for (let offset = 0; offset < lines.length; offset += 1) {
        const line = attribution.section.startLine + offset;
        if (line === attribution.line) continue;
        for (const [dimension, pattern] of Object.entries(DIMENSION_PATTERNS)) {
          if (proofs[dimension].length > 0 || !pattern.test(lines[offset])) continue;
          proofs[dimension].push({ documentPath: document.path, line, section: attribution.section.title, excerpt: lines[offset].trim().slice(0, 180) });
        }
      }
    }
  }
  return proofs;
}

function claimEvidence(document, attributions) {
  const claims = [];
  for (const attribution of attributions) {
    for (let line = attribution.section.startLine; line <= attribution.section.endLine; line += 1) {
      const value = String(document.content ?? "").split("\n")[line - 1] ?? "";
      if (!/permission|autorisation|acc[eè]s|grant|security\s+definer|service_role/i.test(value)) continue;
      if (/\b(?:public|anon)\b|\bpublique\b/i.test(value)) claims.push({ type: "PUBLIC", line, excerpt: value.trim().slice(0, 180) });
      if (/\bservice_role\b|security\s+definer|\bprivileged\b|\bprivil[eé]gi[eé]e?\b/i.test(value)) claims.push({ type: "PRIVILEGED", line, excerpt: value.trim().slice(0, 180) });
      if (/\bauthenticated\b|\bauthentifi[eé]s?\b/i.test(value)) claims.push({ type: "AUTHENTICATED", line, excerpt: value.trim().slice(0, 180) });
    }
  }
  return claims;
}

function hasPrivilegeContradiction(contract, claims) {
  const privilege = contract.privilege?.status ?? (contract.signals?.privileged ? "PRIVILEGED" : "UNESTABLISHED");
  const declared = new Set((contract.privilege?.declaredRoles ?? []).map((entry) => {
    if (["public", "anon"].includes(entry.role)) return "PUBLIC";
    if (entry.role === "authenticated") return "AUTHENTICATED";
    if (["service_role", "postgres"].includes(entry.role)) return "PRIVILEGED";
    return null;
  }).filter(Boolean));
  const exclusiveClaim = claims.some((claim) => /\b(?:only|uniquement|exclusivement|seulement)\b/i.test(claim.excerpt));
  if (exclusiveClaim && declared.size > 0) {
    const claimed = new Set(claims.map((claim) => claim.type));
    if ([...declared].some((role) => !claimed.has(role)) || [...claimed].some((role) => !declared.has(role))) return true;
  }
  if (privilege === "UNESTABLISHED") return false;
  if (privilege === "PRIVILEGED") return claims.some((claim) => claim.type === "PUBLIC");
  if (privilege === "PUBLIC") return claims.some((claim) => claim.type === "PRIVILEGED" || claim.type === "AUTHENTICATED");
  if (privilege === "AUTHENTICATED") return claims.some((claim) => claim.type === "PUBLIC" || claim.type === "PRIVILEGED");
  return false;
}

function reviewCriticalContract(contract, documents, uniqueSymbols) {
  const examined = documents.flatMap((document) => {
    const attributions = preciseAttributions(contract, document, uniqueSymbols);
    return attributions.length > 0 ? [{ document, attributions }] : [];
  });
  const current = examined.filter(({ document }) => currentDocument(document));
  const reasons = [];
  if (examined.length === 0) reasons.push("NO_PRECISE_DOCUMENTATION_ATTRIBUTION");
  for (const { document } of examined) {
    const statuses = document.lifecycle.statuses;
    if (statuses.includes("CURRENT") && statuses.length > 1) reasons.push(`CONFLICTING_DOCUMENT_LIFECYCLE:${document.path}`);
    else if (current.length === 0 && statuses.includes("PLAN")) reasons.push(`PLAN_IS_NOT_CURRENT_CONTRACT:${document.path}`);
    else if (current.length === 0 && statuses.some((status) => ["AUDIT", "HISTORY", "SNAPSHOT", "ADR", "GENERATED"].includes(status))) reasons.push(`NON_CURRENT_DOCUMENTATION:${document.path}`);
    else if (current.length === 0 && !statuses.includes("CURRENT")) reasons.push(`DOCUMENT_LIFECYCLE_NOT_ESTABLISHED:${document.path}`);
  }
  for (const { document, attributions } of current) {
    for (const reference of document.internalLinks.invalid.filter((entry) => attributions.some(({ section }) => entry.line >= section.startLine && entry.line <= section.endLine))) {
      reasons.push(`INVALID_DOCUMENT_REFERENCE:${document.path}:${reference.line}`);
    }
  }
  const proofs = dimensionProofs(current);
  const dimensions = Object.fromEntries(Object.entries(proofs).map(([dimension, items]) => [dimension, items.length > 0]));
  for (const dimension of KIND_REQUIREMENTS[contract.kind] ?? []) {
    if (!dimensions[dimension]) reasons.push(`MISSING_${dimension.toUpperCase()}`);
  }
  const claims = current.flatMap(({ document, attributions }) => claimEvidence(document, attributions).map((claim) => ({ ...claim, documentPath: document.path })));
  if (claims.length > 0 && hasPrivilegeContradiction(contract, claims)) {
    for (const claim of claims) reasons.push(`CONTRADICTORY_PRIVILEGE_CLAIM:${claim.documentPath}:${claim.line}`);
  }

  const privilegeStatus = contract.privilege?.status ?? (contract.signals?.privileged ? "PRIVILEGED" : "UNESTABLISHED");
  if (contract.kind === "RPC_CONSUMER") reasons.push("RPC_CALLER_DOES_NOT_ESTABLISH_PRIVILEGE");
  if (contract.kind === "RPC_PRIVILEGE_UNESTABLISHED" || privilegeStatus === "UNESTABLISHED" && contract.kind === "PRIVILEGED_RPC") {
    reasons.push("SOURCE_PRIVILEGE_NOT_ESTABLISHED");
  }
  const hasContradiction = reasons.some((reason) => reason.startsWith("CONTRADICTORY_PRIVILEGE_CLAIM:") || reason.startsWith("CONFLICTING_DOCUMENT_LIFECYCLE:"));
  const cannotMeasurePrivilege = contract.kind === "RPC_CONSUMER" || privilegeStatus === "UNESTABLISHED" && contract.kind.startsWith("RPC_");
  const status = hasContradiction ? "REVIEW_REQUIRED"
    : cannotMeasurePrivilege || examined.length === 0 ? "NOT_MEASURED"
      : reasons.length === 0 ? "DOCUMENTED" : "REVIEW_REQUIRED";

  return {
    path: contract.path,
    kind: contract.kind,
    symbol: contract.symbol,
    symbols: contract.symbols,
    rpcNames: contract.rpcNames,
    responsibility: contract.responsibility,
    status,
    reasons: [...new Set(reasons)],
    documentsExamined: examined.map(({ document, attributions }) => ({
      path: document.path,
      lifecycle: document.lifecycle,
      attributions,
      invalidReferences: document.internalLinks.invalid.filter((reference) => attributions.some(({ section }) => reference.line >= section.startLine && reference.line <= section.endLine)),
    })),
    evidence: {
      codePath: contract.path,
      codeSymbol: contract.symbol,
      responsibility: contract.responsibility,
      privilege: contract.privilege,
      claims,
      dimensions,
      dimensionProofs: proofs,
    },
  };
}

export function reviewCriticalContracts({ contracts, documents }) {
  const symbolOwners = new Map();
  for (const contract of contracts) {
    for (const symbol of new Set([contract.symbol, ...(contract.symbols ?? []), ...(contract.rpcNames ?? [])].filter(Boolean))) {
      const owners = symbolOwners.get(symbol) ?? new Set();
      owners.add(contract.path);
      symbolOwners.set(symbol, owners);
    }
  }
  const uniqueSymbols = new Set([...symbolOwners].filter(([, owners]) => owners.size === 1).map(([symbol]) => symbol));
  return contracts.map((contract) => reviewCriticalContract(contract, documents, uniqueSymbols))
    .sort((left, right) => left.path.localeCompare(right.path, "en") || left.kind.localeCompare(right.kind, "en")
      || String(left.symbol ?? left.rpcNames[0] ?? "").localeCompare(String(right.symbol ?? right.rpcNames[0] ?? ""), "en"));
}

export function summarizeCriticalContractReviews(reviews) {
  return {
    criticalContracts: reviews.length,
    documentedContracts: reviews.filter((review) => review.status === "DOCUMENTED").length,
    reviewRequiredContracts: reviews.filter((review) => review.status === "REVIEW_REQUIRED").length,
    notMeasuredContracts: reviews.filter((review) => review.status === "NOT_MEASURED").length,
  };
}
