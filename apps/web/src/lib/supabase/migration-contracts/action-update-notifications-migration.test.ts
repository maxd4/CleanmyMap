import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000007_action_update_notifications.sql"),
  "utf8",
);

describe("action update notifications migration STATIC_CONTRACT", () => {
  it("is service-role-only, published-action scoped and idempotent", () => {
    expect(migration).toContain("emit_action_update_notifications");
    expect(migration).toContain("coalesce((select auth.role()), '') <> 'service_role'");
    expect(migration).toContain("set search_path = public, pg_catalog");
    expect(migration).toContain("v_action.published_at is null");
    expect(migration).toContain("v_action.action_phase <> 'pre_action'");
    expect(migration).toContain("app_notifications_action_update_event_unique_idx");
    expect(migration).toContain("on conflict do nothing");
  });

  it("keeps the audience canonical and excludes the actor and cancelled registrations", () => {
    expect(migration).toContain("select v_action.created_by_clerk_id as user_id");
    expect(migration).toContain("from public.action_organizers ao");
    expect(migration).toContain("ar.registration_status = 'confirmed'");
    expect(migration).toContain("candidate.user_id <> p_actor_id");
    expect(migration).not.toContain("join public.profiles p on p.id = ar.user_id");
  });

  it("preserves traceability while grouping only unread rows", () => {
    expect(migration).toContain("n.read_at is null");
    expect(migration).toContain("for update");
    expect(migration).toContain("'changeEvents'");
    expect(migration).toContain("'eventKeys'");
    expect(migration).toContain("jsonb_array_length(v_next_events) - 50");
    expect(migration).toContain("'Action annulée'");
  });
});
