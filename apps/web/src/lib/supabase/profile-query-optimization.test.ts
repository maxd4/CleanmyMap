import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("profile query optimization", () => {
  it("adds a narrow created_at index for earliest-profile lookups", () => {
    const migration = readMigration("../../../supabase/migrations/20260625000003_add_profiles_created_at_index.sql");

    expect(migration).toContain("create index if not exists idx_profiles_created_at");
    expect(migration).toContain("on public.profiles(created_at);");
  });

  it("adds search indexes for bounded profile lookups", () => {
    const migration = readMigration("../../../supabase/migrations/20260625000004_profiles_search_indexes.sql");

    expect(migration).toContain("create extension if not exists pg_trgm;");
    expect(migration).toContain("create index if not exists idx_profiles_display_name");
    expect(migration).toContain("create index if not exists idx_profiles_handle_trgm");
    expect(migration).toContain("create index if not exists idx_profiles_display_name_trgm");
  });
});
