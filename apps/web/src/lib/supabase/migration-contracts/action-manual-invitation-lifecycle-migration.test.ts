import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000005_atomic_manual_invitation_lifecycle.sql"),
  "utf8",
);

describe("atomic manual invitation lifecycle migration STATIC_CONTRACT", () => {
  it("preserves registration identity and versions legitimate re-invitations", () => {
    expect(migration).toContain("registration_cancellation_reason");
    expect(migration).toContain("manual_invitation_version");
    expect(migration).toContain("recipient_rejected");
    expect(migration).toContain("organizer_withdrawn");
    expect(migration).toContain("accepted_cancelled");
    expect(migration).toContain("manual_invitation_version = coalesce(manual_invitation_version, 1) + 1");
    expect(migration).toContain("drop index if exists public.app_notifications_action_invitation_unique_idx");
    expect(migration).toContain("payload ->> 'eventKey'");
    expect(migration).not.toContain("delete from public.action_registrations");
  });

  it("emits to valid Clerk ids without requiring a profiles row", () => {
    const emitter = migration.slice(
      migration.indexOf("create or replace function public.emit_action_invitation_notifications("),
      migration.indexOf("create or replace function public.emit_action_invitations_on_registration("),
    );
    expect(emitter).toContain("from public.action_registrations ar");
    expect(emitter).not.toContain("join public.profiles");
    expect(emitter).toContain("on conflict do nothing");
    expect(emitter).toContain("eventKey");
  });

  it("keeps recipient decisions scoped, terminal, and auditable", () => {
    expect(migration).toContain("and ar.user_id = p_recipient_id");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("registration_cancellation_reason = v_reason");
    expect(migration).toContain("n.payload ->> 'eventKey' = v_event_key");
    expect(migration).toContain("decision",);
  });

  it("makes participant replacement one serialized database operation", () => {
    expect(migration).toContain("sync_action_manual_participants");
    expect(migration).toContain("from public.actions where id = p_action_id for update");
    expect(migration).toContain("from public.action_registrations where action_id = p_action_id for update");
    expect(migration).toContain("registration_status = 'cancelled'");
    expect(migration).toContain("registration_cancellation_reason = 'organizer_withdrawn'");
    expect(migration).toContain("manual invitation was rejected by recipient");
    expect(migration).toContain("grant execute on function public.sync_action_manual_participants(uuid, text[])");
  });
});
