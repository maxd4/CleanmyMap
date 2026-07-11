export function parseChatRealtimeFlag(raw: string | undefined | null): boolean {
  if (!raw) {
    return false;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isChatRealtimeEnabled(): boolean {
  return parseChatRealtimeFlag(process.env["NEXT_PUBLIC_ENABLE_SUPABASE_CHAT_REALTIME"]);
}
