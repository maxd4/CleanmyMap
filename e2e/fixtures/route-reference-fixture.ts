import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function ephemeralAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Ephemeral Supabase credentials are required for route-reference fixtures.");
  const parsed = new URL(url);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("Route-reference fixtures may only mutate the ephemeral local Supabase lane.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function createRouteReferenceActionFixture(): Promise<string> {
  const ownerId = process.env.E2E_CLERK_USER_ID;
  if (!ownerId) throw new Error("The Clerk global setup did not publish the E2E user identity.");
  const client = ephemeralAdmin();
  const id = crypto.randomUUID();
  const result = await client.from("actions").insert({
    id,
    created_by_clerk_id: ownerId,
    actor_name: "Compte E2E",
    action_date: "2030-01-15",
    location_label: "Action E2E itinéraire privé",
    status: "approved",
    published_at: "2098-12-01T10:00:00Z",
    notes: `E2E_FIXTURE:route-reference:v1:${id}`,
    type: "action",
    action_phase: "pre_action",
    preparation_data: { interventionMode: { version: "intervention-mode-v1", mode: "itinerary" } },
    moderation_visibility: "visible",
  });
  if (result.error) throw new Error("Unable to create persisted route-reference action fixture.");
  return id;
}

export async function seedRouteReferenceCleanupFixture(actionId: string, storagePath: string): Promise<string> {
  const client = ephemeralAdmin();
  const ownerId = process.env.E2E_CLERK_USER_ID;
  if (!ownerId) throw new Error("The Clerk global setup did not publish the E2E user identity.");
  const bytes = new Uint8Array(await (await import("node:fs/promises")).readFile("e2e/fixtures/signalement-upload.png"));
  const upload = await client.storage.from("action-photos").upload(storagePath, bytes, { contentType: "image/png", upsert: true });
  if (upload.error) throw new Error("Unable to seed route-reference cleanup object.");
  const mediaId = crypto.randomUUID();
  const row = await client.from("action_media").insert({
    id: mediaId,
    action_id: actionId,
    created_by_clerk_id: ownerId,
    client_upload_id: `cleanup-${mediaId}`,
    purpose: "route_reference",
    storage_bucket: "action-photos",
    storage_path: storagePath,
    original_name: "nettoyage-à-reprendre.png",
    mime_type: "image/png",
    size_bytes: bytes.byteLength,
    sort_order: 0,
    upload_state: "failed",
    failure_reason: "user_removed_pending_cleanup",
  });
  if (row.error) {
    await client.storage.from("action-photos").remove([storagePath]);
    throw new Error("Unable to seed route-reference cleanup tombstone.");
  }
  return mediaId;
}

export async function cleanupRouteReferenceActionFixture(actionId: string): Promise<void> {
  const client = ephemeralAdmin();
  const rows = await client.from("action_media").select("storage_bucket, storage_path").eq("action_id", actionId);
  if (rows.error) throw new Error("Unable to inspect route-reference fixture cleanup.");
  const paths = (rows.data ?? []).filter((row) => row.storage_bucket === "action-photos").map((row) => row.storage_path);
  if (paths.length) {
    const removed = await client.storage.from("action-photos").remove(paths);
    if (removed.error) throw new Error("Unable to remove route-reference fixture objects.");
  }
  const deleted = await client.from("actions").delete().eq("id", actionId).like("notes", `E2E_FIXTURE:route-reference:v1:${actionId}`);
  if (deleted.error) throw new Error("Unable to remove persisted route-reference fixture.");
}
