import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  canUseSupabaseServerPersistence,
  prependBoundedRecord,
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

function filterServiceEmailEventsForActorSince(
  records: readonly ServiceEmailEvent[],
  params: { actorUserId: string; sinceIso: string; statuses: ServiceEmailEventStatus[] },
): ServiceEmailEvent[] {
  const sinceMs = new Date(params.sinceIso).getTime();
  return records.filter((entry) => {
    const eventMs = new Date(entry.at).getTime();
    return (
      entry.actorUserId === params.actorUserId &&
      params.statuses.includes(entry.status) &&
      Number.isFinite(eventMs) &&
      eventMs >= sinceMs
    );
  });
}

async function readServiceEmailCountFromSupabase(
  load: (supabase: ReturnType<typeof getSupabaseServerClient>) => Promise<number | null>,
): Promise<number | null> {
  if (!canUseSupabaseServerPersistence()) return null;
  try {
    const value = await load(getSupabaseServerClient(true));
    if (value !== null) return value;
    return allowLocalFileStoreFallback() ? null : 0;
  } catch {
    return allowLocalFileStoreFallback() ? null : 0;
  }
}

async function countServiceEmailRecords(
  params: { actorUserId: string; sinceIso: string; statuses?: ServiceEmailEventStatus[] },
  load: (
    supabase: ReturnType<typeof getSupabaseServerClient>,
    statuses: ServiceEmailEventStatus[],
  ) => Promise<number | null>,
  fromLocal: (
    records: readonly ServiceEmailEvent[],
    params: { actorUserId: string; sinceIso: string; statuses: ServiceEmailEventStatus[] },
  ) => number,
): Promise<number> {
  const statuses = params.statuses ?? ["sent"];
  const supabaseCount = await readServiceEmailCountFromSupabase((supabase) =>
    load(supabase, statuses),
  );
  if (supabaseCount !== null) return supabaseCount;
  const store = await readStore();
  return fromLocal(store.records, { ...params, statuses });
}

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
      const supabase = getSupabaseServerClient(true);
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
  const records = prependBoundedRecord(event, store.records, 12000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
}

export async function countServiceEmailEventsForActorSince(params: {
  actorUserId: string;
  sinceIso: string;
  statuses?: ServiceEmailEventStatus[];
}): Promise<number> {
  return countServiceEmailRecords(params, async (supabase, statuses) => {
      const result = await supabase
        .from("service_email_events")
        .select("created_at", { count: "exact", head: true })
        .eq("actor_user_id", params.actorUserId)
        .gte("created_at", params.sinceIso)
        .in("status", statuses);

      if (!result.error) {
        return Number(result.count ?? 0);
      }
      return null;
    }, (records, filterParams) =>
      filterServiceEmailEventsForActorSince(records, filterParams).length,
  );
}

export async function countServiceEmailRecipientsForActorSince(params: {
  actorUserId: string;
  sinceIso: string;
  statuses?: ServiceEmailEventStatus[];
}): Promise<number> {
  return countServiceEmailRecords(params, async (supabase, statuses) => {
      const result = await supabase.rpc("sum_service_email_recipients_for_actor_since", {
        p_actor_user_id: params.actorUserId,
        p_since: params.sinceIso,
        p_statuses: statuses,
      });

      if (!result.error) {
        const recipients = Number(result.data ?? 0);
        return Number.isFinite(recipients) ? recipients : 0;
      }
      return null;
    }, (records, filterParams) =>
      filterServiceEmailEventsForActorSince(records, filterParams)
        .reduce((total, entry) => total + (Number.isFinite(entry.recipientCount) ? entry.recipientCount : 0), 0),
  );
}
