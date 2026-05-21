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

export async function appendServiceEmailEvent(event: ServiceEmailEvent): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.from("service_email_events").insert({
        at: event.at,
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
        .select("at, provider, actor_user_id, recipient_count, subject, status, message_id, meta")
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
            provider: entry.provider,
            actorUserId: entry.actor_user_id ?? null,
            recipientCount: Number(entry.recipient_count ?? 0),
            subject: entry.subject,
            status: entry.status,
            messageId: entry.message_id ?? null,
            meta: (entry.meta ?? undefined) as Record<string, unknown> | undefined,
          }));
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
