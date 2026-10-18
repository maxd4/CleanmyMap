import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261018000011_private_action_invitation_links.sql", import.meta.url),
  "utf8",
);

describe("private action invitation migration contract", () => {
  it("keeps access, moderation and publication as separate persisted boundaries", () => {
    expect(migration).toContain("access_mode text not null default 'public'");
    expect(migration).toContain("check (access_mode in ('public', 'invite_link'))");
    expect(migration).toContain("coalesce(a.access_mode, 'public') = 'public'");
    expect(migration).toContain("coalesce(access_mode, 'public') = 'public'");
  });

  it("enforces hash-only links and concurrent pending registration semantics", () => {
    expect(migration).toContain("token_hash text not null");
    expect(migration).toContain("on conflict (action_id) do update");
    expect(migration).toContain("for update");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(p_action_id::text || ':' || p_user_id, 0))");
    expect(migration).toContain("p_token_hash text");
    expect(migration).toContain("private_registration_invitation_invalid");
    expect(migration).toContain("'pending', 'group_form'");
    expect(migration).toContain("on conflict (action_id, user_id)");
    expect(migration).toContain("revoke all on table public.action_invitation_links");
    expect(migration).toContain("grant execute on function public.request_private_action_registration");
    expect(migration).toContain("zz_private_action_public_impact_guard");
  });
});
