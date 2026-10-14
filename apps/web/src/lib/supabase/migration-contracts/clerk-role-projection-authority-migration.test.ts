import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261014000002_clerk_role_projection_authority_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("SECURITY-02 Clerk role projection authority migration", () => {
  it("keeps the corrective migration append-only and makes role helpers server-only", () => {
    expect(migration).toContain("revoke all on function public.current_profile_role_label()");
    expect(migration).toContain("grant execute on function public.current_profile_role_label() to service_role;");
    expect(migration).toContain("revoke all on function public.current_profile_active_role()");
    expect(migration).toContain("grant execute on function public.current_profile_active_role() to service_role;");
    expect(migration).not.toContain("role_projection_synced_at");
    expect(migration).not.toContain(
      "channel_type = 'admin_elu'\n    and public.current_profile_role_label()",
    );
    expect(migration).not.toContain(
      "channel_type = 'admin_elu'\n      and public.current_profile_role_label()",
    );
  });

  it("removes global role branches while retaining relationship-based action access", () => {
    expect(migration).toContain("a.created_by_clerk_id = (select auth.jwt()) ->> 'sub'");
    expect(migration).toContain("from public.action_organizers ao");
    expect(migration).toContain("from public.action_conversation_members m");
    expect(migration).toContain("ar.registration_status in ('pending', 'confirmed')");
    expect(migration).toContain("ap.participation_status in ('pending', 'confirmed')");
    expect(migration).not.toContain("channel_type = 'admin_elu'\n    and public.current_profile_role_label()");
    expect(migration).not.toContain("user_id = coalesce((select auth.jwt()) ->> 'sub', '')\n  or public.current_profile_role_label()");
  });

  it("removes the authenticated newsletter projection read", () => {
    expect(migration).toContain('drop policy if exists "Allow admin view subscriptions"');
    expect(migration).toContain("revoke select on table public.newsletter_subscriptions from authenticated;");
  });

  it("keeps the privileged poll write atomic and server-only", () => {
    expect(migration).toContain("create or replace function public.create_chat_poll_with_options_for_server(");
    expect(migration).toContain("or nullif(btrim(p_actor_user_id), '') is null");
    expect(migration).toContain("grant execute on function public.create_chat_poll_with_options_for_server(text, text, text, jsonb)");
    expect(migration).toContain("to service_role;");
  });
});
