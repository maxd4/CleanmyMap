import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260915000009_action_share_requests.sql", import.meta.url),
  "utf8",
);

describe("action sharing and first-contact SQL contract", () => {
  it("keeps sharing on one public predicate for future invitations and completed results", () => {
    expect(migration).toContain("create or replace function public.is_public_action_reference_available(");
    expect(migration).toContain("p_action_phase = 'post_action_complete'");
    expect(migration).toContain("p_status = 'approved'");
    expect(migration).toContain("public.is_public_future_pre_action(");
    expect(migration).toContain("create or replace function public.can_insert_action_message_reference(");
    expect(migration).toContain("create or replace function public.can_view_action_conversation(");
  });

  it("makes first contact persistent, recipient-controlled and atomically deduplicated", () => {
    expect(migration).toContain("create table if not exists public.action_share_contact_requests");
    expect(migration).toContain("status in ('pending', 'accepted', 'rejected', 'ignored')");
    expect(migration).toContain("action_share_contact_requests_active_pair_idx");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("create or replace function public.respond_action_share_request(");
    expect(migration).toContain("p_recipient_id text");
    expect(migration).toContain("action_share_request_id");
    expect(migration).toContain("'href', '/sections/messagerie?tab=dm&contactRequestId='");
    expect(migration).not.toContain("action_participants");
  });
});
