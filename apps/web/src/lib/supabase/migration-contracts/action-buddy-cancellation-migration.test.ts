import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261031000002_action_buddy_cancellation_transition.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("action buddy cancellation migration contract", () => {
  it("accepts only the matched to cancelled transition", () => {
    expect(migration).toContain("new.status is distinct from 'cancelled'");
    expect(migration).toContain("old.status is not distinct from new.status");
    expect(migration).toContain("old.status is distinct from 'matched'");
    expect(migration).toContain("old.matched_mentor_user_id is null");
    expect(migration).not.toContain("old.status is distinct from new.status");
  });

  it("preserves the event identity, deduplication and server-only boundary", () => {
    expect(migration).toContain("action-buddy:request-cancelled:%s:%s");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(v_event_key, 0))");
    expect(migration).toContain("n.payload ->> 'eventkey' = v_event_key");
    expect(migration).toContain("'action_buddy_request_cancelled'");
    expect(migration).toContain("'actionid', new.action_id");
    expect(migration).toContain("'requestid', new.id");
    expect(migration).toContain("revoke all on function public.emit_action_buddy_request_cancellation_notification() from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.emit_action_buddy_request_cancellation_notification() to service_role");
  });
});
