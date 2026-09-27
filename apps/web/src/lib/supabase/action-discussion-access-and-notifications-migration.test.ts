import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260927000008_action_discussion_access_and_notifications.sql"),
  "utf8",
);

describe("current action discussion access and notification contract", () => {
  it("requires a real action relationship for reading and writing", () => {
    expect(migration).toContain("a.created_by_clerk_id = (select auth.jwt()) ->> 'sub'");
    expect(migration).toContain("action_organizers");
    expect(migration).toContain("ar.registration_status = 'confirmed'");
    expect(migration).toContain("ap.participation_status = 'confirmed'");
    expect(migration).toContain("create or replace function public.get_action_notification_audience");
    expect(migration).toContain("current_profile_active_role() in ('admin', 'max')");
    expect(migration).not.toContain("p.role_label in ('admin', 'max')");
    expect(migration).toContain("active_role_label text");
    expect(migration).toContain("profiles_active_role_label_check");
    expect(migration).toContain("private.can_view_action_conversation(p_conversation_id)");
    expect(migration).toContain("a.status = 'cancelled'");
  });

  it("keeps pending post-action claims out of access and notifications", () => {
    expect(migration).toContain("coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'");
    expect(migration).toContain("action_discussion");
    expect(migration).toContain("audience.user_id <> v_message.sender_id");
    expect(migration).toContain("'commentId'");
    expect(migration).toContain("'actionPhase'");
    expect(migration).toContain("n.type in ('chat', 'action_discussion')");
  });

  it("keeps action notification audience relational instead of role-based", () => {
    const audience = migration.slice(
      migration.indexOf("create or replace function public.get_action_notification_audience("),
      migration.indexOf("revoke all on function public.get_action_notification_audience(uuid)"),
    );

    expect(audience).toContain("action_organizers");
    expect(audience).toContain("action_registrations");
    expect(audience).toContain("action_participants");
    expect(audience).not.toMatch(/role_label|active_role_label|admin|max/);
  });

  it("keeps notification fan-out idempotent and marks action notifications read", () => {
    expect(migration).toContain("n.type in ('chat', 'action_discussion')");
    expect(migration).toContain("payload ->> 'messageId'");
    expect(migration).toContain("p_action_id::text");
    expect(migration).toContain("app_notifications_type_check");
  });
});
