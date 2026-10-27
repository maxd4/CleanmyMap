export const ACCOUNT_PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

export const CLERK_SYNC_PENDING_STATUS =
  "clerk_updated_supabase_sync_pending" as const;

export function buildClerkSyncPendingPayload(error: string) {
  return {
    error,
    status: CLERK_SYNC_PENDING_STATUS,
  };
}
