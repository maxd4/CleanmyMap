import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260915000001_action_conversations.sql"), "utf8");
const audienceMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260915000017_action_notification_audience.sql"), "utf8");

describe("action conversation migration contract", () => {
  it("keeps one canonical conversation per action and separates chat access from participation", () => {
    expect(migration).toContain("action_id uuid not null unique references public.actions");
    expect(migration).toContain("primary key (conversation_id, user_id)");
    expect(migration).toContain("create trigger actions_action_conversation_on_publish");
    expect(migration).toContain("ensure_action_conversation_member");
    expect(migration).toContain("on conflict (conversation_id, user_id) do nothing");
    expect(migration).toContain("channel_type = 'action'");
  });

  it("does not expose drafts and preserves the notification RPC path", () => {
    expect(migration).toContain("a.published_at is not null");
    expect(migration).toContain("create or replace function public.create_chat_notifications_for_message");
    expect(migration).toContain("p_action_id uuid default null");
    expect(migration).toContain("grant execute on function public.ensure_action_conversation_member(uuid, text) to service_role");
  });

  it("derives notification audiences from the current lifecycle sources", () => {
    expect(audienceMigration).toContain("create or replace function public.get_action_notification_audience(");
    expect(audienceMigration).toContain("ar.registration_status in ('pending', 'confirmed')");
    expect(audienceMigration).toContain("ap.participation_status = 'confirmed'");
    expect(audienceMigration).toContain("coalesce(a.action_phase, 'post_action_complete') <> 'post_action_complete'");
    expect(audienceMigration).toContain("coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'");
    expect(audienceMigration).toContain("action_organizers");
    expect(audienceMigration).toContain("a.created_by_clerk_id as user_id");
    expect(audienceMigration).toContain("action_conversation_exclusions");
    expect(audienceMigration).toContain("from public.get_action_notification_audience(v_message.conversation_action_id) audience");
    expect(audienceMigration).not.toMatch(/create or replace function public\.can_view_action_conversation/);
    expect(audienceMigration).not.toContain("public.can_view_action_conversation(");
  });

  it("pins the future-to-final notification boundary and exclusion behavior", () => {
    const audienceFunction = audienceMigration.slice(
      audienceMigration.indexOf("create or replace function public.get_action_notification_audience("),
      audienceMigration.indexOf("revoke all on function public.get_action_notification_audience(uuid)"),
    );
    const fanout = audienceMigration.slice(
      audienceMigration.indexOf("if v_message.channel_type = 'action'"),
      audienceMigration.indexOf("end if;", audienceMigration.indexOf("if v_message.channel_type = 'action'") + 1) + "end if;".length,
    );

    expect(audienceFunction).toMatch(/future_registration[\s\S]+registration_status in \('pending', 'confirmed'\)/);
    expect(audienceFunction).toMatch(/final_participant[\s\S]+participation_status = 'confirmed'/);
    expect(audienceFunction).not.toMatch(/final_participant[\s\S]+action_registrations/);
    expect(fanout).toContain("action_conversation_exclusions e");
    expect(fanout).not.toContain("from public.action_conversation_members");
    expect(audienceMigration).toContain("Reconcile existing published actions once");
    expect(audienceFunction).not.toMatch(/role_label/);
  });

  it("keeps the projection technical and synchronizes all source transitions", () => {
    expect(audienceMigration).toContain("sync_action_conversation_notification_audience");
    expect(audienceMigration).toContain("action_registrations_notification_audience_sync");
    expect(audienceMigration).toContain("action_participants_notification_audience_sync");
    expect(audienceMigration).toContain("action_organizers_notification_audience_sync");
    expect(audienceMigration).toContain("Historical rows are not deleted here");
    expect(audienceMigration).toContain("revoke all on function public.get_action_notification_audience(uuid)");
    expect(audienceMigration).toContain("grant execute on function public.get_action_notification_audience(uuid)");
  });
});
