import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000013_harmonize_action_share_notifications.sql"),
  "utf8",
);

// STATIC_CONTRACT: this protects the append-only SQL shape; it is not an
// executed database proof.
describe("action share notification harmonization STATIC_CONTRACT", () => {
  it("keeps the existing service-role RPCs and recipient boundary", () => {
    expect(migration).toContain("create or replace function public.create_action_share_request(");
    expect(migration).toContain("create or replace function public.list_action_share_requests_for_recipient(");
    expect(migration).toContain("create or replace function public.respond_action_share_request(");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public, pg_catalog");
    expect(migration).toContain("p_recipient_id");
    expect(migration).toContain("grant execute on function public.respond_action_share_request(uuid, text, text)");
    expect(migration).not.toContain("create table");
  });

  it("keeps sender identity optional while preserving action context", () => {
    expect(migration).toContain("left join public.profiles p on p.id = p_sender_id");
    expect(migration).toContain("coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.handle), ''), p_sender_id)");
    expect(migration).toContain("'actionLabel', v_action_label");
    expect(migration).toContain("'href', '/sections/messagerie?tab=dm&contactRequestId=' || v_request_id");
  });

  it("updates the original decision card and notifies the sender once per decision", () => {
    expect(migration).toContain("'decisionState', 'treated'");
    expect(migration).toContain("payload ->> 'requestKind' = 'action_share'");
    expect(migration).toContain("payload ->> 'requestId' = v_request.id::text");
    expect(migration).toContain("'Partage accepté'");
    expect(migration).toContain("'Partage refusé'");
    expect(migration).toContain("for update");
  });
});
