import { env } from "@/lib/env";

/**
 * Validates URL has https protocol (CodeQL-safe alternative to startsWith checks)
 * See: documentation/security/regex-security.md
 */
function hasHttpsProtocol(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function canUseSupabaseServerPersistence(): boolean {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    hasHttpsProtocol(url) &&
      typeof key === "string" &&
      key.length >= 20,
  );
}

export function prependBoundedRecord<T>(
  record: T,
  records: readonly T[],
  limit = 2000,
): T[] {
  return [record, ...records].slice(0, limit);
}

export function mapSupabaseRecords<T>(
  data: readonly unknown[] | null | undefined,
  parse: (row: Record<string, unknown>) => T | null,
): T[] {
  return (data ?? [])
    .map((row) => parse(row as Record<string, unknown>))
    .filter((record): record is T => Boolean(record));
}

export async function readSupabaseRecords<T>(
  query: PromiseLike<{
    data: readonly unknown[] | null;
    error: { message: string } | null;
  }>,
  parse: (row: Record<string, unknown>) => T | null,
): Promise<T[]> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return mapSupabaseRecords(result.data, parse);
}

export async function readSupabaseRecord<T>(
  query: PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  parse: (row: Record<string, unknown>) => T | null,
): Promise<T | null> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.data ? parse(result.data as Record<string, unknown>) : null;
}

export async function persistSupabaseRecord<T>(
  query: PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  parse: (row: Record<string, unknown>) => T | null,
  message: string,
): Promise<T> {
  return requirePersistedRecord(await readSupabaseRecord(query, parse), message);
}

export function requirePersistedRecord<T>(record: T | null, message: string): T {
  if (!record) throw new Error(message);
  return record;
}

export function replaceRecordInList<T>(
  records: readonly T[],
  matches: (record: T) => boolean,
  update: (record: T) => T,
): { records: T[]; record: T } | null {
  const index = records.findIndex(matches);
  const current = index >= 0 ? records[index] : undefined;
  if (!current) return null;
  const nextRecords = [...records];
  const record = update(current);
  nextRecords[index] = record;
  return { records: nextRecords, record };
}

export function findRecordInList<T>(
  records: readonly T[],
  matches: (record: T) => boolean,
): T | null {
  return records.find(matches) ?? null;
}

export async function replaceAndPersistRecord<T>(
  records: readonly T[],
  matches: (record: T) => boolean,
  update: (record: T) => T,
  persist: (records: T[]) => Promise<void>,
): Promise<T | null> {
  const replacement = replaceRecordInList(records, matches, update);
  if (!replacement) return null;
  await persist(replacement.records);
  return replacement.record;
}

export function getRecentTimeWindow(periodDays: number): {
  nowMs: number;
  floor: number;
  floorIso: string;
} {
  const nowMs = Date.now();
  const floor = nowMs - periodDays * 24 * 60 * 60 * 1000;
  return { nowMs, floor, floorIso: new Date(floor).toISOString() };
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV?.trim());
}

export function allowLocalFileStoreFallback(): boolean {
  return (
    !isVercelRuntime() &&
    process.env.NODE_ENV !== "production" &&
    env.ALLOW_LOCAL_FILE_STORE_FALLBACK === true
  );
}

export function allowLocalActionStoreInCurrentRuntime(): boolean {
  if (isVercelRuntime()) {
    return false;
  }
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return env.ALLOW_LOCAL_ACTION_STORE_IN_PROD === true;
}

export function assertPersistenceAvailable(storeName: string): void {
  if (canUseSupabaseServerPersistence()) {
    return;
  }
  if (isVercelRuntime()) {
    throw new Error(
      `Persistence unavailable for ${storeName} on Vercel: Supabase server persistence is required; local file fallback is forbidden.`,
    );
  }
  if (allowLocalFileStoreFallback()) {
    console.warn(
      `[PERSISTENCE] Falling back to local file store for "${storeName}". This data will be LOST on serverless environments like Vercel.`,
    );
    return;
  }
  throw new Error(
    `Persistence unavailable for ${storeName}: missing SUPABASE_SERVICE_ROLE_KEY and local fallback disabled.`,
  );
}
