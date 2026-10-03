/**
 * Collecte et stockage des étapes du tunnel de conversion (Funnel).
 * PERMANENCE : Ces données sont stockées dans Supabase (table `funnel_events`) en production.
 * FALLBACK : Fichier JSON local en développement uniquement.
 */
import { join } from "node:path";
import {
  allowLocalFileStoreFallback,
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
  getRecentTimeWindow,
  prependBoundedRecord,
} from "@/lib/persistence/runtime-store";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
  type LocalRecordStorePayload,
} from "@/lib/persistence/local-record-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type FunnelStep = "view_new" | "page_view" | "start_form" | "submit_success";
export type FunnelMode = "quick" | "complete";

export type FunnelEvent = {
  at: string;
  sessionId: string;
  userId: string | null;
  step: FunnelStep;
  mode: FunnelMode;
  meta?: Record<string, unknown>;
};

type FunnelStore = LocalRecordStorePayload<FunnelEvent>;

const FILE_PATH = join(process.cwd(), "data", "local-db", "funnel_events.json");

function isMissingFunnelEventsTable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";
  const details = typeof record.details === "string" ? record.details : "";
  const haystack = `${code} ${message} ${details}`.toLowerCase();

  return (
    haystack.includes("could not find the table 'public.funnel_events'") ||
    haystack.includes("funnel_events") && haystack.includes("schema cache") ||
    haystack.includes("42p01") ||
    haystack.includes("pgrst205")
  );
}

function shouldFallbackToLocalStoreForFunnelEvents(error: unknown): boolean {
  if (process.env.NODE_ENV !== "production") {
    return isMissingFunnelEventsTable(error) || allowLocalFileStoreFallback();
  }

  return allowLocalFileStoreFallback();
}

async function readStore(): Promise<FunnelStore> {
  return readLocalRecordStore(FILE_PATH, normalizeFunnelEvent);
}

async function writeStore(store: FunnelStore): Promise<void> {
  await writeLocalRecordStore(FILE_PATH, store.records);
}

function normalizeFunnelEvent(record: Record<string, unknown>): FunnelEvent | null {
  const step = record.step;
  const mode = record.mode;
  const userId = record.userId;
  if (
    typeof record.at !== "string" ||
    typeof record.sessionId !== "string" ||
    (userId !== null && typeof userId !== "string") ||
    (step !== "view_new" && step !== "page_view" && step !== "start_form" && step !== "submit_success") ||
    (mode !== "quick" && mode !== "complete")
  ) {
    return null;
  }

  if (
    record.meta !== undefined &&
    (!record.meta || typeof record.meta !== "object" || Array.isArray(record.meta))
  ) {
    return null;
  }

  return record as unknown as FunnelEvent;
}

function throwIfFunnelPersistenceCannotFallback(error: unknown): void {
  if (!shouldFallbackToLocalStoreForFunnelEvents(error)) {
    throw error;
  }
}

export async function appendFunnelEvent(event: FunnelEvent): Promise<void> {
  assertPersistenceAvailable("funnel_events");

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient(true);
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
      if (!shouldFallbackToLocalStoreForFunnelEvents(result.error)) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      throwIfFunnelPersistenceCannotFallback(error);
    }
  }

  const store = await readStore();
  const records = prependBoundedRecord(event, store.records, 12000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
}

export async function listFunnelEvents(
  periodDays: number,
): Promise<FunnelEvent[]> {
  assertPersistenceAvailable("funnel_events");

  const { nowMs, floor, floorIso } = getRecentTimeWindow(periodDays);

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient(true);
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
      if (!shouldFallbackToLocalStoreForFunnelEvents(result.error)) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      throwIfFunnelPersistenceCannotFallback(error);
    }
  }

  const store = await readStore();
  return store.records.filter((entry) => {
    const ms = new Date(entry.at).getTime();
    return Number.isFinite(ms) && ms >= floor && ms <= nowMs;
  });
}
