import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261018000009_harden_newsletter_subscription_write_boundary.sql", import.meta.url),
  "utf8",
);

describe("newsletter subscription write boundary migration [STATIC_CONTRACT]", () => {
  it("removes the obsolete anonymous INSERT policy", () => {
    expect(migration).toContain(
      'drop policy if exists "Allow anonymous subscription"\n  on public.newsletter_subscriptions;',
    );
    expect(migration).not.toMatch(/create policy[\s\S]+newsletter_subscriptions[\s\S]+for insert/i);
  });

  it("denies application-role INSERT while preserving the server writer", () => {
    expect(migration).toContain(
      "revoke insert on table public.newsletter_subscriptions\n  from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant insert on table public.newsletter_subscriptions to service_role;",
    );
    expect(migration).not.toMatch(/grant insert[\s\S]+newsletter_subscriptions[\s\S]+\b(?:anon|authenticated)\b/i);
  });

  it("documents that the route boundary is not address possession proof", () => {
    expect(migration).toContain("/api/newsletter/subscribe");
    expect(migration).toContain("existing email UNIQUE constraint");
    expect(migration).not.toMatch(/double.?opt|verification email|confirm.*address/i);
  });
});
