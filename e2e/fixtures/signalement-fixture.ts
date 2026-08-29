import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SIGNALEMENT_E2E_MEDIA_MARKER = "E2E_CAMPAIGN_2_PHOTO";

type SignalementRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  user_id: string | null;
  label: string;
  spot_type: "spot" | "clean_place";
  latitude: number | null;
  longitude: number | null;
  status: "new" | "validated" | "cleaned";
  notes: string | null;
};

export type SignalementMediaProofRow = {
  id: string;
  signalement_id: string;
  created_by_clerk_id: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  upload_state: "pending" | "ready" | "failed";
};

function localAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Local Supabase URL and service role key are required for E2E proof.");
  }
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing signalement E2E mutation outside local Supabase: ${parsed.hostname}`);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function readSignalement(signalementId: string): Promise<SignalementRow | null> {
  const result = await localAdmin()
    .from("trash_spotter_spots")
    .select("id, created_at, created_by_clerk_id, user_id, label, spot_type, latitude, longitude, status, notes")
    .eq("id", signalementId)
    .maybeSingle();
  if (result.error) throw new Error(`Unable to read local signalement: ${result.error.message}`);
  return (result.data as SignalementRow | null) ?? null;
}

export async function readSignalementMedia(signalementId: string): Promise<SignalementMediaProofRow[]> {
  const result = await localAdmin()
    .from("signalement_media")
    .select("id, signalement_id, created_by_clerk_id, storage_bucket, storage_path, original_name, mime_type, size_bytes, width, height, upload_state")
    .eq("signalement_id", signalementId)
    .order("created_at", { ascending: true });
  if (result.error) throw new Error(`Unable to read local signalement media: ${result.error.message}`);
  return (result.data ?? []) as SignalementMediaProofRow[];
}

export async function downloadSignalementObject(path: string): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const result = await localAdmin().storage.from("signalement-evidence").download(path);
  if (result.error || !result.data) {
    throw new Error(`Unable to download local signalement object: ${result.error?.message ?? "missing object"}`);
  }
  return {
    bytes: new Uint8Array(await result.data.arrayBuffer()),
    contentType: result.data.type || null,
  };
}

export async function cleanupSignalement(signalementId: string): Promise<{ mediaPathsRemoved: string[]; parentDeleted: boolean }> {
  const client = localAdmin();
  const parent = await client
    .from("trash_spotter_spots")
    .select("id")
    .eq("id", signalementId)
    .maybeSingle();
  if (parent.error) throw new Error(`Unable to inspect cleanup target: ${parent.error.message}`);
  if (!parent.data) return { mediaPathsRemoved: [], parentDeleted: true };

  const media = await client
    .from("signalement_media")
    .select("storage_bucket, storage_path")
    .eq("signalement_id", signalementId);
  if (media.error) throw new Error(`Unable to inspect signalement media cleanup: ${media.error.message}`);
  const rows = (media.data ?? []) as Array<{ storage_bucket: string; storage_path: string }>;
  const paths = rows
    .filter((row) => row.storage_bucket === "signalement-evidence")
    .map((row) => row.storage_path);
  if (paths.length > 0) {
    const removed = await client.storage.from("signalement-evidence").remove(paths);
    if (removed.error) throw new Error(`Unable to remove local signalement objects: ${removed.error.message}`);
  }

  const deleted = await client.from("trash_spotter_spots").delete().eq("id", signalementId);
  if (deleted.error) throw new Error(`Unable to delete local signalement fixture: ${deleted.error.message}`);
  return { mediaPathsRemoved: paths, parentDeleted: true };
}
