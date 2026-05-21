import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("app_notifications insert rls", () => {
  it("restricts inserts to the service role", () => {
    const migration = readFileSync(
      new URL("../../../supabase/migrations/20260420000008_messaging_infrastructure.sql", import.meta.url),
      "utf8",
    );

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
