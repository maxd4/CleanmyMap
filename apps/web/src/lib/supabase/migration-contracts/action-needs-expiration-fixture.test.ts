import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pgtap = readFileSync(
  new URL("../../../../supabase/tests/action-needs-contract.pgtap.sql", import.meta.url),
  "utf8",
).replaceAll("\r\n", "\n");

describe("action needs expiration fixture [STATIC_CONTRACT]", () => {
  it("keeps the expired fixture ordered before its expiration", () => {
    expect(pgtap).toContain("select plan(71);");
    expect(pgtap).toContain(
      `insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, created_at, expires_at)
values (
  '90000000-0000-4000-8000-000000000115',
  '90000000-0000-4000-8000-000000000001',
  'action-needs-test-owner', 'logistique', 'Besoin expiré', 'Ce besoin est expiré.',
  now() - interval '1 day',
  now() - interval '1 second'
);`,
    );
  });
});
