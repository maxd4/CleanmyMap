import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ServiceEmailEventStatus =
  | "sent"
  | "mocked"
  | "missing_config"
  | "error";

export type ServiceEmailEvent = {
  at: string;
  provider: "resend" | "mock";
  actorUserId: string | null;
  recipientCount: number;
  subject: string;
  status: ServiceEmailEventStatus;
  messageId: string | null;
  meta?: Record<string, unknown>;
};

type ServiceEmailStore = {
  updatedAt: string;
  records: ServiceEmailEvent[];
};

type ServiceEmailEventRow = {
  created_at?: string | null;
  provider?: string | null;
  actor_user_id?: string | null;
  recipient_count?: number | string | null;
  subject?: string | null;
  status?: ServiceEmailEventStatus | string | null;
  message_id?: string | null;
  meta?: Record<string, unknown> | null;
  at?: string | null;
};

const FILE_PATH = join(process.cwd(), "data", "local-db", "service_email_events.json");

function emptyStore(): ServiceEmailStore {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function readStore(): Promise<ServiceEmailStore> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ServiceEmailStore;
    if (!parsed || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: ServiceEmailStore): Promise<void> {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeServiceEmailEventRow(row: ServiceEmailEventRow): ServiceEmailEvent {
  return {
    at: row.created_at ?? row.at ?? new Date().toISOString(),
    provider: row.provider === "mock" ? "mock" : "resend",
    actorUserId: row.actor_user_id ?? null,
    recipientCount: Number(row.recipient_count ?? 0),
    subject: row.subject ?? "",
    status:
      row.status === "sent" ||
      row.status === "mocked" ||
      row.status === "missing_config" ||
      row.status === "error"
        ? row.status
        : "error",
    messageId: row.message_id ?? null,
    meta: row.meta ?? undefined,
  };
}

export async function appendServiceEmailEvent(event: ServiceEmailEvent): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.from("service_email_events").insert({
        created_at: event.at,
        provider: event.provider,
        actor_user_id: event.actorUserId,
        recipient_count: event.recipientCount,
        subject: event.subject,
        status: event.status,
        message_id: event.messageId,
        meta: event.meta ?? {},
      });
      if (!result.error) {
        return;
      }
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    }
  }

  const store = await readStore();
  const records = [event, ...store.records].slice(0, 12000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
}

export async function listServiceEmailEvents(
  periodDays: number,
): Promise<ServiceEmailEvent[]> {
  const nowMs = Date.now();
  const floor = nowMs - periodDays * 24 * 60 * 60 * 1000;

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const floorIso = new Date(floor).toISOString();
      const result = await supabase
        .from("service_email_events")
        .select("created_at, provider, actor_user_id, recipient_count, subject, status, message_id, meta")
        .gte("created_at", floorIso)
        .order("created_at", { ascending: false })
        .limit(12000);

      if (!result.error) {
        return (result.data ?? [])
          .filter((entry) => {
            const ms = new Date(entry.created_at ?? "").getTime();
            return Number.isFinite(ms) && ms >= floor && ms <= nowMs;
          })
          .map((entry) => normalizeServiceEmailEventRow(entry as ServiceEmailEventRow));
      }
      if (!allowLocalFileStoreFallback()) {
        return [];
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return [];
      }
    }
  }

  const store = await readStore();
  return store.records.filter((entry) => {
    const ms = new Date(entry.at).getTime();
    return Number.isFinite(ms) && ms >= floor && ms <= nowMs;
  });
}

export async function countServiceEmailEventsForActorSince(params: {
  actorUserId: string;
  sinceIso: string;
  statuses?: ServiceEmailEventStatus[];
}): Promise<number> {
  const statuses = params.statuses ?? ["sent"];

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("service_email_events")
        .select("created_at, status, actor_user_id")
        .eq("actor_user_id", params.actorUserId)
        .gte("created_at", params.sinceIso)
        .in("status", statuses);

      if (!result.error) {
        return (result.data ?? []).length;
      }
      if (!allowLocalFileStoreFallback()) {
        return 0;
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return 0;
      }
    }
  }

  const store = await readStore();
  return store.records.filter((entry) => {
    const ms = new Date(entry.at).getTime();
    return (
      entry.actorUserId === params.actorUserId &&
      statuses.includes(entry.status) &&
      Number.isFinite(ms) &&
      ms >= new Date(params.sinceIso).getTime()
    );
  }).length;
}
