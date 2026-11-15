import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PgQueryModule from "pg-query-emscripten";
import { splitSqlStatements } from "./supabase-migration-sql.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SQL_PATH = /^(?:apps\/web\/supabase\/(?:migrations|tests)\/.*\.sql|e2e\/.*\.sql)$/u;
const MODIFYING_STATEMENTS = new Set(["InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"]);

function lineAndColumn(sql, cursorPosition) {
  const position = Math.max(0, Number(cursorPosition ?? 1) - 1);
  const before = sql.slice(0, position);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  return { line, column: position - lastNewline };
}

function nodeKind(node) {
  if (!node || typeof node !== "object") return null;
  return Object.keys(node).find((key) => key.endsWith("Stmt")) ?? null;
}

function cteIsModifying(cte) {
  const query = cte?.CommonTableExpr?.ctequery;
  return MODIFYING_STATEMENTS.has(nodeKind(query));
}

function walk(value, visit) {
  if (!value || typeof value !== "object") return;
  visit(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => walk(item, visit));
    else walk(child, visit);
  }
}

function findInvalidNestedModifyingCtes(parseTree, sql, sourceOffset = 0) {
  const errors = [];
  const statements = parseTree?.stmts ?? [];

  for (const statement of statements) {
    const root = statement?.stmt;
    walk(root, (node) => {
      const select = node?.SelectStmt;
      const ctes = select?.withClause?.ctes;
      if (!select || !Array.isArray(ctes) || !ctes.some(cteIsModifying) || node === root) return;

      const location = select.withClause.location;
      const { line, column } = lineAndColumn(sql, sourceOffset + location + 1);
      errors.push({
        line,
        column,
        message: "data-modifying CTE must be attached to the top-level PostgreSQL statement",
      });
    });
  }

  return errors;
}

export function isSqlValidationPath(filePath) {
  return SQL_PATH.test(String(filePath).replaceAll("\\", "/"));
}

export async function validateSqlText(sql, filePath = "<input>") {
  const source = String(sql ?? "");
  // libpg_query's WASM wrapper uses a stack allocator whose state is not
  // reliably reusable across unrelated files; isolate one parser instance per
  // file so a valid file cannot inherit a corrupted parse buffer.
  const pgQuery = await new PgQueryModule();
  const errors = [];

  let searchFrom = 0;
  for (const statement of splitSqlStatements(source)) {
    const sourceOffset = source.indexOf(statement, searchFrom);
    searchFrom = sourceOffset + statement.length;
    const parsed = pgQuery.parse(statement);
    if (parsed.error) {
      const { line, column } = lineAndColumn(source, sourceOffset + parsed.error.cursorpos);
      errors.push({
        line,
        column,
        message: parsed.error.message,
        context: parsed.error.context || undefined,
      });
    } else {
      errors.push(...findInvalidNestedModifyingCtes(parsed.parse_tree, source, sourceOffset));
    }
  }

  return {
    filePath,
    ok: errors.length === 0,
    errors,
    parser: "pg-query-emscripten/libpg_query",
  };
}

function gitShow(ref, filePath) {
  return execFileSync("git", ["show", `${ref}:${filePath}`], { cwd: repositoryRoot, encoding: "utf8" });
}

function stagedFile(filePath) {
  return execFileSync("git", ["show", `:${filePath}`], { cwd: repositoryRoot, encoding: "utf8" });
}

function stagedFiles() {
  return execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--"], { cwd: repositoryRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((filePath) => filePath.trim())
    .filter(Boolean);
}

function parseArguments(argv) {
  const options = { changedFiles: [] };
  for (const argument of argv) {
    if (argument === "--staged") options.staged = true;
    else if (argument.startsWith("--ref=")) options.ref = argument.slice("--ref=".length);
    else if (argument.startsWith("--base-ref=")) options.baseRef = argument.slice("--base-ref=".length);
    else if (argument.startsWith("--changed-file=")) options.changedFiles.push(argument.slice("--changed-file=".length));
    else if (argument.startsWith("--file=")) options.changedFiles.push(argument.slice("--file=".length));
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function readCandidateFile(filePath, options) {
  if (options.staged) return stagedFile(filePath);
  if (options.ref) return gitShow(options.ref, filePath);
  return readFileSync(resolve(repositoryRoot, filePath), "utf8");
}

export async function validateSqlFiles(filePaths, options = {}) {
  const paths = [...new Set(filePaths.map((filePath) => String(filePath).replaceAll("\\", "/")))]
    .filter(isSqlValidationPath)
    .sort();
  const results = [];

  for (const filePath of paths) {
    try {
      results.push(await validateSqlText(readCandidateFile(filePath, options), filePath));
    } catch (error) {
      results.push({
        filePath,
        ok: false,
        errors: [{ message: error instanceof Error ? error.message : String(error) }],
        parser: "pg-query-emscripten/libpg_query",
      });
    }
  }
  return results;
}

function printResult(result) {
  for (const error of result.errors) {
    const location = error.line ? `${result.filePath}:${error.line}:${error.column}` : result.filePath;
    console.error(`SQL_SYNTAX: FAIL ${location}: ${error.message}`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.staged && options.ref) throw new Error("--staged and --ref are mutually exclusive");
  if (options.staged && options.changedFiles.length === 0) options.changedFiles = stagedFiles();
  if (options.changedFiles.length === 0) {
    console.log("SQL_SYNTAX: PASS files=0 (no changed SQL files)");
    return 0;
  }

  const results = await validateSqlFiles(options.changedFiles, options);
  results.filter((result) => !result.ok).forEach(printResult);
  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error(`SQL_SYNTAX: FAIL files=${failures.length}/${results.length} parser=pg-query-emscripten/libpg_query`);
    return 1;
  }
  console.log(`SQL_SYNTAX: PASS files=${results.length} parser=pg-query-emscripten/libpg_query`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().then((exitCode) => { process.exitCode = exitCode; }).catch((error) => {
    console.error(`SQL_SYNTAX: FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
