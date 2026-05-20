import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app_notifications insert rls", () => {
  it("restricts inserts to the service role", () => {
    const migrationPath = resolve(
      process.cwd(),
      "apps/web/supabase/migrations/20260420000008_messaging_infrastructure.sql",
    );
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Service role can insert notifications"',
    );
    expect(migration).toContain(
      "CREATE POLICY \"Service role can insert notifications\" ON public.app_notifications",
    );
    expect(migration).toContain("WITH CHECK (auth.role() = 'service_role')");
    expect(migration).not.toContain("WITH CHECK (TRUE)");
  });
});
