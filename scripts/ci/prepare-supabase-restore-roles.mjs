import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const ROLE_IDENTIFIER = /"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*/g;
const ROLE_KEYWORDS = new Set([
  "ALL", "ALTER", "CREATE", "DEFAULT", "FOR", "FROM", "GRANT", "GROUP", "IN", "ON", "PRIVILEGES",
  "REVOKE", "ROLE", "SCHEMA", "TABLE", "TO", "WITH", "OPTION", "PUBLIC", "CURRENT_ROLE", "CURRENT_USER",
]);

function unquoteIdentifier(token) {
  if (token.startsWith('"') && token.endsWith('"')) return token.slice(1, -1).replaceAll('""', '"');
  return token;
}

function addRole(roles, token) {
  const role = unquoteIdentifier(token);
  if (!role || ROLE_KEYWORDS.has(role.toUpperCase())) return;
  roles.add(role);
}

export function extractRestoreRoleNames(sqlText) {
  const text = String(sqlText ?? "");
  const roles = new Set();
  for (const match of text.matchAll(new RegExp(`\\b(?:CREATE|ALTER)\\s+ROLE\\s+(${ROLE_IDENTIFIER.source})`, "gi"))) addRole(roles, match[1]);
  for (const statement of text.split(";")) {
    for (const match of statement.matchAll(new RegExp(`^\\s*GRANT\\s+(${ROLE_IDENTIFIER.source})\\s+TO\\b`, "gi"))) addRole(roles, match[1]);
    for (const match of statement.matchAll(/\b(?:TO|FROM)\s+([^;]+)/gi)) {
      for (const token of match[1].matchAll(ROLE_IDENTIFIER)) addRole(roles, token[0]);
    }
  }
  return [...roles].sort((left, right) => left.localeCompare(right));
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildRolePreflightSql(roleNames) {
  return [
    "BEGIN;",
    ...roleNames.map((role) => [
      "DO $cmm_role_preflight$",
      "BEGIN",
      `  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(role)}) THEN`,
      `    EXECUTE format('CREATE ROLE %I', ${quoteLiteral(role)});`,
      "  END IF;",
      "END",
      "$cmm_role_preflight$;",
    ].join("\n")),
    "COMMIT;",
    "",
  ].join("\n");
}

function argument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value?.slice(prefix.length);
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  const rolesFile = argument("roles-file");
  const container = argument("container");
  const database = argument("database") ?? "postgres";
  if (!rolesFile || !container) {
    console.error("Usage: node prepare-supabase-restore-roles.mjs --roles-file PATH --container NAME [--database NAME]");
    process.exitCode = 2;
  } else {
    const roleNames = extractRestoreRoleNames(await readFile(rolesFile, "utf8"));
    const sql = buildRolePreflightSql(roleNames);
    const runPreflight = (user) => spawnSync(
      "docker",
      ["exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database, "-f", "-"],
      { input: sql, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] },
    );
    const result = runPreflight("postgres");
    const fallbackResult = result.status === 0 ? result : runPreflight("supabase_admin");
    if (fallbackResult.status !== 0) {
      console.error("RESTORE_ROLE_PREFLIGHT: FAIL");
      process.exitCode = fallbackResult.status ?? 1;
    } else {
      console.log("RESTORE_ROLE_PREFLIGHT: PASS");
    }
  }
}
