import { env } from "@/lib/env";

export function canUseSupabaseServerPersistence(): boolean {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    typeof url === "string" &&
      url.startsWith("https://") &&
      typeof key === "string" &&
      key.length >= 20,
  );
}

export function allowLocalFileStoreFallback(): boolean {
  return env.ALLOW_LOCAL_FILE_STORE_FALLBACK === true;
}

export function allowLocalActionStoreInCurrentRuntime(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return env.ALLOW_LOCAL_ACTION_STORE_IN_PROD === true;
}

export function assertPersistenceAvailable(storeName: string): void {
  if (canUseSupabaseServerPersistence()) {
    return;
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
