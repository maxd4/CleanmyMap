import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { escapePostgrestLikePattern } from "./postgrest";

export type ChatUserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ChatSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>
>;

const CHAT_USERS_PAGE_SIZE = 10;
const CHAT_USERS_MAX_SCAN_PAGES = 10;

function normalizeChatUsersQuery(query: string): string {
  return query.trim().slice(0, 120);
}

function buildChatUserQuery(
  supabase: ChatSupabaseClient,
  userId: string,
  offset: number,
) {
  return supabase
    .from("public_profiles")
    .select("id, handle, display_name, avatar_url")
    .neq("id", userId)
    .order("display_name")
    .order("id")
    .range(offset, offset + CHAT_USERS_PAGE_SIZE - 1);
}

async function loadChatUserPage(
  supabase: ChatSupabaseClient,
  userId: string,
  query: string,
  offset: number,
  source: "all" | "handle" | "id" | "display_name",
): Promise<ChatUserRow[]> {
  if (source === "all") {
    const { data, error } = await buildChatUserQuery(supabase, userId, offset);
    if (error) {
      throw error;
    }

    return (data ?? []) as ChatUserRow[];
  }

  const pattern = `%${escapePostgrestLikePattern(query)}%`;
  const queryBuilder = buildChatUserQuery(supabase, userId, offset);
  const result = source === "id"
    ? await queryBuilder.eq("id", query)
    : await queryBuilder.ilike(source, pattern);

  const error = result.error;
  if (error) {
    throw error;
  }

  return (result.data ?? []) as ChatUserRow[];
}

type ChatUserSource = {
  kind: "all" | "handle" | "id" | "display_name";
  offset: number;
  exhausted: boolean;
  matchedIds: Set<string>;
};

function sortChatUsers(users: Iterable<ChatUserRow>): ChatUserRow[] {
  return [...users].sort((left, right) => {
    const leftLabel = left.display_name?.trim() || left.handle?.trim() || "";
    const rightLabel = right.display_name?.trim() || right.handle?.trim() || "";
    return leftLabel.localeCompare(rightLabel, "fr") || left.id.localeCompare(right.id);
  });
}

async function loadVerifiedChatUsers(
  supabase: ChatSupabaseClient,
  userId: string,
  query: string,
): Promise<ChatUserRow[]> {
  const kinds: ChatUserSource["kind"][] = query.length >= 2
    ? ["handle", "id", "display_name"]
    : ["all"];
  const sources: ChatUserSource[] = kinds.map((kind) => ({
    kind,
    offset: 0,
    exhausted: false,
    matchedIds: new Set<string>(),
  }));
  const checkedIds = new Set<string>();
  const verifiedIds = new Set<string>();
  const usersById = new Map<string, ChatUserRow>();

  for (let pageIndex = 0; pageIndex < CHAT_USERS_MAX_SCAN_PAGES; pageIndex += 1) {
    const activeSources = sources.filter((source) =>
      !source.exhausted && source.matchedIds.size < CHAT_USERS_PAGE_SIZE,
    );
    if (activeSources.length === 0) break;

    const pages = await Promise.all(activeSources.map(async (source) => ({
      source,
      rows: await loadChatUserPage(supabase, userId, query, source.offset, source.kind),
    })));
    const pageRows = pages.flatMap(({ rows }) => rows);
    for (const { source, rows } of pages) {
      source.offset += rows.length;
      if (rows.length < CHAT_USERS_PAGE_SIZE) source.exhausted = true;
    }

    const newIds = [...new Set(pageRows.map((user) => user.id).filter((id) => !checkedIds.has(id)))];
    if (newIds.length > 0) {
      const { getVerifiedNonE2EClerkUserIds } = await import("@/lib/auth/e2e-account-server");
      const pageVerifiedIds = await getVerifiedNonE2EClerkUserIds(newIds);
      for (const id of newIds) checkedIds.add(id);
      for (const id of pageVerifiedIds) verifiedIds.add(id);
    }

    for (const { source, rows } of pages) {
      for (const user of rows) {
        if (!verifiedIds.has(user.id)) continue;
        source.matchedIds.add(user.id);
        usersById.set(user.id, user);
      }
    }
  }

  const users = query.length >= 2
    ? sortChatUsers(usersById.values())
    : [...usersById.values()];
  return users.slice(0, CHAT_USERS_PAGE_SIZE);
}

export async function fetchCachedChatUsers(
  userId: string,
  query: string,
  supabaseClient?: ChatSupabaseClient | null,
): Promise<ChatUserRow[]> {
  const normalizedQuery = normalizeChatUsersQuery(query);
  const supabase = supabaseClient ?? (await getSupabaseClerkRlsClient());
  if (!supabase) {
    throw new Error("Connexion sécurisée indisponible");
  }

  return loadVerifiedChatUsers(supabase, userId, normalizedQuery);
}
