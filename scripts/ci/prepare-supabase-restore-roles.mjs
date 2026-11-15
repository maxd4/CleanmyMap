import { readFile, writeFile } from "node:fs/promises";
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

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function extractRestoreRoleGrants(sqlText) {
  const grants = [];
  for (const statement of String(sqlText ?? "").split(";")) {
    const match = statement.match(/^\s*GRANT\s+((?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*))\s+TO\s+([\s\S]+)$/i);
    if (!match) continue;
    const grantedRole = unquoteIdentifier(match[1]);
    const members = match[2]
      .replace(/\s+WITH\s+(?:ADMIN|INHERIT|SET)\s+OPTION[\s\S]*$/i, "")
      .split(",")
      .map((token) => token.trim().match(ROLE_IDENTIFIER)?.[0])
      .filter(Boolean)
      .map(unquoteIdentifier)
      .filter((role) => !ROLE_KEYWORDS.has(role.toUpperCase()));
    for (const member of members) grants.push({ grantedRole, member });
  }
  return grants;
}

export function buildRestoreAdminPrivilegeProbeSql(roleNames, roleGrants, probeRole = "cmm_restore_privilege_probe") {
  const statements = ["BEGIN;", `CREATE ROLE ${quoteIdentifier(probeRole)} NOLOGIN;`];
  for (const role of roleNames) statements.push(`ALTER ROLE ${quoteIdentifier(role)} RESET statement_timeout;`);
  for (const { grantedRole, member } of roleGrants) {
    statements.push(`GRANT ${quoteIdentifier(grantedRole)} TO ${quoteIdentifier(member)};`);
  }
  statements.push(`DROP ROLE ${quoteIdentifier(probeRole)};`, "ROLLBACK;", "");
  return statements.join("\n");
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
  const writeUserFile = argument("write-user-file");
  const writeDiagnosticFile = argument("write-diagnostic-file");
  if (!rolesFile || !container) {
    console.error("Usage: node prepare-supabase-restore-roles.mjs --roles-file PATH --container NAME [--database NAME]");
    process.exitCode = 2;
  } else {
    const rolesText = await readFile(rolesFile, "utf8");
    const roleNames = extractRestoreRoleNames(rolesText);
    const roleGrants = extractRestoreRoleGrants(rolesText);
    const preflightSql = buildRolePreflightSql(roleNames);
    const privilegeProbeSql = buildRestoreAdminPrivilegeProbeSql(roleNames, roleGrants);
    const diagnostics = [];
    const runSql = (user, sql, label) => {
      const result = spawnSync(
        "docker",
        ["exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-U", user, "-d", database, "-f", "-"],
        { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
      );
      diagnostics.push({ user, label, status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" });
      return result;
    };
    let executor;
    for (const candidate of ["postgres", "supabase_admin"]) {
      const preflight = runSql(candidate, preflightSql, "role-preflight");
      if (preflight.status !== 0) continue;
      const privilegeProbe = runSql(candidate, privilegeProbeSql, "privilege-probe");
      if (privilegeProbe.status === 0) {
        executor = candidate;
        break;
      }
    }
    if (!executor) {
      if (writeDiagnosticFile) {
        await writeFile(writeDiagnosticFile, diagnostics.map(({ user, label, status, stdout, stderr }) =>
          `candidate=${user} step=${label} status=${status ?? "signal"}\n${stdout}${stderr}`).join("\n"), "utf8");
      }
      console.error("RESTORE_ROLE_PREFLIGHT: FAIL");
      process.exitCode = 1;
    } else {
      if (writeUserFile) await writeFile(writeUserFile, `${executor}\n`, "utf8");
      console.log("RESTORE_ROLE_PREFLIGHT: PASS");
    }
  }
}
