import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000022_community_subscriptions_server_write_boundary.sql", import.meta.url),
  "utf8",
);

describe("community subscription server write boundary migration [STATIC_CONTRACT]", () => {
  it("revokes all direct application-role writes while preserving owner reads", () => {
    expect(migration).toContain(
      "revoke insert, update, delete\n  on table public.community_subscriptions\n  from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant select\n  on table public.community_subscriptions\n  to authenticated, service_role;",
    );
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete)[\s\S]*community_subscriptions[\s\S]*\bauthenticated\b/i);
  });

  it("keeps the service-role server boundary explicit without duplicating territories", () => {
    expect(migration).toContain(
      "grant insert, update, delete\n  on table public.community_subscriptions\n  to service_role;",
    );
    expect(migration).not.toMatch(/1er arrondissement|future_actions|renfort|territoire imaginaire/i);
  });
});
