import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function mergeRows(previous, refreshed, affectedIds) {
  const affected = new Set(affectedIds);
  const refreshedById = new Map(refreshed.map((row) => [row.projection_segment_id, row]));
  return [...previous.filter((row) => !affected.has(row.projection_segment_id)), ...refreshed]
    .filter((row, index, rows) => rows.findIndex((candidate) => candidate.projection_segment_id === row.projection_segment_id) === index)
    .map((row) => refreshedById.get(row.projection_segment_id) ?? row)
    .sort((left, right) => left.projection_segment_id.localeCompare(right.projection_segment_id));
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function checkedRpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data ?? [];
}

export async function refreshPedestrianObservationCache() {
  const client = serviceClient();
  const rebuildReason = option("--enqueue-rebuild", null);
  if (rebuildReason) {
    if (!["temporal", "model", "network"].includes(rebuildReason)) {
      throw new Error("--enqueue-rebuild doit être temporal, model ou network.");
    }
    return {
      enqueued: await checkedRpc(client, "enqueue_pedestrian_risk_cache_rebuild", {
        p_reason: rebuildReason,
        p_identity: option("--identity", new Date().toISOString()),
      }),
    };
  }
  const workerId = option("--worker-id", `pedestrian-cache-${crypto.randomUUID()}`);
  const limit = Math.max(1, Math.min(100, Number(option("--limit", "25")) || 25));
  const claimed = await checkedRpc(client, "claim_pedestrian_observation_invalidation_events", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 300,
  });
  if (claimed.length === 0) return { claimed: 0, refreshedSegments: 0, published: false };

  const eventIds = claimed.map((event) => event.id);
  try {
    const { data: projection, error: projectionError } = await client
      .from("pedestrian_risk_projection_versions")
      .select("id")
      .eq("status", "active")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (projectionError) throw projectionError;
    if (!projection?.id) throw new Error("Aucune projection piétonne active.");

    const affected = await checkedRpc(client, "get_pedestrian_observation_cache_affected_segments", {
      p_projection_version_id: projection.id,
      p_event_ids: eventIds,
    });
    const { data: previous, error: previousError } = await client.rpc("get_active_pedestrian_observation_cache", {
      p_projection_version_id: projection.id,
      p_segment_ids: null,
    });
    if (previousError) throw previousError;
    const previousRows = previous ?? [];
    const affectedIds = affected.map((row) => row.projection_segment_id);
    const refreshAll = previousRows.length === 0 || claimed.some((event) => event.source_table === "system");
    const refreshed = await checkedRpc(client, "compute_pedestrian_observation_cache_rows", {
      p_projection_version_id: projection.id,
      p_segment_ids: refreshAll ? null : affectedIds,
    });
    const rows = refreshAll ? refreshed : mergeRows(previousRows, refreshed, affectedIds);
    const { data: watermarkRows, error: watermarkError } = await client
      .from("trash_spotter_spots")
      .select("updated_at")
      .eq("status", "validated")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (watermarkError) throw watermarkError;
    const sourceWatermark = watermarkRows?.[0]?.updated_at ?? new Date().toISOString();
    const published = await checkedRpc(client, "publish_pedestrian_observation_cache", {
      p_projection_version_id: projection.id,
      p_source_watermark: sourceWatermark,
      p_rows: refreshAll ? rows : refreshed,
      p_counts: { segments: rows.length, refreshedSegments: refreshed.length, events: claimed.length },
      p_event_ids: eventIds,
      p_replace_segment_ids: refreshAll ? null : affectedIds,
    });
    return { claimed: claimed.length, refreshedSegments: refreshed.length, published: true, cacheVersionId: published };
  } catch (error) {
    await checkedRpc(client, "fail_pedestrian_observation_invalidation_events", {
      p_event_ids: eventIds,
      p_error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  refreshPedestrianObservationCache()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
