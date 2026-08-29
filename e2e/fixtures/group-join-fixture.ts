import { createClient } from "@supabase/supabase-js";

export const GROUP_JOIN_FIXTURE_ID = "6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71";
export const GROUP_JOIN_FIXTURE_MARKER = "E2E_FIXTURE:group-join:v1";

function requireLocalEnvironment(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Local Supabase URL and service role key are required for fixture cleanup.");
  }
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing fixture mutation outside local Supabase: ${parsed.hostname}`);
  }
  return { url, serviceRoleKey };
}

export async function assertGroupJoinFixtureIsPresent(): Promise<void> {
  const { url, serviceRoleKey } = requireLocalEnvironment();
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const result = await client
    .from("actions")
    .select("id, notes, action_phase, moderation_visibility, status")
    .eq("id", GROUP_JOIN_FIXTURE_ID)
    .eq("notes", `${GROUP_JOIN_FIXTURE_MARKER}\n[cmm-meta]{"groupJoinEnabled":true}`)
    .eq("action_phase", "pre_action")
    .eq("moderation_visibility", "visible")
    .eq("status", "approved")
    .maybeSingle();
  if (result.error) {
    throw new Error(`Unable to verify local group-join fixture: ${result.error.message}`);
  }
  if (!result.data) {
    throw new Error("The canonical local group-join fixture is absent.");
  }
}

export async function cleanupGroupJoinFixtureParticipants(): Promise<void> {
  const { url, serviceRoleKey } = requireLocalEnvironment();
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const result = await client
    .from("action_participants")
    .delete()
    .eq("action_id", GROUP_JOIN_FIXTURE_ID);
  if (result.error) {
    throw new Error(`Unable to clean local group-join fixture participants: ${result.error.message}`);
  }
}
