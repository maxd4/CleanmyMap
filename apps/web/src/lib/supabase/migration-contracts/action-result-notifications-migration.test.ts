import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000008_action_result_notifications.sql"),
  "utf8",
);

describe("action result notifications migration STATIC_CONTRACT", () => {
  it("notifies confirmed future registrants once the public final result exists", () => {
    expect(migration).toContain("emit_action_result_notifications");
    expect(migration).toContain("a.status = 'approved'");
    expect(migration).toContain("a.action_phase = 'post_action_complete'");
    expect(migration).toContain("a.published_at is not null");
    expect(migration).toContain("ar.registration_status = 'confirmed'");
    expect(migration).toContain("ap.participation_status = 'confirmed'");
    expect(migration).toContain("subtype', 'action_result'");
    expect(migration).toContain("action_result:' || ar.action_id::text");
    expect(migration).toContain("on conflict do nothing");
  });

  it("keeps one inbox, binds each response to the recipient and preserves pending claims", () => {
    expect(migration).toContain("from public.app_notifications n");
    expect(migration).toContain("respond_to_action_result_prompt");
    expect(migration).toContain("p_recipient_id");
    expect(migration).toContain("'post_action_claim'");
    expect(migration).toContain("'pending', 'post_action_claim'");
    expect(migration).toContain("'not_participated'");
    expect(migration).toContain("decisionState', 'treated'");
    expect(migration).toContain("list_pending_post_action_claims_for_reviewer");
  });

  it("emits reviewer and claimant outcomes from canonical transitions", () => {
    expect(migration).toContain("action_participants_post_action_claim_notifications");
    expect(migration).toContain("old.participation_status = 'pending'");
    expect(migration).toContain("new.participation_status in ('confirmed', 'cancelled')");
    expect(migration).toContain("subtype', 'post_action_claim_decision'");
    expect(migration).toContain("grant execute on function public.sync_action_post_action_claim_notifications()");
  });
});
