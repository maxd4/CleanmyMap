import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(filename: string): string {
  return readFileSync(new URL(`../../../../supabase/migrations/${filename}`, import.meta.url), "utf8");
}

describe("single-action report generation migration contract", () => {
  it("extends the scope without weakening the private service-only boundary", () => {
    const migration = readMigration("20261017000001_single_action_report_generations.sql");
    expect(migration).toContain("'single_action'");
    expect(migration).toContain("revoke update, delete on table public.report_generations from service_role;");
    expect(migration).toContain("grant select, insert on table public.report_generations to service_role;");
    expect(migration).not.toMatch(/grant\s+.*\s+to\s+(anon|authenticated)/i);
  });
});
