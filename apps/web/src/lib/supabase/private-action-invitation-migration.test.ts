import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261018000011_private_action_invitation_links.sql", import.meta.url),
  "utf8",
);
const lifecycleMigration = readFileSync(
  new URL("../../../supabase/migrations/20261018000012_private_action_invitation_expiration_and_claims.sql", import.meta.url),
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

  it("persists three-month expiry and separates direct registration from post-action claims", () => {
    expect(lifecycleMigration).toContain("expires_at timestamptz");
    expect(lifecycleMigration).toContain("rotated_at + interval '3 months'");
    expect(lifecycleMigration).toContain("v_now + interval '3 months'");
    expect(lifecycleMigration).toContain("expires_at <= v_now");
    expect(lifecycleMigration).toContain("'invite_link'");
    expect(lifecycleMigration).toContain("'confirmed'");
    expect(lifecycleMigration).toContain("private_registration_action_awaiting_finalization");
    expect(lifecycleMigration).toContain("private_registration_already_decided");
    expect(lifecycleMigration).not.toContain("insert into public.action_participants");
  });

  it("keeps the invitation table and RPCs outside browser roles", () => {
    expect(migration).toContain("alter table public.action_invitation_links enable row level security");
    expect(migration).toContain("revoke all on table public.action_invitation_links from public, anon, authenticated");
    expect(lifecycleMigration).toContain("revoke all on function public.create_action_invitation_link(uuid, text, text)");
    expect(lifecycleMigration).toContain("revoke all on function public.request_private_action_registration(uuid, text, text)");
    expect(lifecycleMigration).toContain("grant execute on function public.request_private_action_registration(uuid, text, text)");
    expect(lifecycleMigration).toContain("to service_role");
  });
});
