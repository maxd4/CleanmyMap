/**
 * Collecte et stockage des étapes du tunnel de conversion (Funnel).
 * PERMANENCE : Ces données sont stockées dans Supabase (table `funnel_events`) en production.
 * FALLBACK : Fichier JSON local en développement uniquement.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type FunnelStep = "view_new" | "start_form" | "submit_success";
export type FunnelMode = "quick" | "complete";

export type FunnelEvent = {
  at: string;
  sessionId: string;
  userId: string | null;
  step: FunnelStep;
  mode: FunnelMode;
  meta?: Record<string, unknown>;
};

type FunnelStore = {
  updatedAt: string;
  records: FunnelEvent[];
};

const FILE_PATH = join(process.cwd(), "data", "local-db", "funnel_events.json");

function emptyStore(): FunnelStore {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function readStore(): Promise<FunnelStore> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FunnelStore;
    if (!parsed || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: FunnelStore): Promise<void> {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function appendFunnelEvent(event: FunnelEvent): Promise<void> {
  assertPersistenceAvailable("funnel_events");

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.from("funnel_events").insert({
        at: event.at,
        session_id: event.sessionId,
        user_id: event.userId,
        step: event.step,
        mode: event.mode,
        meta: event.meta ?? {},
      });
      if (!result.error) {
        return;
      }
      if (!allowLocalFileStoreFallback()) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      if (!allowLocalFileStoreFallback()) {
        throw error;
      }
    }
  }

  const store = await readStore();
  const records = [event, ...store.records].slice(0, 12000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
}

export async function listFunnelEvents(
  periodDays: number,
): Promise<FunnelEvent[]> {
  assertPersistenceAvailable("funnel_events");

  const nowMs = Date.now();
  const floor = nowMs - periodDays * 24 * 60 * 60 * 1000;

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const floorIso = new Date(floor).toISOString();
      const result = await supabase
        .from("funnel_events")
        .select("at, session_id, user_id, step, mode, meta")
        .gte("at", floorIso)
        .order("at", { ascending: false })
        .limit(12000);

      if (!result.error) {
        return (result.data ?? [])
          .filter((entry) => {
            const ms = new Date(entry.at).getTime();
            return Number.isFinite(ms) && ms >= floor && ms <= nowMs;
          })
          .map((entry) => ({
            at: entry.at,
            sessionId: entry.session_id,
            userId: entry.user_id,
            step: entry.step,
            mode: entry.mode,
            meta: (entry.meta ?? undefined) as
              | Record<string, unknown>
              | undefined,
          }));
      }
      if (!allowLocalFileStoreFallback()) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      if (!allowLocalFileStoreFallback()) {
        throw error;
      }
    }
  }

  const store = await readStore();
  return store.records.filter((entry) => {
    const ms = new Date(entry.at).getTime();
    return Number.isFinite(ms) && ms >= floor && ms <= nowMs;
  });
}
