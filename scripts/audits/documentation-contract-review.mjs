import path from "node:path";
import { splitSqlStatements } from "../ci/supabase-migration-sql.mjs";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".sql"]);
const TEST_MARKER = /(?:\.test|\.spec)(?:\.|$)|(?:^|\/)tests?(?:\/|$)|__tests__/i;
const GENERATED_OR_VENDOR = /(?:^|\/)(?:vendor|generated|dist|build|coverage)(?:\/|$)/i;
const NON_RUNTIME_CANDIDATE = /^documentation\/specs\/empreinte-ia\/CANDIDATS_LOTS?_.*\/apps\/web\/src\/.*\.(?:ts|tsx)$/i;
const CANONICAL_MIGRATION = /^apps\/web\/supabase\/migrations\/[^/]+\.sql$/i;

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

export function isNonRuntimeContractCandidate(file) {
  return NON_RUNTIME_CANDIDATE.test(normalizePath(file));
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

function skipSqlTrivia(value, start = 0) {
  let index = start;
  while (index < value.length) {
    if (/\s/.test(value[index])) { index += 1; continue; }
    if (value.startsWith("--", index)) {
      const newline = value.indexOf("\n", index + 2);
      index = newline < 0 ? value.length : newline + 1;
      continue;
    }
    if (value.startsWith("/*", index)) {
      let depth = 1;
      index += 2;
      while (index < value.length && depth > 0) {
        if (value.startsWith("/*", index)) { depth += 1; index += 2; }
        else if (value.startsWith("*/", index)) { depth -= 1; index += 2; }
        else index += 1;
      }
      continue;
    }
    break;
  }
  return index;
}

function leadingCommentFreeStatement(statement) {
  return statement.slice(skipSqlTrivia(statement));
}

function readQualifiedFunctionName(value, start) {
  const identifier = '(?:"(?:[^"]|"")*"|[A-Za-z_][\\w$]*)';
  const match = value.slice(start).match(new RegExp(`^(${identifier})(?:\\s*\\.\\s*(${identifier}))?`));
  if (!match) return null;
  return {
    schema: match[2] ? displaySqlIdentifier(match[1]) : null,
    schemaKey: match[2] ? normalizeSqlIdentifier(match[1]) : null,
    name: displaySqlIdentifier(match[2] ?? match[1]),
    nameKey: normalizeSqlIdentifier(match[2] ?? match[1]),
    end: start + match[0].length,
    qualifiedName: match[0],
  };
}

function normalizeSqlIdentifier(value) {
  const identifier = String(value ?? "").trim();
  if (identifier.startsWith('"') && identifier.endsWith('"')) return `q:${identifier.slice(1, -1).replaceAll('""', '"')}`;
  return `u:${identifier.toLowerCase()}`;
}

function displaySqlIdentifier(value) {
  const identifier = String(value ?? "").trim();
  if (identifier.startsWith('"') && identifier.endsWith('"')) return identifier.slice(1, -1).replaceAll('""', '"');
  return identifier.toLowerCase();
}

function matchingParen(value, opening) {
  let depth = 0;
  let quote = "";
  for (let index = opening; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index + 1] === quote) index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === "(") depth += 1;
    else if (character === ")" && --depth === 0) return index;
  }
  return -1;
}

function splitSqlArguments(value) {
  const items = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index + 1] === quote) index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "(" || character === "[") depth += 1;
    else if (character === ")" || character === "]") depth -= 1;
    else if (character === "," && depth === 0) {
      items.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (value.slice(start).trim()) items.push(value.slice(start).trim());
  return items;
}

const KNOWN_MULTIWORD_TYPES = /^(?:double\s+precision|character\s+varying|bit\s+varying|timestamp\s+(?:with|without)\s+time\s+zone|time\s+(?:with|without)\s+time\s+zone|national\s+(?:character\s+)?varying|national\s+character)$/i;
const KNOWN_TYPE_START = /^(?:smallint|int2|integer|int4|int|bigint|int8|numeric|decimal|real|float4|double\s+precision|float8|smallserial|serial|bigserial|boolean|bool|text|character|char|varchar|character\s+varying|bit|bit\s+varying|date|time|timetz|timestamp|timestamptz|interval|uuid|json|jsonb|bytea|record|void|oid|name|inet|cidr|macaddr|anyelement|anyarray|anycompatible|anycompatiblearray)\b/i;

function stripArgumentDefault(value) {
  const defaultIndex = value.search(/\s+default\s+/i);
  if (defaultIndex >= 0) return value.slice(0, defaultIndex).trim();
  const equalIndex = value.indexOf("=");
  return equalIndex >= 0 ? value.slice(0, equalIndex).trim() : value.trim();
}

function functionInputType(argument, { definition = false } = {}) {
  const value = stripArgumentDefault(argument).replace(/^\s*(?:inout|variadic|in|out)\s+/i, "");
  const isOutOnly = /^\s*out\s+/i.test(argument);
  if (isOutOnly) return null;
  if (!definition) return normalizeSqlType(value);
  const firstToken = value.match(/^(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*))?/u)?.[0] ?? "";
  const remainder = value.slice(firstToken.length).trim();
  const possibleType = value.replace(/(?:\[\])+(?:\s|$)/g, "").replace(/\([^()]*\)/g, "").trim();
  const typeStartsWithKnownName = KNOWN_TYPE_START.test(possibleType);
  const typeStartsWithKnownMultiword = KNOWN_MULTIWORD_TYPES.test(possibleType);
  const type = remainder && !typeStartsWithKnownName && !typeStartsWithKnownMultiword ? remainder : value;
  return normalizeSqlType(type);
}

function normalizeSqlType(value) {
  const protectedIdentifiers = [];
  const protectedValue = String(value ?? "").replace(/"(?:[^"]|"")*"/g, (identifier) => {
    protectedIdentifiers.push(identifier);
    return `\u0000${protectedIdentifiers.length - 1}\u0000`;
  });
  let compact = protectedValue.trim().replace(/\s+/g, " ").toLowerCase()
    .replace(/\s*\(\s*[^()]*\s*\)/g, "")
    .replace(/\s*\[\s*\]/g, "[]");
  let suffix = "";
  while (compact.endsWith("[]")) { suffix += "[]"; compact = compact.slice(0, -2).trim(); }
  const aliases = new Map([
    ["int2", "smallint"], ["int4", "integer"], ["int8", "bigint"], ["decimal", "numeric"],
    ["bool", "boolean"], ["float4", "real"], ["float8", "double precision"], ["varchar", "character varying"],
    ["varbit", "bit varying"], ["timestamptz", "timestamp with time zone"], ["timestamp", "timestamp without time zone"],
    ["timetz", "time with time zone"], ["time", "time without time zone"],
  ]);
  compact = (aliases.get(compact) ?? compact) + suffix;
  return compact.replace(/\u0000(\d+)\u0000/g, (_, index) => protectedIdentifiers[Number(index)]);
}

function functionSignature(argumentsText, options = {}) {
  return splitSqlArguments(argumentsText)
    .map((argument) => functionInputType(argument, options))
    .filter(Boolean)
    .join(",");
}

function functionIdentity(schemaKey, nameKey, signature) {
  return `${schemaKey ?? "schema:unknown"}|${nameKey}|(${signature})`;
}

function sqlFunctionEvents(file, text) {
  const normalizedFile = normalizePath(file);
  const canonicalMigration = CANONICAL_MIGRATION.test(normalizedFile);
  const events = [];
  let searchFrom = 0;
  for (const statement of splitSqlStatements(text)) {
    const offset = text.indexOf(statement, searchFrom);
    searchFrom = Math.max(searchFrom, offset + statement.length);
    const clean = leadingCommentFreeStatement(statement);
    const create = clean.match(/^create\s+(or\s+replace\s+)?function\s+/i);
    const drop = clean.match(/^drop\s+function\s+(?:if\s+exists\s+)?/i);
    const operation = create ? (create[1] ? "REPLACE" : "CREATE") : drop ? "DROP" : null;
    if (!operation) continue;
    let cursor = clean.search(/\S/u) + (create ? create[0].length : drop[0].length);
    const definitions = [];
    do {
      const name = readQualifiedFunctionName(clean, cursor);
      if (!name) break;
      cursor = skipSqlTrivia(clean, name.end);
      if (clean[cursor] !== "(") break;
      const close = matchingParen(clean, cursor);
      if (close < 0) break;
      const argumentsText = clean.slice(cursor + 1, close);
      const signature = functionSignature(argumentsText, { definition: Boolean(create) });
      const position = offset + statement.indexOf(clean) + name.end - name.qualifiedName.length;
      definitions.push({
        schema: name.schema,
        name: name.name,
        qualifiedName: name.qualifiedName,
        arguments: argumentsText,
        signature,
        identity: functionIdentity(name.schemaKey, name.nameKey, signature),
        start: position,
        line: 1 + text.slice(0, position).split("\n").length - 1,
        text: statement,
      });
      cursor = close + 1;
      if (operation !== "DROP") break;
      cursor = skipSqlTrivia(clean, cursor);
      if (clean[cursor] !== ",") break;
      cursor += 1;
      cursor = skipSqlTrivia(clean, cursor);
    } while (cursor < clean.length);
    for (const definition of definitions) {
      events.push({
        ...definition,
        operation,
        path: normalizedFile,
        canonicalMigration,
        provenance: canonicalMigration ? "VERSIONED_MIGRATION" : "NON_CANONICAL_SQL_SOURCE",
      });
    }
  }
  return events;
}

function grantStatements(text) {
  const grants = [];
  let searchFrom = 0;
  for (const statement of splitSqlStatements(text)) {
    const offset = text.indexOf(statement, searchFrom);
    searchFrom = Math.max(searchFrom, offset + statement.length);
    const clean = leadingCommentFreeStatement(statement);
    const prefix = clean.match(/^grant\s+execute\s+on\s+function\s+/i);
    if (!prefix) continue;
    let cursor = prefix[0].length;
    const identities = [];
    while (cursor < clean.length) {
      const name = readQualifiedFunctionName(clean, cursor);
      if (!name) break;
      cursor = skipSqlTrivia(clean, name.end);
      if (clean[cursor] !== "(") break;
      const close = matchingParen(clean, cursor);
      if (close < 0) break;
      const signature = functionSignature(clean.slice(cursor + 1, close));
      identities.push(functionIdentity(name.schemaKey, name.nameKey, signature));
      cursor = skipSqlTrivia(clean, close + 1);
      if (clean[cursor] !== ",") break;
      cursor = skipSqlTrivia(clean, cursor + 1);
      if (/^to\b/i.test(clean.slice(cursor))) break;
    }
    const to = clean.slice(cursor).match(/^to\s+(.+?)(?:\s+with\s+grant\s+option)?\s*$/i)?.[1];
    if (!to) continue;
    const line = 1 + text.slice(0, offset + statement.indexOf(clean)).split("\n").length - 1;
    for (const identity of identities) {
      grants.push({
        identity,
        roles: to.split(",").map((role) => role.trim().replaceAll('"', "").toLowerCase()),
        line,
      });
    }
  }
  return grants;
}

function privilegeForSqlFunction(definition, grants, file) {
  const matchingGrants = grants.filter((grant) => grant.identity === definition.identity);
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

function buildCodeTestIndex(testSources) {
  const index = new Map();
  for (const { path, content } of testSources) {
    const lines = String(content).split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const tokens = new Set((lines[lineIndex].match(/[A-Za-z_$][\w$]*/g) ?? []));
      for (const token of tokens) {
        const entries = index.get(token) ?? [];
        entries.push({ path, line: lineIndex + 1, type: "TEST_SOURCE_REFERENCE" });
        index.set(token, entries);
      }
    }
  }
  return index;
}

function codeTestEvidence(contract, testSources, testIndex) {
  const tokens = [...new Set([
    contract.symbol,
    ...(contract.symbols ?? []),
    ...(contract.rpcNames ?? []),
  ].filter((value) => typeof value === "string" && value.length > 3))];
  const byTestFile = new Map();
  for (const reference of tokens.flatMap((token) => testIndex.get(token) ?? [])) {
    const previous = byTestFile.get(reference.path);
    if (!previous || reference.line < previous.line) byTestFile.set(reference.path, reference);
  }
  const references = [...byTestFile.values()].sort((left, right) => left.path.localeCompare(right.path, "en") || left.line - right.line);
  return {
    status: references.length > 0 ? "CODE_TEST_REFERENCE_FOUND" : "NO_CODE_TEST_REFERENCE_FOUND",
    searchedTestFiles: testSources.length,
    references,
    execution: "NOT_MEASURED",
    reason: references.length > 0
      ? "A_TRACKED_TEST_FILE_REFERENCES_A_SOURCE_SYMBOL;_EXECUTION_AND_COVERAGE_NOT_PROVEN"
      : "NO_TRACKED_TEST_FILE_REFERENCES_A_SOURCE_SYMBOL",
  };
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

function sourceCandidateSqlEvents(file, content) {
  return sqlFunctionEvents(file, content);
}

function replaySqlMigrationHistory(events) {
  const active = new Map();
  const conflicts = new Set();
  const ordered = [...events].filter((event) => event.canonicalMigration)
    .sort((left, right) => left.path.localeCompare(right.path, "en") || left.line - right.line);
  for (const event of ordered) {
    if (event.operation === "DROP") {
      event.lifecycle = "DROP_EVENT";
      const prior = active.get(event.identity);
      if (prior) {
        prior.lifecycle = "DROPPED_BY_LATER_MIGRATION";
        prior.supersededBy = { path: event.path, line: event.line, operation: "DROP" };
        event.lifecycle = "DROPPED_PRIOR_DEFINITION";
      } else {
        event.lifecycle = "DROP_WITHOUT_PRIOR_REPOSITORY_DEFINITION";
      }
      active.delete(event.identity);
      continue;
    }
    const prior = active.get(event.identity);
    if (prior) {
      prior.lifecycle = "REPLACED_BY_LATER_MIGRATION";
      prior.supersededBy = { path: event.path, line: event.line, operation: event.operation };
      if (event.operation === "CREATE") conflicts.add(event.identity);
    }
    event.lifecycle = conflicts.has(event.identity) ? "MIGRATION_SOURCE_CONFLICT" : "LATEST_MIGRATION_DEFINITION";
    active.set(event.identity, event);
  }
  return {
    active: [...active.values()].sort((left, right) => left.path.localeCompare(right.path, "en") || left.line - right.line),
    conflicts,
    ordered,
  };
}

function summarySqlEvent(event) {
  return {
    path: event.path,
    line: event.line,
    operation: event.operation,
    schema: event.schema,
    symbol: event.name,
    signature: event.signature,
    identity: event.identity,
    provenance: event.provenance,
    lifecycle: event.lifecycle ?? (event.canonicalMigration ? "VERSIONED_MIGRATION_EVIDENCE" : "NON_CANONICAL_SQL_SOURCE"),
    supersededBy: event.supersededBy ?? null,
  };
}

function contractFromSqlCandidate(event, migrationEvents, conflicts, testSources, testIndex, readFile) {
  const symbol = event.name;
  const grants = grantStatements(String(readFile(event.path)));
  const definition = { ...event, symbol };
  const privilege = privilegeForSqlFunction(definition, grants, event.path);
  const history = migrationEvents.filter((candidate) => candidate.identity === event.identity).map(summarySqlEvent);
  return {
    ...makeContract({ file: event.path, kind: privilegeKind(privilege.status), symbols: [symbol], symbol, privilege, text: event.text }),
    sourceLifecycle: {
      kind: "SQL_MIGRATION_CANDIDATE",
      status: conflicts.has(event.identity) ? "REVIEW_REQUIRED" : "LATEST_MIGRATION_DEFINITION",
      identity: event.identity,
      schema: event.schema,
      signature: event.signature,
      latestDefinition: { path: event.path, line: event.line, operation: event.operation },
      history,
    },
    databasePresence: {
      status: "NOT_MEASURED",
      reason: "NO_POSTGRES_CATALOG_EVIDENCE_MATCHING_AUDITED_SHA",
    },
    codeTests: codeTestEvidence({ path: event.path, symbol, symbols: [symbol] }, testSources, testIndex),
  };
}

export function discoverCriticalContractInventory({ files, readFile }) {
  const normalizedFiles = files.map(normalizePath).filter(isSourceFile).sort((left, right) => left.localeCompare(right, "en"));
  const candidateFiles = normalizedFiles.filter((file) => !isTestOrGenerated(file) && isNonRuntimeContractCandidate(file));
  const excludedCandidateSources = candidateFiles.map((file) => ({
    path: file,
    candidateDirectory: file.match(/^documentation\/specs\/empreinte-ia\/(CANDIDATS_LOTS?_)[^/]+/i)?.[0] ?? null,
    provenance: "DOCUMENTATION_CANDIDATE",
    runtimeDiscovery: "EXCLUDED_NOT_INTEGRATED",
    reason: "CANDIDATE_TREE_IS_NOT_RUNTIME_SOURCE",
  }));
  const includedFiles = normalizedFiles
    .filter((file) => !isTestOrGenerated(file) && !isNonRuntimeContractCandidate(file));
  const testSources = normalizedFiles.filter((file) => isTestOrGenerated(file) && !isNonRuntimeContractCandidate(file))
    .map((file) => ({ path: file, content: String(readFile(file)) }));
  const testIndex = buildCodeTestIndex(testSources);
  const sqlEvents = includedFiles.filter((file) => extensionOf(file) === ".sql")
    .flatMap((file) => sourceCandidateSqlEvents(file, String(readFile(file))))
    .sort((left, right) => left.path.localeCompare(right.path, "en") || left.line - right.line);
  const migrationEvents = sqlEvents.filter((event) => event.canonicalMigration);
  const replay = replaySqlMigrationHistory(migrationEvents);
  const contracts = [];

  for (const file of includedFiles) {
    if (extensionOf(file) === ".sql") continue;
    const text = String(readFile(file));
    const symbols = extractExportedSymbols(text);
    if (symbols.length === 0) continue;
    const rpcNames = rpcConsumerNames(text);
    const contractKinds = [];
    if (rpcNames.length > 0) contractKinds.push({ kind: "RPC_CONSUMER", rpcNames });
    const semanticKind = semanticContractKind(file, text);
    if (semanticKind) contractKinds.push({ kind: semanticKind, rpcNames: [] });
    for (const entry of contractKinds) {
      const contract = makeContract({ file, kind: entry.kind, symbols, rpcNames: entry.rpcNames, text });
      contracts.push({ ...contract, codeTests: codeTestEvidence(contract, testSources, testIndex) });
    }
  }

  for (const event of replay.active) {
    contracts.push(contractFromSqlCandidate(event, migrationEvents, replay.conflicts, testSources, testIndex, readFile));
  }

  contracts.sort((left, right) => left.path.localeCompare(right.path, "en")
    || left.kind.localeCompare(right.kind, "en")
    || String(left.symbol ?? left.rpcNames[0] ?? "").localeCompare(String(right.symbol ?? right.rpcNames[0] ?? ""), "en"));

  const history = migrationEvents.map(summarySqlEvent);
  const definitionEvents = migrationEvents.filter((event) => event.operation !== "DROP");
  return {
    contracts,
    sqlMigrationHistory: history,
    excludedCandidateSources,
    summary: {
      sqlMigrationOccurrences: definitionEvents.length,
      sqlMigrationDrops: migrationEvents.filter((event) => event.operation === "DROP").length,
      sqlSourceCandidates: replay.active.length,
      sqlMigrationSourceConflicts: replay.conflicts.size,
      sqlDatabasePresence: "NOT_MEASURED",
      excludedNonRuntimeCandidateSources: excludedCandidateSources.length,
    },
  };
}

export function discoverCriticalContracts(options) {
  return discoverCriticalContractInventory(options).contracts;
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
    if (!dimensions[dimension]) reasons.push(dimension === "tests" ? "MISSING_TEST_DOCUMENTATION" : `MISSING_${dimension.toUpperCase()}`);
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
  if (contract.databasePresence?.status === "NOT_MEASURED") reasons.push(contract.databasePresence.reason);
  if (contract.sourceLifecycle?.status === "REVIEW_REQUIRED") reasons.push("MIGRATION_SOURCE_SIGNATURE_CONFLICT");
  const hasContradiction = reasons.some((reason) => reason.startsWith("CONTRADICTORY_PRIVILEGE_CLAIM:")
    || reason.startsWith("CONFLICTING_DOCUMENT_LIFECYCLE:")
    || reason === "MIGRATION_SOURCE_SIGNATURE_CONFLICT");
  const cannotMeasurePrivilege = contract.kind === "RPC_CONSUMER" || privilegeStatus === "UNESTABLISHED" && contract.kind.startsWith("RPC_");
  const cannotMeasureDatabasePresence = contract.databasePresence?.status === "NOT_MEASURED";
  const status = hasContradiction ? "REVIEW_REQUIRED"
    : cannotMeasurePrivilege || cannotMeasureDatabasePresence || examined.length === 0 ? "NOT_MEASURED"
      : reasons.length === 0 ? "DOCUMENTED" : "REVIEW_REQUIRED";

  const codeTests = contract.codeTests ?? {
    status: "NOT_MEASURED",
    searchedTestFiles: null,
    references: [],
    execution: "NOT_MEASURED",
    reason: "CODE_TEST_INVENTORY_NOT_SUPPLIED",
  };

  return {
    path: contract.path,
    kind: contract.kind,
    symbol: contract.symbol,
    symbols: contract.symbols,
    rpcNames: contract.rpcNames,
    responsibility: contract.responsibility,
    sourceLifecycle: contract.sourceLifecycle ?? { kind: "RUNTIME_SOURCE", status: "CURRENT_TRACKED_SOURCE" },
    databasePresence: contract.databasePresence ?? null,
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
      tests: {
        code: codeTests,
        documentation: {
          status: dimensions.tests ? "DOCUMENTATION_TEST_EVIDENCE_FOUND" : "NO_TEST_DOCUMENTATION_EVIDENCE",
          proofs: proofs.tests,
        },
      },
    },
  };
}

export function reviewCriticalContracts({ contracts, documents }) {
  const symbolOwners = new Map();
  for (const contract of contracts) {
    const ownerIdentity = contract.sourceLifecycle?.identity
      ? `${contract.path}|${contract.sourceLifecycle.identity}`
      : contract.path;
    for (const symbol of new Set([contract.symbol, ...(contract.symbols ?? []), ...(contract.rpcNames ?? [])].filter(Boolean))) {
      const owners = symbolOwners.get(symbol) ?? new Set();
      owners.add(ownerIdentity);
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
