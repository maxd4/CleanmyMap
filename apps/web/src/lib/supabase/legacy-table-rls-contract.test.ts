import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = "20260827000002_close_legacy_table_rls_advisories.sql";
const TABLES = ["forms", "legacy_spot_migrations", "spots"] as const;

function readMigration(): string {
  return readFileSync(new URL(`../../../supabase/migrations/${MIGRATION}`, import.meta.url), "utf8");
}

function readSourceTree(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return [readSourceTree(path)];
      if (!/\.(?:ts|tsx|mjs)$/.test(entry.name) || /\.test\.(?:ts|tsx)$/.test(entry.name)) {
        return [];
      }
      return [readFileSync(path, "utf8")];
    })
    .join("\n");
}

describe("legacy table RLS contracts", () => {
  it("keeps RLS enabled, service-only SELECT policies, and minimal grants", () => {
    const migration = readMigration();

    for (const table of TABLES) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(migration).toMatch(
        new RegExp(`revoke all privileges on table public\\.${table} from anon, authenticated`, "i"),
      );
      expect(migration).toMatch(
        new RegExp(`revoke all privileges on table public\\.${table} from service_role`, "i"),
      );
      expect(migration).toMatch(new RegExp(`grant select on table public\\.${table} to service_role`, "i"));
      expect(migration).toMatch(
        new RegExp(`create policy [a-z0-9_]+\\s+on public\\.${table}\\s+for select\\s+using \\(auth\\.role\\(\\) = 'service_role'\\)`, "is"),
      );
    }

    expect(migration).not.toMatch(/to\s+(anon|authenticated)\b/i);
    expect(migration).not.toMatch(/grant\s+(?:all|insert|update|delete|truncate|references|trigger)/i);
  });

  it("keeps forms compatible with the server-side validation read path", () => {
    const source = readFileSync(new URL("../gamification/progression-data.ts", import.meta.url), "utf8");

    expect(source).toMatch(/\.from\(["']forms["']\)/i);
    expect(source).toMatch(
      /select\(\s*"action_id, group_id, status, created_at, validated_by_admin, is_duplicate, is_deleted, is_test"\s*,?\s*\)/i,
    );
    expect(source).not.toMatch(/from\(["']forms["']\)[\s\S]{0,500}\.(?:insert|update|upsert|delete)\(/i);
  });

  it("keeps both spot tables in server-side archive paths and no application spots writes", () => {
    const archiveScript = readFileSync(new URL("../../../scripts/export-supabase-archive.mjs", import.meta.url), "utf8");
    const applicationSource = readSourceTree(join(process.cwd(), "src"));

    expect(archiveScript).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(archiveScript).toContain('{ table: "legacy_spot_migrations"');
    expect(archiveScript).toContain('{ table: "spots"');
    expect(applicationSource).not.toMatch(/from\(["']spots["']\)/i);
    expect(applicationSource).not.toMatch(/legacy_spot_migrations/i);
  });
});
