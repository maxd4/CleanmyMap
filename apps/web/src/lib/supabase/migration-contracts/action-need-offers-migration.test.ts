import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000024_action_need_offers.sql", import.meta.url),
  "utf8",
);
const correctionMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000026_action_need_offers_need_identity.sql", import.meta.url),
  "utf8",
);

describe("action need offers migration [STATIC_CONTRACT]", () => {
  it("defines the four statuses, message bound and active uniqueness", () => {
    expect(migration).toContain("create table if not exists public.action_need_offers");
    expect(migration).toContain("char_length(btrim(message)) <= 300");
    expect(migration).toContain("status in ('pending', 'accepted', 'declined', 'withdrawn')");
    expect(migration).toContain("where status in ('pending', 'accepted')");
    expect(migration).toContain("action_need_offers_active_member_unique_idx");
  });

  it("keeps browser writes out of the table and RPCs", () => {
    expect(migration).toContain("revoke all on table public.action_need_offers from public, anon, authenticated, service_role;");
    expect(migration).toContain("grant select on table public.action_need_offers to service_role;");
    expect(migration).toContain("grant execute on function public.create_action_need_offer(uuid, text, text) to service_role;");
    expect(migration).toContain("grant execute on function public.transition_action_need_offer(uuid, text, text) to service_role;");
    expect(correctionMigration).toMatch(/grant execute on function public\.transition_action_need_offer\(uuid, uuid, text, text\)\s+to service_role;/);
    expect(correctionMigration).toContain("drop function if exists public.transition_action_need_offer(uuid, text, text);");
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete)[\s\S]*action_need_offers[\s\S]*authenticated/i);
  });

  it("uses the canonical public future-action predicate and atomic notification dedupe", () => {
    expect(migration).toContain("public.is_public_future_pre_action(");
    expect(migration).toContain("coalesce(a.access_mode, 'public') <> 'invite_link'");
    expect(migration).toContain("for update of n, a");
    expect(migration.match(/select into v_need, v_action\s+n, a/g)).toHaveLength(2);
    expect(correctionMigration.match(/select into v_need, v_action\s+n, a/g)).toHaveLength(1);
    expect(migration).not.toMatch(/select n, a\s+into v_need, v_action/);
    expect(correctionMigration).not.toMatch(/select n, a\s+into v_need, v_action/);
    expect(correctionMigration).toContain("where n.id = p_need_id");
    expect(correctionMigration).toMatch(/where id = p_offer_id\s+and need_id = v_need\.id/);
    expect(migration).toContain("action_need_offer_acceptance_notification_unique_idx");
    expect(migration).toContain("action_need_offer_accepted");
    expect(migration).not.toMatch(/action_registrations|action_participants/);
  });
});
