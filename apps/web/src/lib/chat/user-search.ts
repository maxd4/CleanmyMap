import { unstable_cache } from "next/cache";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { escapePostgrestLikePattern, mergeRowGroupsById } from "./postgrest";

export type ChatUserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ChatSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>
>;

const CHAT_USERS_CACHE_REVALIDATE_SECONDS = 15;

function normalizeChatUsersQuery(query: string): string {
  return query.trim().slice(0, 120);
}

function buildChatUserQuery(
  supabase: ChatSupabaseClient,
  userId: string,
) {
  return supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .neq("id", userId)
    .order("display_name")
    .limit(10);
}

export function buildChatUsersCacheKey(userId: string, query: string): string {
  const normalizedQuery = normalizeChatUsersQuery(query);
  return `user:${userId}|query:${normalizedQuery || "empty"}`;
}

async function loadChatUsers(
  supabase: ChatSupabaseClient,
  userId: string,
  query: string,
): Promise<ChatUserRow[]> {
  if (!query || query.length < 2) {
    const { data, error } = await buildChatUserQuery(supabase, userId);
    if (error) {
      throw error;
    }

    return (data ?? []) as ChatUserRow[];
  }

  const pattern = `%${escapePostgrestLikePattern(query)}%`;
  const [handleResult, displayNameResult] = await Promise.all([
    buildChatUserQuery(supabase, userId).ilike("handle", pattern),
    buildChatUserQuery(supabase, userId).ilike("display_name", pattern),
  ]);

  const error = handleResult.error ?? displayNameResult.error;
  if (error) {
    throw error;
  }

  return mergeRowGroupsById<ChatUserRow>([
    (handleResult.data ?? []) as ChatUserRow[],
    (displayNameResult.data ?? []) as ChatUserRow[],
  ]).sort((left, right) => {
    const leftLabel = left.display_name?.trim() || left.handle?.trim() || "";
    const rightLabel = right.display_name?.trim() || right.handle?.trim() || "";
    return leftLabel.localeCompare(rightLabel, "fr") || left.id.localeCompare(right.id);
  });
}

export async function fetchCachedChatUsers(
  userId: string,
  query: string,
  supabaseClient?: ChatSupabaseClient | null,
): Promise<ChatUserRow[]> {
  const normalizedQuery = normalizeChatUsersQuery(query);
  const cached = unstable_cache(
    async () => {
      const supabase = supabaseClient ?? (await getSupabaseClerkRlsClient());
      if (!supabase) {
        throw new Error("Connexion sécurisée indisponible");
      }

      return loadChatUsers(supabase, userId, normalizedQuery);
    },
    ["chat-users", buildChatUsersCacheKey(userId, normalizedQuery)],
    {
      revalidate: CHAT_USERS_CACHE_REVALIDATE_SECONDS,
      tags: [`chat-users:${userId}`],
    },
  );

  return cached();
}
