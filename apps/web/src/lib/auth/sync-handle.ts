import type { User } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { buildFallbackHandle } from "@/lib/auth/identity-handle";

const MAX_HANDLE_LENGTH = 30;

function normalizeHandleSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.slice(0, MAX_HANDLE_LENGTH);
}

async function isHandleAvailable(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  handle: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (error) throw error;
  return !data || data.id === userId;
}

export async function resolveUniqueHandle(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  user: User,
  existingHandle: string | null,
): Promise<string> {
  const preservedHandle = existingHandle?.trim() ?? "";
  if (preservedHandle.length > 0) return preservedHandle;
  const baseHandleSource = user.username?.trim() || buildFallbackHandle(user.id);
  const baseHandle = normalizeHandleSegment(baseHandleSource) || buildFallbackHandle(user.id);
  if (await isHandleAvailable(supabase, baseHandle, user.id)) return baseHandle;

  const suffixSource = buildFallbackHandle(user.id).slice("user_".length);
  const compactBase = baseHandle.slice(0, Math.max(1, MAX_HANDLE_LENGTH - suffixSource.length - 1));
  const fallbackCandidates = [
    `${compactBase}_${suffixSource}`,
    `${compactBase}_${suffixSource}_1`,
    `${compactBase}_${suffixSource}_2`,
  ]
    .map((candidate) => normalizeHandleSegment(candidate))
    .filter((candidate) => candidate.length > 0);
  for (const candidate of fallbackCandidates) {
    if (await isHandleAvailable(supabase, candidate, user.id)) return candidate;
  }
  return normalizeHandleSegment(`${compactBase}_${user.id.slice(-10)}`);
}
