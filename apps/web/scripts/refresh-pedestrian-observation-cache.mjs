import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
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

export function buildObservationCacheRefreshRequest(projectionVersionId, eventIds, workerId) {
  return {
    p_projection_version_id: projectionVersionId,
    p_event_ids: eventIds,
    p_worker_id: workerId,
  };
}

export function buildObservationCacheFailureRequest(eventIds, error, workerId) {
  return {
    p_event_ids: eventIds,
    p_error: error,
    p_worker_id: workerId,
  };
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

    const published = await checkedRpc(client, "refresh_pedestrian_observation_cache",
      buildObservationCacheRefreshRequest(projection.id, eventIds, workerId));
    return { claimed: claimed.length, published: true, cacheVersionId: published };
  } catch (error) {
    await checkedRpc(client, "fail_pedestrian_observation_invalidation_events",
      buildObservationCacheFailureRequest(
        eventIds,
        error instanceof Error ? error.message : String(error),
        workerId,
      ));
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
