const MUTATION_PATTERN = /\b(?:insert\s+into|update\s+(?:[a-z0-9_]+\.)?[a-z0-9_]+|delete\s+from|truncate\b|select\s+setval\s*\()/i;
const DESTRUCTIVE_PATTERN = /^(?:delete\s+from|truncate\b|drop\s+(?:table|column|schema)\b)/i;

function dollarQuoteAt(sql, index) {
  const match = sql.slice(index).match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/);
  return match?.[0] ?? "";
}

export function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let quote = "";
  let dollarQuote = "";
  let lineComment = false;
  let blockComment = false;
  let blockDepth = 0;
  let escaped = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "/" && next === "*") {
        blockDepth += 1;
        index += 1;
      } else if (character === "*" && next === "/") {
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) blockComment = false;
      }
      continue;
    }
    if (dollarQuote) {
      if (sql.startsWith(dollarQuote, index)) {
        index += dollarQuote.length - 1;
        dollarQuote = "";
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\" && quote === "'") escaped = true;
      else if (character === quote) {
        if (sql[index + 1] === quote) index += 1;
        else quote = "";
      }
      continue;
    }
    if (character === "-" && next === "-") {
      lineComment = true;
      index += 1;
    } else if (character === "/" && next === "*") {
      blockComment = true;
      blockDepth = 1;
      index += 1;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else {
      const delimiter = dollarQuoteAt(sql, index);
      if (delimiter) {
        dollarQuote = delimiter;
        index += delimiter.length - 1;
      } else if (character === ";") {
        if (sql.slice(start, index).trim()) statements.push(sql.slice(start, index).trim());
        start = index + 1;
      }
    }
  }
  if (sql.slice(start).trim()) statements.push(sql.slice(start).trim());
  return statements;
}

function functionStatement(statement) {
  return /^create\s+(?:or\s+replace\s+)?(?:function|procedure)\b/i.test(statement);
}

function functionBodyMutation(statement) {
  return functionStatement(statement) && MUTATION_PATTERN.test(statement);
}

function topLevelMutation(statement) {
  return /^(?:insert\s+into|update\s+(?:[a-z0-9_]+\.)?[a-z0-9_]+|delete\s+from|truncate\b|select\s+setval\s*\()/i.test(statement)
    || (/^do\b/i.test(statement) && MUTATION_PATTERN.test(statement));
}

export function classifyMigrationSql(sql = "") {
  const statements = splitSqlStatements(sql);
  let dataMutation = false;
  let destructive = false;
  let embeddedDml = false;
  let reviewRequired = false;
  const classifications = [];

  for (const statement of statements) {
    if (functionStatement(statement)) {
      if (functionBodyMutation(statement)) {
        embeddedDml = true;
        classifications.push("FUNCTION_BODY_DML");
      }
      continue;
    }
    if (topLevelMutation(statement)) {
      dataMutation = true;
      destructive ||= DESTRUCTIVE_PATTERN.test(statement);
      classifications.push("EXECUTED_DML");
      continue;
    }
    if (/\b(?:execute\s+format|execute\s+'|execute\s*\()/i.test(statement)) {
      reviewRequired = true;
      classifications.push("REVIEW_REQUIRED");
    }
    if (DESTRUCTIVE_PATTERN.test(statement)) {
      destructive = true;
      classifications.push("DESTRUCTIVE_DDL");
    }
  }

  return {
    dataMutation,
    destructive,
    embeddedDml,
    reviewRequired,
    classification: [...new Set(classifications)],
  };
}

function qualifiedObjectName(match) {
  return `public.${match[1].toLowerCase()}`;
}

function functionNames(sql, keyword) {
  const names = [];
  const pattern = new RegExp(`\\b${keyword}\\s+(?:if\\s+exists\\s+)?(?:public\\.)?([a-z_][a-z0-9_]*)`, "gi");
  for (const match of sql.matchAll(pattern)) names.push(qualifiedObjectName(match));
  return [...new Set(names)];
}

export function findSqlContractCompatibilityIssues(sql = "", applicationSource = "") {
  const dropped = functionNames(sql, "drop\\s+(?:function|procedure)");
  const created = new Set(functionNames(sql, "create\\s+(?:or\\s+replace\\s+)?(?:function|procedure)"));
  const issues = [];
  for (const name of dropped.filter((candidate) => !created.has(candidate))) {
    const shortName = name.slice("public.".length);
    const rpcPattern = new RegExp(`\\.rpc\\(\\s*[\\"']${shortName}[\\"']`, "i");
    if (rpcPattern.test(applicationSource)) issues.push({ contract: name, consumer: "rpc" });
  }
  return issues;
}
