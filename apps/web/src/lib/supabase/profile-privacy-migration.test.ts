import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261014000001_profile_privacy_and_role_privilege_hardening.sql", import.meta.url),
  "utf8",
);

it("keeps profiles public through an explicit identity projection only", () => {
  expect(migration).toContain("drop policy if exists profiles_select_all on public.profiles;");
  expect(migration).toContain("create policy profiles_public_identity_select");
  expect(migration).toContain("create or replace view public.public_profiles");
  expect(migration).toContain("with (security_barrier = true)");
  expect(migration).toContain("id,\n  display_name,\n  handle,\n  avatar_url");
  expect(migration).toContain(
    "grant select (id, display_name, handle, avatar_url)\n  on table public.profiles to anon, authenticated;",
  );
  expect(migration).not.toContain("20261013000014");
});

it("revokes application-role profile and adjacent table privileges explicitly", () => {
  expect(migration).toContain("revoke all on table public.profiles from public, anon, authenticated;");
  expect(migration).toContain("grant select, insert, update on table public.profiles to service_role;");
  expect(migration).toContain("revoke all on function public.load_referral_lineage_profiles(text)");
  expect(migration).toContain(
    "grant execute on function public.load_referral_lineage_profiles(text) to service_role;",
  );
  expect(migration).toContain("revoke all on table public.newsletter_subscriptions from public, anon, authenticated, service_role;");
  expect(migration).toContain("grant insert on table public.newsletter_subscriptions to anon;");
  expect(migration).toContain("revoke all on table public.notification_preferences from public, anon, authenticated, service_role;");
  expect(migration).toContain("grant select, insert, update on table public.notification_preferences to authenticated, service_role;");
  expect(migration).toContain("revoke all on table public.notification_information_mutes from public, anon, authenticated, service_role;");
});

it("keeps the RLS authorization helpers controlled and server-owned", () => {
  for (const functionName of [
    "current_profile_role_label",
    "current_profile_arrondissement",
    "current_profile_active_role",
  ]) {
    expect(migration).toContain(`create or replace function public.${functionName}()`);
    expect(migration).toContain("security definer");
    expect(migration).toContain(
      `revoke all on function public.${functionName}() from public, anon, authenticated, service_role;`,
    );
    expect(migration).toContain(
      `grant execute on function public.${functionName}() to authenticated, service_role;`,
    );
  }

  expect(migration).toContain("create or replace function private.is_profile_admin(p_profile_id text)");
  expect(migration).toContain("revoke all on function private.is_profile_admin(text)");
  expect(migration).toContain(
    "grant execute on function private.is_profile_admin(text)\n  to authenticated, service_role;",
  );
  expect(migration).toContain("public.current_profile_role_label() in ('admin', 'max', 'elu')");
  expect(migration).toContain("private.is_profile_admin(recipient_id)");
  expect(migration).toContain(
    'alter policy "Allow admin view subscriptions"\n  on public.newsletter_subscriptions\n  using (public.current_profile_role_label() in (\'admin\', \'super-admin\'));',
  );
});
